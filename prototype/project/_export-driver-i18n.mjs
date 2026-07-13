/**
 * Export driver-relevant i18n keys for autheon-fe handoff.
 * Run: node _export-driver-i18n.mjs > ../../docs/design/driver-i18n-index.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const i18n = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
const driver = fs.readFileSync(path.join(root, "driver.jsx"), "utf8");

function localeBlock(marker, endMarker) {
  const i = i18n.indexOf(marker);
  const j = i18n.indexOf(endMarker, i + marker.length);
  return i18n.slice(i + marker.length, j);
}

function parseKeys(block) {
  const keys = {};
  const re = /^\s{6}([a-zA-Z_][a-zA-Z0-9_]*):\s*"((?:\\.|[^"\\])*)"/gm;
  let m;
  while ((m = re.exec(block))) keys[m[1]] = m[2];
  return keys;
}

const en = parseKeys(localeBlock("en: {", "de: {"));
const de = parseKeys(localeBlock("de: {", "\n  };"));

const used = new Set();
const tRe = /\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g;
let tm;
while ((tm = tRe.exec(driver))) used.add(tm[1]);

const keys = [...used].filter((k) => !k.includes(".")).sort();

const lines = [
  `# Driver PWA — i18n Key Index`,
  ``,
  `> Auto-generated from \`i18n.js\` + \`driver.jsx\` t() usage.`,
  `> Regenerate: \`node prototype/project/_export-driver-i18n.mjs\``,
  ``,
  `| Key | EN | DE |`,
  `|-----|----|----|`,
];
for (const k of keys) {
  const enVal = (en[k] || "—").replace(/\|/g, "\\|");
  const deVal = (de[k] || "—").replace(/\|/g, "\\|");
  lines.push(`| \`${k}\` | ${enVal} | ${deVal} |`);
}

const outPath = path.join(root, "..", "..", "docs", "design", "driver-i18n-index.md");
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
process.stdout.write(`Wrote ${outPath} (${keys.length} keys)\n`);
