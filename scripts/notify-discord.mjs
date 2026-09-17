// Diffs the demon list file between two git refs and posts a Discord log
// message for every level that was added, moved, or removed.
//
// Env vars used:
//   LIST_FILE            path to the ordered list JSON, e.g. "data/list.json"
//   COMPARE_REF          git ref to diff against, e.g. "HEAD~1"
//   DATA_DIR             folder holding level files, default "data"
//   DISCORD_WEBHOOK_URL  Discord webhook URL (from secrets)

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const LIST_FILE = process.env.LIST_FILE || "data/list.json";
const COMPARE_REF =
  !process.env.COMPARE_REF || process.env.COMPARE_REF === ZERO_SHA
    ? "HEAD~1"
    : process.env.COMPARE_REF;
const DATA_DIR = process.env.DATA_DIR || "data";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function readJsonAtRef(ref, file) {
  try {
    const raw = execFileSync("git", ["show", `${ref}:${file}`], {
      encoding: "utf8",
    });
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Could not read ${file} at ${ref}: ${err.message}`);
    return [];
  }
}

function readJsonNow(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

// LCS-based diff to detect true relative positional shifts
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

  const removed = oldArr.filter((x) => !newSet.has(x));

  const changed = [];
  newArr.forEach((slug, idx) => {
    if (!keepNew.has(idx)) {
      changed.push({
        slug,
        position: idx + 1,
        // In GD: idx - 1 is harder (level sits below it)
        // idx + 1 is easier (level sits above it)
        harder: idx > 0 ? newArr[idx - 1] : null,
        easier: idx < newArr.length - 1 ? newArr[idx + 1] : null,
        type: oldSet.has(slug) ? "moved" : "added",
      });
    }
  });

  return { changed, removed };
}

const nameCache = new Map();
function nameOf(slug) {
  if (nameCache.has(slug)) return nameCache.get(slug);
  const jsonPath = path.join(DATA_DIR, `${slug}.json`);
  let name;
  if (existsSync(jsonPath)) {
    try {
      const data = JSON.parse(readFileSync(jsonPath, "utf8"));
      name = data.name || data.levelName || data.title;
    } catch {}
  }
  if (!name) {
    name = slug
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .trim();
  }
  nameCache.set(slug, name);
  return name;
}

function formatMessage(entry, oldArr = []) {
  const name = nameOf(entry.slug);
  if (entry.type === "removed") {
    return {
      type: "removed",
      rawText: `- **[REMOVED]** **${name}** has been removed from the list`,
      cleanText: `${name} has been removed from the list`
    };
  }

  const parts = [];
  if (entry.easier) parts.push(`above **${nameOf(entry.easier)}**`);
  if (entry.harder) parts.push(`below **${nameOf(entry.harder)}**`);
  const suffix = parts.length ? `, ${parts.join(" and ")}` : "";

  if (entry.type === "added") {
    return {
      type: "placed",
      rawText: `- **[PLACED]** **${name}** has been placed at #${entry.position}${suffix}`,
      cleanText: `${name} was placed at #${entry.position}${suffix.replace(/\*\*/g, '')}`
    };
  }

  if (entry.type === "moved") {
    const oldIdx = oldArr.indexOf(entry.slug);
    const oldPos = oldIdx !== -1 ? oldIdx + 1 : null;
    if (oldPos !== null) {
      if (entry.position < oldPos) {
        return {
          type: "raised",
          rawText: `- **[RAISED]** **${name}** has been raised from #${oldPos} to #${entry.position}${suffix}`,
          cleanText: `${name} was raised from #${oldPos} to #${entry.position}${suffix.replace(/\*\*/g, '')}`
        };
      } else if (entry.position > oldPos) {
        return {
          type: "lowered",
          rawText: `- **[LOWERED]** **${name}** has been lowered from #${oldPos} to #${entry.position}${suffix}`,
          cleanText: `${name} was lowered from #${oldPos} to #${entry.position}${suffix.replace(/\*\*/g, '')}`
        };
      }
    }
    return {
      type: "moved",
      rawText: `- **[MOVED]** **${name}** has been moved to #${entry.position}${suffix}`,
      cleanText: `${name} was moved to #${entry.position}${suffix.replace(/\*\*/g, '')}`
    };
  }

  return {
    type: "placed",
    rawText: `- **[PLACED]** **${name}** has been placed at #${entry.position}${suffix}`,
    cleanText: `${name} was placed at #${entry.position}${suffix.replace(/\*\*/g, '')}`
  };
}

async function postToDiscord(messages) {
  if (!WEBHOOK_URL) {
    console.warn("DISCORD_WEBHOOK_URL not set — skipping Discord message.");
    return;
  }
  if (messages.length === 0) {
    console.log("No changes detected — nothing to post.");
    return;
  }

  const lines = messages.map(m => m.rawText);
  const chunks = [];
  let current = "";
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > 1900) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);

  for (const content of chunks) {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Discord webhook failed (${res.status}): ${body}`);
    }
  }
}

function updateActivityJson(formattedEntries) {
  const actPath = path.join(DATA_DIR, "activity.json");
  if (!existsSync(actPath)) return;
  try {
    const current = JSON.parse(readFileSync(actPath, "utf8"));
    const newItems = formattedEntries.map(e => ({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      message: e.cleanText,
      date: new Date().toISOString()
    }));
    const merged = [...newItems, ...current].slice(0, 50);
    writeFileSync(actPath, JSON.stringify(merged, null, 2), "utf8");
    console.log(`Updated activity.json with ${newItems.length} new entries.`);
  } catch (err) {
    console.warn("Could not sync activity.json:", err.message);
  }
}

async function main() {
  const oldArr = readJsonAtRef(COMPARE_REF, LIST_FILE);
  const newArr = readJsonNow(LIST_FILE);

  const { changed, removed } = diffList(oldArr, newArr);

  const formatted = [
    ...changed
      .sort((a, b) => a.position - b.position)
      .map((entry) => formatMessage(entry, oldArr)),
    ...removed.map((slug) => formatMessage({ slug, type: "removed" }, oldArr)),
  ];

  formatted.forEach((l) => console.log(l.rawText));

  if (formatted.length > 0) {
    updateActivityJson(formatted);
    await postToDiscord(formatted);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});