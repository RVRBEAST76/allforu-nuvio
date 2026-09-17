/* Local test harness. Run: node test.js
 * Verifies the crypto, title resolution, and (if reachable) the MovieBox API.
 */
const mb = require("./providers/moviebox.js");

(async () => {
  // 1. MD5 known vector
  const crypto = require("crypto");
  const fs = require("fs");
  let code = fs.readFileSync("./providers/moviebox.js", "utf8");
  code += "\nmodule.exports.__t = { md5Hex, mboxXTrSignature, mboxHeaders, resolveTitle, mboxToken, mboxSearch, MBOX_KEY };";
  fs.writeFileSync("/tmp/mbtest.js", code);
  const t = require("/tmp/mbtest.js").__t;

  console.log("MD5(abc):", t.md5Hex("abc"), t.md5Hex("abc") === "900150983cd24fb0d6963f7d28e17f72" ? "OK" : "FAIL");
  console.log("key bytes:", t.MBOX_KEY.length, t.MBOX_KEY.length === 30 ? "OK" : "FAIL");

  // 2. signature format
  const ep = "https://api3.aoneroom.com/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1";
  console.log("signature:", t.mboxXTrSignature("GET", "application/json", "application/json", ep, null).slice(0, 30) + "...");

  // 3. title resolution (Cinemeta should work)
  for (const [id, type] of [["tt1375666", "movie"], ["tt0903747", "tv"]]) {
    const meta = await t.resolveTitle(id, type).catch((e) => ({ title: "ERR " + e.message }));
    console.log("title", id, type, "=>", meta.title, meta.year || "");
  }

  // 4. full provider call
  console.log("\n=== getStreams(tt1375666, movie) ===");
  const r = await mb.getStreams("tt1375666", "movie", 1, 1);
  r.forEach((s) => console.log(" ", s.name, "|", s.quality, "|", String(s.url).slice(0, 70)));
})().catch((e) => console.log("TEST ERR:", e.message));