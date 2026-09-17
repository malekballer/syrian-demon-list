import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = "data";
const LIST_FILE = "data/list.json";
const ACTIVITY_FILE = "data/activity.json";

// 1. Build a local cache of slug -> { name, id }
const levelMetadata = new Map();
if (existsSync(DATA_DIR)) {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith(".json") && f !== "list.json" && f !== "activity.json" && f !== "editors.json" && f !== "aredl.json");
  for (const f of files) {
    const slug = f.replace(".json", "");
    try {
      const data = JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf8"));
      levelMetadata.set(slug, {
        name: data.name || slug,
        id: data.id ? data.id.toString() : slug
      });
    } catch {}
  }
}

function getLevelMeta(slug) {
  if (levelMetadata.has(slug)) return levelMetadata.get(slug);
  const pretty = slug.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  return { name: pretty, id: slug };
}

// LCS-based list diffing
function lcsKeepIndices(oldArr, newArr) {
  const n = oldArr.length, m = newArr.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldArr[i - 1] === newArr[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const keepNew = new Set();
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (oldArr[i - 1] === newArr[j - 1]) {
      keepNew.add(j - 1);
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return keepNew;
}

function diffList(oldArr, newArr) {
  const oldSet = new Set(oldArr);
  const newSet = new Set(newArr);
  const keepNew = lcsKeepIndices(oldArr, newArr);

  const removed = oldArr.filter(x => !newSet.has(x));
  const changed = [];

  newArr.forEach((slug, idx) => {
    if (!keepNew.has(idx)) {
      changed.push({
        slug,
        position: idx + 1,
        harder: idx > 0 ? newArr[idx - 1] : null,
        easier: idx < newArr.length - 1 ? newArr[idx + 1] : null,
        type: oldSet.has(slug) ? "moved" : "added"
      });
    }
  });

  return { changed, removed };
}

async function run() {
  console.log("Analyzing git history of data/list.json...");

  // Get commits that touched data/list.json (up to 150 commits)
  let commitLogs = [];
  try {
    const raw = execSync('git log -n 150 --pretty=format:"%H|%cd" --date=iso data/list.json', { encoding: "utf8" });
    commitLogs = raw.trim().split("\n").filter(Boolean);
  } catch (err) {
    console.error("Failed to read git log:", err.message);
    return;
  }

  const allEvents = [];

  for (let i = 0; i < commitLogs.length - 1; i++) {
    const [currentHash, currentDate] = commitLogs[i].split("|");
    const [parentHash] = commitLogs[i + 1].split("|");

    let currentList = [];
    let parentList = [];

    try {
      currentList = JSON.parse(execSync(`git show ${currentHash}:${LIST_FILE}`, { encoding: "utf8" }));
      parentList = JSON.parse(execSync(`git show ${parentHash}:${LIST_FILE}`, { encoding: "utf8" }));
    } catch {
      continue;
    }

    if (!Array.isArray(currentList) || !Array.isArray(parentList)) continue;

    const { changed, removed } = diffList(parentList, currentList);

    for (const item of changed) {
      const meta = getLevelMeta(item.slug);
      const easierMeta = item.easier ? getLevelMeta(item.easier) : null;
      const harderMeta = item.harder ? getLevelMeta(item.harder) : null;

      let eventType = "placed";
      let oldPos = null;

      if (item.type === "moved") {
        const oldIdx = parentList.indexOf(item.slug);
        if (oldIdx !== -1) {
          oldPos = oldIdx + 1;
          eventType = item.position < oldPos ? "raised" : "lowered";
        }
      }

      allEvents.push({
        id: `${currentHash.substring(0, 7)}_${item.slug}`,
        type: eventType,
        levelName: meta.name,
        levelId: meta.id,
        position: item.position,
        oldPosition: oldPos,
        easier: easierMeta ? easierMeta.name : null,
        easierId: easierMeta ? easierMeta.id : null,
        harder: harderMeta ? harderMeta.name : null,
        harderId: harderMeta ? harderMeta.id : null,
        date: currentDate
      });
    }

    for (const slug of removed) {
      const meta = getLevelMeta(slug);
      allEvents.push({
        id: `${currentHash.substring(0, 7)}_rem_${slug}`,
        type: "removed",
        levelName: meta.name,
        levelId: meta.id,
        position: null,
        date: currentDate
      });
    }
  }

  // Deduplicate by signature
  const seen = new Set();
  const finalEvents = [];
  for (const ev of allEvents) {
    const sig = `${ev.type}_${ev.levelName}_${ev.position}_${ev.date.substring(0, 10)}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      finalEvents.push(ev);
    }
  }

  // If git history was short, backfill recent list placements
  if (finalEvents.length < 15 && existsSync(LIST_FILE)) {
    const list = JSON.parse(readFileSync(LIST_FILE, "utf8"));
    const fallbackDate = new Date().toISOString();
    list.slice(0, 35).forEach((slug, idx) => {
      const meta = getLevelMeta(slug);
      const easierSlug = idx < list.length - 1 ? list[idx + 1] : null;
      const harderSlug = idx > 0 ? list[idx - 1] : null;
      const sig = `placed_${meta.name}_${idx + 1}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        finalEvents.push({
          id: `seed_${slug}`,
          type: "placed",
          levelName: meta.name,
          levelId: meta.id,
          position: idx + 1,
          easier: easierSlug ? getLevelMeta(easierSlug).name : null,
          easierId: easierSlug ? getLevelMeta(easierSlug).id : null,
          harder: harderSlug ? getLevelMeta(harderSlug).name : null,
          harderId: harderSlug ? getLevelMeta(harderSlug).id : null,
          date: fallbackDate
        });
      }
    });
  }

  finalEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  const output = finalEvents.slice(0, 100);

  writeFileSync(ACTIVITY_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`Successfully generated ${output.length} ranking events into ${ACTIVITY_FILE}!`);
}

run();