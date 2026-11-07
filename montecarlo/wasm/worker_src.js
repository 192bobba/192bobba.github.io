// Worker : exécute le moteur de calcul (Go compilé en WebAssembly) hors du
// fil principal, pour que la page ne gèle pas pendant le téléchargement ou
// la simulation. Les cours sont récupérés par la page. wasm_exec.js (fourni par Go) est placé juste avant ce code
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
      case 'yahooText': {
        const chk = JSON.parse(self.mcCheck(args.ticker, args.years));
        out = chk.error ? chk : JSON.parse(self.mcLoadYahoo(args.text, chk.ticker, chk.years, 200, args.source || ''));
        break;
      }
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
