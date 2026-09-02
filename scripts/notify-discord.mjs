// Diffs the demon list file between two git refs and posts a Discord log
// message for every level that was added, moved, or removed.
//
// Env vars used:
//   LIST_FILE            path to the ordered list JSON, e.g. "data/_list.json"
//   COMPARE_REF           git ref to diff against, e.g. "HEAD~1"
//   DATA_DIR              folder holding one JSON file per level (optional), default "data"
//   DISCORD_WEBHOOK_URL   Discord webhook URL (from secrets)

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const LIST_FILE = process.env.LIST_FILE || "data/list.json";
const COMPARE_REF =
  !process.env.COMPARE_REF || process.env.COMPARE_REF === ZERO_SHA
    ? "HEAD~1"
    : process.env.COMPARE_REF;
const DATA_DIR = process.env.DATA_DIR || "data";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error("DISCORD_WEBHOOK_URL is not set.");
  process.exit(1);
}

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

// ---- diff (LCS-based: only flags entries whose relative order actually changed) ----

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
        above: idx > 0 ? newArr[idx - 1] : null,
        below: idx < newArr.length - 1 ? newArr[idx + 1] : null,
        type: oldSet.has(slug) ? "moved" : "added",
      });
    }
  });

  return { changed, removed };
}

// ---- display names ----

// Falls back to splitting CamelCase slugs into words, e.g. "HatefulReflection"
// -> "Hateful Reflection". Prefers a `name` field from DATA_DIR/<slug>.json
// if that file exists, so this stays correct even if slugs and display
// names diverge.
const nameCache = new Map();
function nameOf(slug) {
  if (nameCache.has(slug)) return nameCache.get(slug);
  const jsonPath = path.join(DATA_DIR, `${slug}.json`);
  let name;
  if (existsSync(jsonPath)) {
    try {
      const data = JSON.parse(readFileSync(jsonPath, "utf8"));
      name = data.name || data.levelName || data.title;
    } catch {
      // ignore parse errors, fall back below
    }
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

function formatMessage(entry) {
  const name = nameOf(entry.slug);
  if (entry.type === "removed") {
    return `- **${name}** has been removed from the list`;
  }
  const parts = [];
  if (entry.above) parts.push(`above **${nameOf(entry.above)}**`);
  if (entry.below) parts.push(`below **${nameOf(entry.below)}**`);
  const suffix = parts.length ? `, ${parts.join(" and ")}` : "";
  return `- **${name}** has been placed at #${entry.position}${suffix}`;
}

// ---- Discord ----

async function postToDiscord(lines) {
  if (lines.length === 0) {
    console.log("No changes detected — nothing to post.");
    return;
  }

  // Batch lines into chunks under Discord's 2000-char message limit.
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

async function main() {
  const oldArr = readJsonAtRef(COMPARE_REF, LIST_FILE);
  const newArr = readJsonNow(LIST_FILE);

  const { changed, removed } = diffList(oldArr, newArr);

  const lines = [
    ...changed
      .sort((a, b) => a.position - b.position)
      .map(formatMessage),
    ...removed.map((slug) => formatMessage({ slug, type: "removed" })),
  ];

  lines.forEach((l) => console.log(l));
  await postToDiscord(lines);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
