const fs = require("fs");
const vm = require("vm");
const code = fs.readFileSync("i18n.js", "utf8");
const ctx = {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { documentElement: { setAttribute: () => {}, lang: "" } },
  navigator: { language: "en-US" },
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const M = ctx.window.I18n.MESSAGES;

function flatten(obj, p = "", out = {}) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = p ? `${p}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const enFlat = flatten(M.en);
const deFlat = flatten(M.de);
const enKeys = Object.keys(enFlat).sort();
const deKeys = Object.keys(deFlat).sort();
const missingInDe = enKeys.filter((k) => !(k in deFlat));
const missingInEn = deKeys.filter((k) => !(k in enFlat));

const out = [];
out.push(
  `EN leaf keys: ${enKeys.length} DE leaf keys: ${deKeys.length}`,
  `Missing in DE: ${missingInDe.length}`,
);
if (missingInDe.length) out.push(missingInDe.join("\n"));
out.push(`Extra in DE (not in EN): ${missingInEn.length}`);
if (missingInEn.length) out.push(missingInEn.join("\n"));
process.stdout.write(`${out.join("\n")}\n`);
