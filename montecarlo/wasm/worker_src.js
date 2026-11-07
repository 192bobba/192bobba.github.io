// Worker : exécute le moteur de calcul (Go compilé en WebAssembly) hors du
// fil principal, pour que la page ne gèle pas pendant le téléchargement ou
// la simulation. wasm_exec.js (fourni par Go) est placé juste avant ce code
// dans worker.js. La page transmet le module mc.wasm (message « init »),
// ce qui permet de le garder en cache pour l'usage hors ligne.

let markReady;
const ready = new Promise((r) => { markReady = r; });
self.mcReady = () => markReady();

async function start(bytes) {
  const go = new Go();
  const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
  go.run(instance);
}

async function fetchText(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
    return { status: r.status, text: await r.text() };
  } finally {
    clearTimeout(timer);
  }
}

// Yahoo Finance n'autorise pas les requêtes directes depuis une page web
// (CORS) : on essaie d'abord en direct, puis via des relais publics.
function routes(urls) {
  const [u1, u2] = urls;
  const e1 = encodeURIComponent(u1);
  const e2 = encodeURIComponent(u2);
  return [
    { name: 'Yahoo (query1)', url: u1 },
    { name: 'Yahoo (query2)', url: u2 },
    { name: 'corsproxy.io', url: 'https://corsproxy.io/?url=' + e1 },
    { name: 'allorigins.win', url: 'https://api.allorigins.win/raw?url=' + e1 },
    { name: 'codetabs.com', url: 'https://api.codetabs.com/v1/proxy/?quest=' + e2 },
    { name: 'corsproxy.io (query2)', url: 'https://corsproxy.io/?url=' + e2 },
  ];
}

async function loadYahoo(args) {
  const chk = JSON.parse(self.mcCheck(args.ticker, args.years));
  if (chk.error) return chk;
  const tried = [];
  for (const r of routes(chk.urls)) {
    postMessage({ type: 'status', text: 'Chargement... (' + chk.ticker + ' via ' + r.name + ')' });
    try {
      const { status, text } = await fetchText(r.url, 15000);
      if (text.indexOf('"chart"') >= 0) {
        const out = JSON.parse(self.mcLoadYahoo(text, chk.ticker, chk.years, status));
        if (!out.error || out.final) {
          out.ticker = chk.ticker;
          return out;
        }
        tried.push(r.name + ' : ' + out.error);
      } else {
        tried.push(r.name + ' : réponse inattendue (code ' + status + ')');
      }
    } catch (e) {
      tried.push(r.name + ' : ' + (e && e.name === 'AbortError' ? 'délai dépassé' : 'accès refusé ou pas de connexion'));
    }
  }
  return {
    error: "Impossible de joindre Yahoo Finance depuis ce navigateur (pas de connexion Internet, " +
      "ou Yahoo et les relais publics ne répondent pas).\n\nDétail :\n- " + tried.join('\n- ') +
      '\n\n' + self.mcCSVHint,
  };
}

onmessage = async (e) => {
  if (e.data && e.data.type === 'init') {
    start(e.data.wasm).catch((err) => postMessage({ type: 'fatal', error: String(err) }));
    return;
  }
  const { id, cmd, args } = e.data;
  let out;
  try {
    await ready;
    switch (cmd) {
      case 'yahoo': out = await loadYahoo(args); break;
      case 'csv': out = JSON.parse(self.mcLoadCSV(args.text, args.name, args.years)); break;
      case 'sim': out = JSON.parse(self.mcSimulate(JSON.stringify(args))); break;
      case 'charts': out = JSON.parse(self.mcCharts(args.width, args.height)); break;
      case 'report': out = JSON.parse(self.mcReport()); break;
      default: out = { error: 'Commande inconnue : ' + cmd };
    }
  } catch (err) {
    out = { error: 'Erreur inattendue : ' + (err && err.message ? err.message : String(err)) };
  }
  postMessage({ type: 'result', id, out });
};
