#!/usr/bin/env node
/* Bundles src/<provider>/index.js with the shared _md5.js into providers/<provider>.js
 * (Nuvio loads one self-contained JS file per scraper).
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "src");
const out = path.join(__dirname, "providers");
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

function read(p) { return fs.readFileSync(p, "utf8"); }
function stripExports(code) {
  return code.replace(/if \(typeof module[\s\S]*?\n}\n?/g, "");
}

const md5 = stripExports(read(path.join(src, "_md5.js")));

const providers = fs.readdirSync(src, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let built = 0;
for (const name of providers) {
  const entry = path.join(src, name, "index.js");
  if (!fs.existsSync(entry)) continue;
  const provider = read(entry);
  const bundle = [
    "/** AllForU " + name + " provider for Nuvio — built " + new Date().toISOString() + " */",
    '"use strict";',
    md5,
    provider,
  ].join("\n\n");
  const dest = path.join(out, name + ".js");
  fs.writeFileSync(dest, bundle);
  console.log("built providers/" + name + ".js (" + (fs.statSync(dest).size / 1024).toFixed(1) + " KB)");
  built++;
}
console.log("done: " + built + " provider(s)");