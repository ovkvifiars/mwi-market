import fs from "node:fs";
import path from "node:path";

const SOURCE_URL = "https://www.milkywayidle.com/game_data/marketplace.json";
const API_FILE = path.resolve("data/market/api.json");
const HISTORY_FILE = path.resolve("data/market/history-db.json");
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 90);
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 3600;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function toIntOr(defaultValue, v) {
  return Number.isFinite(v) ? Math.trunc(v) : defaultValue;
}

async function main() {
  const nowSec = Math.floor(Date.now() / 1000);
  const hourTs = Math.floor(nowSec / 3600) * 3600;

  const res = await fetch(SOURCE_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  const marketData = raw?.marketData || {};

  const apiData = {
    timestamp: nowSec,
    sourceTimestamp: hourTs,
    marketData,
  };

  const historyDb = loadJson(HISTORY_FILE, {
    version: 2,
    source: SOURCE_URL,
    updatedAt: 0,
    retentionDays: RETENTION_DAYS,
    pointFormat: "[time,ask,bid,p,v]",
    items: {},
  });

  const cutoff = nowSec - RETENTION_SECONDS;

  for (const [itemHrid, levelMap] of Object.entries(marketData)) {
    for (const [level, priceObj] of Object.entries(levelMap || {})) {
      const key = `${itemHrid}:${level}`;
      const ask = toIntOr(-1, priceObj?.a);
      const bid = toIntOr(-1, priceObj?.b);
      const avgPrice = toIntOr(-1, priceObj?.p);
      const volume = toIntOr(-1, priceObj?.v);

      if (!historyDb.items[key]) historyDb.items[key] = [];
      const series = historyDb.items[key];
      const last = series.length > 0 ? series[series.length - 1] : null;
      if (last && Array.isArray(last) && last.length < 5) {
        // Backward compatibility: old rows were [t,a,b]
        last[3] = -1;
        last[4] = -1;
      }

      if (last && last[0] === hourTs) {
        last[1] = ask;
        last[2] = bid;
        last[3] = avgPrice;
        last[4] = volume;
      } else if (
        !last ||
        last[1] !== ask ||
        last[2] !== bid ||
        (last[3] ?? -1) !== avgPrice ||
        (last[4] ?? -1) !== volume
      ) {
        series.push([hourTs, ask, bid, avgPrice, volume]);
      }

      let i = 0;
      while (i < series.length && series[i][0] < cutoff) i += 1;
      if (i > 0) {
        historyDb.items[key] = series.slice(i);
      }
    }
  }

  historyDb.version = 2;
  historyDb.updatedAt = nowSec;
  historyDb.retentionDays = RETENTION_DAYS;
  historyDb.pointFormat = "[time,ask,bid,p,v]";

  ensureDir(API_FILE);
  ensureDir(HISTORY_FILE);
  fs.writeFileSync(API_FILE, JSON.stringify(apiData));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyDb));

  console.log(
    `Saved api.json + history-db.json at ${new Date(nowSec * 1000).toISOString()}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
