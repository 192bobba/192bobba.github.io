#!/usr/bin/env python3
"""Copie l'historique journalier Yahoo Finance pour l'application Monte Carlo
(les navigateurs ne peuvent pas interroger Yahoo directement).

  cours_yahoo.py --out DOSSIER [TICKERS]  télécharge les TICKERS (ou, sans
                                          argument, tous ceux de tickers.txt)
                                          dans DOSSIER, avec un bilan result.json ;
  cours_yahoo.py --merge DOSSIER          range ces fichiers dans
                                          montecarlo-web/data/ et refait l'index.

Utilisé par .github/workflows/cours-yahoo.yml (chaque soir de semaine, et à
la demande de l'application pour un nouveau ticker).
"""
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "montecarlo-web", "data")
LIST = os.path.join(DATA, "tickers.txt")
UNKNOWN = os.path.join(DATA, "inconnus.txt")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
YEARS = 40
VALID = re.compile(r"^[A-Z0-9.^=\-_&]{1,24}$")


def file_name(ticker):
    """Nom de fichier sans caractères spéciaux (même règle que l'application)."""
    t = ticker.replace("^", "INDEX_").replace("=", "_EQ_")
    return re.sub(r"[^A-Za-z0-9.\-]", "_", t) + ".json"


def normalize(t):
    return re.sub(r"\s+", "", t).upper()


def read_lines(path):
    out = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                t = normalize(line.split("#", 1)[0])
                if t and t not in out:
                    out.append(t)
    return out


def fetch(ticker):
    """Renvoie (code HTTP, JSON) ; essaie query1 puis query2."""
    p2 = int(time.time())
    p1 = p2 - int(YEARS * 365.25 * 86400) - 7 * 86400
    last = None
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        url = (f"https://{host}/v8/finance/chart/{urllib.parse.quote(ticker, safe='')}"
               f"?period1={p1}&period2={p2}&interval=1d&includeAdjustedClose=true")
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=40) as r:
                    return r.status, json.load(r)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    try:
                        return 404, json.load(e)
                    except ValueError:
                        return 404, None
                last = f"HTTP {e.code}"
            except (urllib.error.URLError, TimeoutError, ValueError) as e:
                last = str(e)
            time.sleep(2 + 3 * attempt)
    raise RuntimeError(last)


def sig(x):
    """Arrondit à 6 chiffres significatifs (fichiers plus petits)."""
    return None if x is None else float(f"{x:.6g}")


def compact(d):
    """Garde uniquement ce dont l'application a besoin, au format Yahoo."""
    r = d["chart"]["result"][0]
    meta = {k: r["meta"].get(k) for k in ("currency", "symbol", "longName", "shortName", "fullExchangeName",
                                           "instrumentType", "regularMarketPrice", "regularMarketTime")
            if r["meta"].get(k) is not None}
    ind = r.get("indicators", {})
    close = (ind.get("quote") or [{}])[0].get("close") or []
    adj = (ind.get("adjclose") or [{}])[0].get("adjclose") or close
    return {"chart": {"result": [{
        "meta": meta,
        "timestamp": r.get("timestamp") or [],
        "indicators": {"quote": [{"close": [sig(x) for x in close]}],
                       "adjclose": [{"adjclose": [sig(x) for x in adj]}]},
    }], "error": None}}


def download(out, args):
    os.makedirs(out, exist_ok=True)
    wanted = [normalize(t) for t in re.split(r"[,;\s]+", " ".join(args)) if t.strip()]
    tickers = wanted or read_lines(LIST)
    result = {"ok": [], "unknown": [], "failed": [], "requested": wanted}
    for t in tickers:
        if not VALID.match(t):
            print(f"::error::{t} : ticker invalide")
            result["unknown"].append(t)
            continue
        try:
            status, d = fetch(t)
        except RuntimeError as e:
            print(f"::warning::{t} : Yahoo ne répond pas ({e})")
            result["failed"].append(t)
            continue
        res = (d or {}).get("chart", {}).get("result")
        if status == 404 or not res or not res[0].get("timestamp"):
            print(f"::error::{t} : ticker inconnu sur Yahoo Finance")
            result["unknown"].append(t)
            continue
        c = compact(d)
        with open(os.path.join(out, file_name(t)), "w", encoding="utf-8") as f:
            json.dump(c, f, separators=(",", ":"), ensure_ascii=False)
        m = c["chart"]["result"][0]["meta"]
        print(f"{t} : {m.get('longName') or m.get('shortName')} ({m.get('currency')}), "
              f"{len(c['chart']['result'][0]['timestamp'])} cours")
        result["ok"].append(t)
        time.sleep(0.7)
    with open(os.path.join(out, "result.json"), "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(f"{len(result['ok'])} copiés, {len(result['unknown'])} inconnus, {len(result['failed'])} en échec")
    # Échec seulement si rien n'a pu être téléchargé alors que Yahoo devait répondre.
    if not result["ok"] and result["failed"]:
        sys.exit(1)


def merge(out):
    """Range les fichiers téléchargés et refait l'index (sur un dépôt à jour)."""
    with open(os.path.join(out, "result.json"), encoding="utf-8") as f:
        result = json.load(f)
    os.makedirs(DATA, exist_ok=True)
    for t in result["ok"]:
        shutil.copyfile(os.path.join(out, file_name(t)), os.path.join(DATA, file_name(t)))
    tickers = read_lines(LIST)
    for t in result["ok"]:
        if t not in tickers:
            tickers.append(t)
    unknown = [t for t in read_lines(UNKNOWN) if t not in result["ok"]]
    for t in result["unknown"]:
        if t not in unknown and t not in tickers:
            unknown.append(t)
    unknown = unknown[-200:]
    with open(LIST, "w", encoding="utf-8") as f:
        f.write("# Tickers copiés chaque soir depuis Yahoo Finance pour l'application Monte Carlo.\n")
        f.write("# Un ticker par ligne. L'application ajoute elle-même les nouveaux tickers demandés.\n")
        f.write("\n".join(tickers) + "\n")
    with open(UNKNOWN, "w", encoding="utf-8") as f:
        f.write("# Tickers demandés mais inconnus sur Yahoo Finance.\n" + "\n".join(unknown) + "\n")
    index = []
    for t in tickers:
        p = os.path.join(DATA, file_name(t))
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8") as f:
            m = json.load(f)["chart"]["result"][0]["meta"]
        index.append({"ticker": t, "file": file_name(t), "name": m.get("longName") or m.get("shortName") or t,
                      "currency": m.get("currency", ""), "type": m.get("instrumentType", "")})
    with open(os.path.join(DATA, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"updated": int(time.time()), "tickers": index, "unknown": unknown}, f,
                  ensure_ascii=False, indent=0)
    print(f"index : {len(index)} tickers, {len(unknown)} inconnus")


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--out":
        download(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) == 3 and sys.argv[1] == "--merge":
        merge(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
