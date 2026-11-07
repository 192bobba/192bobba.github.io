#!/usr/bin/env python3
"""Télécharge l'historique journalier Yahoo Finance des tickers de
montecarlo-web/data/tickers.txt et l'enregistre dans montecarlo-web/data/,
pour que l'application iPad puisse le lire sur le site (les navigateurs ne
peuvent pas interroger Yahoo directement).

Usage : python3 cours_yahoo.py ["TICKER1, TICKER2"]   (tickers à ajouter)
Lancé chaque soir de semaine et à la demande par .github/workflows/cours-yahoo.yml.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "montecarlo-web", "data")
LIST = os.path.join(DATA, "tickers.txt")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
YEARS = 40


def file_name(ticker):
    """Nom de fichier sans caractères spéciaux (même règle que l'application)."""
    t = ticker.replace("^", "INDEX_").replace("=", "_EQ_")
    return re.sub(r"[^A-Za-z0-9.\-]", "_", t) + ".json"


def normalize(t):
    return re.sub(r"\s+", "", t).upper()


def read_list():
    out = []
    if os.path.exists(LIST):
        with open(LIST, encoding="utf-8") as f:
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
                                           "regularMarketPrice", "regularMarketTime") if r["meta"].get(k) is not None}
    ind = r.get("indicators", {})
    close = (ind.get("quote") or [{}])[0].get("close") or []
    adj = (ind.get("adjclose") or [{}])[0].get("adjclose") or close
    return {"chart": {"result": [{
        "meta": meta,
        "timestamp": r.get("timestamp") or [],
        "indicators": {"quote": [{"close": [sig(x) for x in close]}],
                       "adjclose": [{"adjclose": [sig(x) for x in adj]}]},
    }], "error": None}}


def main():
    os.makedirs(DATA, exist_ok=True)
    tickers = read_list()
    new = [normalize(t) for t in re.split(r"[,;\s]+", " ".join(sys.argv[1:])) if t.strip()]
    for t in new:
        if t not in tickers:
            tickers.append(t)
    index, missing, failed = [], [], []
    for t in tickers:
        try:
            status, d = fetch(t)
        except RuntimeError as e:
            print(f"::warning::{t} : Yahoo ne répond pas ({e})")
            failed.append(t)
            # On garde l'ancienne copie si elle existe.
            old = os.path.join(DATA, file_name(t))
            if os.path.exists(old):
                index.append(json.load(open(old, encoding="utf-8"))["chart"]["result"][0]["meta"] | {"ticker": t, "file": file_name(t)})
            continue
        res = (d or {}).get("chart", {}).get("result")
        if status == 404 or not res or not res[0].get("timestamp"):
            print(f"::error::{t} : ticker inconnu sur Yahoo Finance")
            missing.append(t)
            continue
        c = compact(d)
        with open(os.path.join(DATA, file_name(t)), "w", encoding="utf-8") as f:
            json.dump(c, f, separators=(",", ":"), ensure_ascii=False)
        m = c["chart"]["result"][0]["meta"]
        n = len(c["chart"]["result"][0]["timestamp"])
        print(f"{t} : {m.get('longName') or m.get('shortName')} ({m.get('currency')}), {n} cours")
        index.append(m | {"ticker": t, "file": file_name(t)})
        time.sleep(1)
    keep = [t for t in tickers if t not in missing]
    with open(LIST, "w", encoding="utf-8") as f:
        f.write("# Tickers copiés chaque soir depuis Yahoo Finance pour l'application Monte Carlo.\n")
        f.write("# Un ticker par ligne (ex. AMD, NESN.SW). Ajout possible depuis GitHub : Actions > Cours Yahoo > Run workflow.\n")
        f.write("\n".join(keep) + "\n")
    with open(os.path.join(DATA, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"updated": int(time.time()), "tickers": [
            {"ticker": e["ticker"], "file": e["file"], "name": e.get("longName") or e.get("shortName") or e["ticker"],
             "currency": e.get("currency", "")} for e in index],
            "unknown": missing}, f, ensure_ascii=False, indent=0)
    print(f"{len(index)} tickers à jour, {len(missing)} inconnus, {len(failed)} en échec")
    if not index:
        sys.exit(1)


if __name__ == "__main__":
    main()
