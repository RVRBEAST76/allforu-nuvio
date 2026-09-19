/** AllForU moviebox provider for Nuvio — built 2026-09-19T05:43:08.493Z */

"use strict";

/* Pure-JS MD5 + HMAC-MD5. No Node/external deps so it runs in the Nuvio
 * React Native sandbox. Verified: md5Hex("abc") = 900150983cd24fb0d6963f7d28e17f72
 */

function toRawUtf8(str) {
  try { return unescape(encodeURIComponent(str)); } catch (e) { return String(str); }
}

function md5Bytes(input) {
  function rrl(v, s) { return (v << s) | (v >>> (32 - s)); }
  var msg;
  if (typeof input === "string") {
    var enc = toRawUtf8(input);
    msg = [];
    for (var i = 0; i < enc.length; i++) msg.push(enc.charCodeAt(i) & 0xff);
  } else {
    msg = Array.prototype.slice.call(input);
  }
  var origLen = msg.length;
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  var bitLen = origLen * 8;
  for (var b = 0; b < 8; b++) msg.push((bitLen / Math.pow(2, 8 * b)) & 0xff);
  var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  var S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
           5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
           4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
           6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  var K = [];
  for (var k = 0; k < 64; k++) K[k] = Math.floor(Math.abs(Math.sin(k + 1)) * 4294967296) >>> 0;
  for (var off = 0; off < msg.length; off += 64) {
    var M = [];
    for (var j = 0; j < 16; j++) {
      M[j] = (msg[off + j*4] | (msg[off + j*4+1] << 8) |
              (msg[off + j*4+2] << 16) | (msg[off + j*4+3] << 24)) >>> 0;
    }
    var A = a0, B = b0, C = c0, D = d0;
    for (var n = 0; n < 64; n++) {
      var F, g;
      if (n < 16) { F = (B & C) | (~B & D); g = n; }
      else if (n < 32) { F = (D & B) | (~D & C); g = (5*n+1) % 16; }
      else if (n < 48) { F = B ^ C ^ D; g = (3*n+5) % 16; }
      else { F = C ^ (B | ~D); g = (7*n) % 16; }
      F = (F + A + K[n] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rrl(F, S[n])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  var out = [];
  [a0, b0, c0, d0].forEach(function (w) {
    for (var x = 0; x < 4; x++) out.push((w >>> (8 * x)) & 0xff);
  });
  return out;
}

function md5Hex(input) {
  return md5Bytes(input).map(function (b) {
    return (b < 16 ? "0" : "") + b.toString(16);
  }).join("");
}

function strToBytes(s) {
  var out = [];
  for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
  return out;
}

function hmacMd5(keyBytes, msgBytes) {
  var block = 64;
  var key = Array.prototype.slice.call(keyBytes);
  if (key.length > block) key = md5Bytes(key);
  while (key.length < block) key.push(0);
  var oPad = key.map(function (b) { return b ^ 0x5c; });
  var iPad = key.map(function (b) { return b ^ 0x36; });
  var inner = md5Bytes(iPad.concat(Array.prototype.slice.call(msgBytes)));
  return md5Bytes(oPad.concat(inner));
}

function b64encode(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(s);
  if (typeof Buffer !== "undefined") return Buffer.from(s, "binary").toString("base64");
  return s;
}

function b64decodeBytes(b64) {
  var bin = "";
  if (typeof atob === "function") bin = atob(b64);
  else if (typeof Buffer !== "undefined") bin = Buffer.from(b64, "base64").toString("binary");
  return strToBytes(bin);
}

/* AllForU MovieBox provider for Nuvio.
 * Faithful port of the AllForU CloudStream MovieBox plugin.
 * Promise-only (Nuvio sandbox has no async/await).
 */

var MBOX_BASE = "https://api3.aoneroom.com";
var MBOX_UA = "com.community.mbox.in/50020113 (Linux; U; Android 16; en_IN; Pixel 8; Build/BP22.250325.006; Cronet/133.0.6876.3)";
var FILE_UA = "com.community.mbox.in/50020126 (Linux; U; Android 14; en_IN; Pixel 8; Build/UD1A.230803.041; Cronet/145.0.7582.0)";
var TMDB_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

var MBOX_DEVICE_ID = (function () {
  var c = "0123456789abcdef", s = "";
  for (var i = 0; i < 32; i++) s += c[Math.floor(Math.random() * 16)];
  return s;
})();

// Double-base64 key, identical to MboxCrypto.kt.
var MBOX_KEY = (function () {
  var once = b64decodeBytes("NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==");
  var sb = "";
  for (var i = 0; i < once.length; i++) sb += String.fromCharCode(once[i]);
  return b64decodeBytes(sb); // 30 bytes
})();

var BRANDS = [
  ["Samsung", ["SM-S918B", "SM-A528B", "SM-M336B"]],
  ["Xiaomi", ["2201117TI", "M2012K11AI", "Redmi Note 11"]],
  ["OnePlus", ["LE2111", "CPH2449", "IN2023"]],
  ["Google", ["Pixel 6", "Pixel 7", "Pixel 8"]],
  ["Realme", ["RMX3085", "RMX3360", "RMX3551"]],
];

function mboxBrandModel() {
  var p = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  return { brand: p[0], model: p[1][Math.floor(Math.random() * p[1].length)] };
}

function mboxClientInfo() {
  return JSON.stringify({
    package_name: "com.community.mbox.in",
    version_name: "3.0.13.0402.03",
    version_code: 50020113,
    os: "android",
    os_version: "16",
    device_id: MBOX_DEVICE_ID,
    install_store: "ps",
    gaid: MBOX_DEVICE_ID,
    brand: "Google",
    model: "Pixel 8",
    system_language: "en",
    net: "NETWORK_WIFI",
    region: "IN",
    timezone: "Asia/Calcutta",
    sp_code: "",
  });
}

function mboxCanonical(method, accept, ctype, url, body, ts) {
  var path = "/", rawQuery = "";
  try {
    var u = new URL(url);
    path = u.pathname || "/";
    rawQuery = (u.search || "").replace(/^\?/, "");
  } catch (e) {
    var t = String(url || "");
    var si = t.indexOf("://");
    var start = 0;
    if (si >= 0) {
      var hs = si + 3, sl = t.indexOf("/", hs);
      start = sl >= 0 ? sl : t.length;
    }
    var pq = t.slice(start) || "/";
    var qi = pq.indexOf("?");
    if (qi >= 0) { path = pq.slice(0, qi) || "/"; rawQuery = pq.slice(qi + 1); }
    else path = pq || "/";
  }
  var map = {}, keys = [];
  rawQuery.split("&").forEach(function (part) {
    if (!part) return;
    var i = part.indexOf("=");
    var k = i >= 0 ? part.slice(0, i) : part;
    var v = i >= 0 ? part.slice(i + 1) : "";
    if (!map[k]) { map[k] = []; keys.push(k); }
    map[k].push(v);
  });
  keys.sort();
  var qp = [];
  keys.forEach(function (k) { map[k].forEach(function (v) { qp.push(k + "=" + v); }); });
  var canonicalUrl = qp.length ? path + "?" + qp.join("&") : path;
  var bodyLength = "", bodyHash = "";
  if (body !== null && body !== undefined) {
    var raw = toRawUtf8(String(body));
    bodyLength = String(raw.length);
    bodyHash = md5Hex(raw.length > 102400 ? raw.slice(0, 102400) : raw);
  }
  return method.toUpperCase() + "\n" + accept + "\n" + ctype + "\n" +
    bodyLength + "\n" + ts + "\n" + bodyHash + "\n" + canonicalUrl;
}

function mboxXClientToken() {
  var ts = String(Date.now());
  return ts + "," + md5Hex(ts.split("").reverse().join(""));
}

function mboxXTrSignature(method, accept, ctype, url, body) {
  var ts = Date.now();
  var msg = toRawUtf8(mboxCanonical(method, accept, ctype, url, body, ts));
  var sig = hmacMd5(MBOX_KEY, strToBytes(msg));
  return ts + "|2|" + b64encode(sig);
}

function mboxHeaders(url, token, post, body) {
  var method = post ? "POST" : "GET";
  var ctype = post ? "application/json; charset=utf-8" : "application/json";
  var h = {
    "user-agent": MBOX_UA,
    accept: "application/json",
    "content-type": ctype,
    connection: "keep-alive",
    "x-client-token": mboxXClientToken(),
    "x-tr-signature": mboxXTrSignature(method, "application/json", ctype, url, body),
    "x-client-info": mboxClientInfo(),
    "x-client-status": "0",
    "accept-language": "*",
    "sec-fetch-mode": "cors",
  };
  if (token) h["Authorization"] = "Bearer " + token;
  return h;
}

function fetchT(url, ms, opts) {
  var p = fetch(url, opts);
  if (typeof setTimeout !== "function") return p;
  return Promise.race([
    p,
    new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms || 12000); }),
  ]);
}

function mboxRaw(url, headers, opts) {
  opts = opts || {};
  return fetchT(url, opts.timeout || 15000, {
    method: opts.method || "GET",
    headers: headers,
    body: opts.body,
    redirect: "follow",
  }).then(function (r) {
    return r.text().then(function (text) {
      var token = null;
      try {
        var xUser = r.headers.get("x-user") || r.headers.get("X-User");
        if (xUser) { var p = JSON.parse(xUser); token = p && p.token ? p.token : null; }
      } catch (e) {}
      return { status: r.status, body: text, token: token };
    });
  });
}

var MBOX_CACHED_TOKEN = null, MBOX_TOKEN_AT = 0;

function mboxToken() {
  if (MBOX_CACHED_TOKEN && Date.now() - MBOX_TOKEN_AT < 24 * 60 * 60 * 1000) {
    return Promise.resolve(MBOX_CACHED_TOKEN);
  }
  var ep = MBOX_BASE + "/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1";
  return mboxRaw(ep, mboxHeaders(ep, null)).then(function (res) {
    if (res.token) { MBOX_CACHED_TOKEN = res.token; MBOX_TOKEN_AT = Date.now(); }
    return MBOX_CACHED_TOKEN;
  });
}

function mboxSearch(keyword, token) {
  var ep = MBOX_BASE + "/wefeed-mobile-bff/subject-api/search/v2";
  var payload = JSON.stringify({ page: 1, perPage: 20, keyword: keyword });
  var h = mboxHeaders(ep, token, true, payload);
  h["x-play-mode"] = "2";
  return mboxRaw(ep, h, { method: "POST", body: payload }).then(function (res) {
    return JSON.parse(res.body);
  });
}

function mboxGetInfo(subjectId, token) {
  var ep = MBOX_BASE + "/wefeed-mobile-bff/subject-api/get?subjectId=" + encodeURIComponent(subjectId);
  var h = mboxHeaders(ep, token);
  h["x-play-mode"] = "2";
  return mboxRaw(ep, h).then(function (res) { return JSON.parse(res.body); });
}

function mboxPlayInfo(subjectId, se, ep, token) {
  var url = MBOX_BASE + "/wefeed-mobile-bff/subject-api/play-info?subjectId=" +
    encodeURIComponent(subjectId) + "&se=" + se + "&ep=" + ep;
  return mboxRaw(url, mboxHeaders(url, token)).then(function (res) {
    return JSON.parse(res.body);
  }).catch(function () { return null; });
}

/* CloudFront signed DASH url from the signCookie (same as extractSignedDashUrl). */
function mboxDashUrl(signCookie) {
  if (!signCookie) return null;
  try {
    var policy = signCookie.split("CloudFront-Policy=")[1];
    if (!policy) return null;
    policy = policy.split(";")[0].trim();
    while (policy.length % 4 !== 0) policy += "=";
    var fixed = policy.replace(/-/g, "+").replace(/_/g, "/");
    var decoded = "";
    if (typeof atob === "function") decoded = atob(fixed);
    else if (typeof Buffer !== "undefined") decoded = Buffer.from(fixed, "base64").toString("binary");
    var m = decoded.match(/https?:\/\/[^"]+/);
    if (!m) return null;
    var base = m[0].replace(/\/\*$/, "").replace(/\*$/, "").replace(/\/+$/, "");
    return base ? base + "/index.mpd" : null;
  } catch (e) { return null; }
}

function mboxTypeIsSeries(t) {
  var n = parseInt(t, 10); if (isNaN(n)) n = 1;
  return n === 2 || n === 7;
}

function normTitle(s) {
  return String(s || "").toLowerCase().split("[")[0].replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

var LANG_NAMES = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada",
  bn: "Bengali", mr: "Marathi", pa: "Punjabi", gu: "Gujarati", ur: "Urdu",
  es: "Spanish", esla: "Spanish (LatAm)", pt: "Portuguese", ptbr: "Portuguese (BR)",
  fr: "French", de: "German", it: "Italian", ja: "Japanese", ko: "Korean",
  zh: "Chinese", ar: "Arabic", ru: "Russian", tr: "Turkish", id: "Indonesian",
  vi: "Vietnamese", th: "Thai", fil: "Filipino", fa: "Persian"
};

/* "Original Audio"/"Hindi dub" -> display name like "English (Original)" / "Hindi". */
function langLabel(lanName, lanCode, original) {
  var code = String(lanCode || "").toLowerCase();
  var raw = String(lanName || "").trim();
  var isOriginal = !!original || /original/i.test(raw);
  var name = raw.replace(/\s*dub\s*$/i, "").replace(/^original\s*audio$/i, "").trim();
  var mapped = LANG_NAMES[name.toLowerCase()];
  if (!name || mapped) {
    name = mapped || LANG_NAMES[code] || (code ? code.charAt(0).toUpperCase() + code.slice(1) : "Original");
  }
  if (isOriginal) name += " (Original)";
  return name;
}

function fmtSize(bytes) {
  if (!bytes || bytes < 1024) return "Unknown";
  var gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 0.1) return gb.toFixed(gb >= 10 ? 0 : 1) + " GB";
  return (bytes / (1024 * 1024)).toFixed(0) + " MB";
}

/* Every language is a separate subjectId in `dubs`; it returns its own streams.
 * Collect them all (including the picked subject itself) with a display label. */
function mboxDubList(info) {
  var data = (info && info.data) || {};
  var out = [], seen = {};
  (data.dubs || []).forEach(function (x) {
    var sid = x && x.subjectId ? String(x.subjectId) : "";
    if (!sid || seen[sid]) return;
    seen[sid] = 1;
    out.push({ sid: sid, lang: langLabel(x.lanName, x.lanCode, x.original) });
  });
  var selfId = String(data.subjectId || "");
  if (selfId && !seen[selfId]) {
    // The picked subject may be a dub itself; don't force "(Original)" on it.
    out.unshift({ sid: selfId, lang: langLabel(data.lanName, data.lanCode, false) });
  }
  return out;
}

function mboxStreams(pi, lang) {
  var out = [];
  var streams = (pi && pi.data && pi.data.streams) || [];
  for (var i = 0; i < streams.length; i++) {
    var o = streams[i] || {};
    var rawUrl = o.url || "";
    if (!rawUrl) continue;
    var size = parseInt(o.size, 10) || 0;
    var sign = o.signCookie || "";
    var dash = mboxDashUrl(sign);
    if (!dash && size >= 1 && size < 5000000) continue; // skip tiny/placeholder
    var url = dash || rawUrl;
    var resText = o.resolutions || "";
    var q = resText.indexOf("2160") >= 0 ? "4K"
      : resText.indexOf("1080") >= 0 ? "1080p"
      : resText.indexOf("720") >= 0 ? "720p"
      : resText.indexOf("480") >= 0 ? "480p" : "1080p";
    var headers = { Referer: MBOX_BASE, "User-Agent": FILE_UA };
    if (sign) headers["Cookie"] = sign;
    out.push({
      name: "AllForU MovieBox" + (lang ? " · " + lang : ""),
      title: q + (lang ? " · " + lang : ""),
      url: url,
      quality: q,
      language: lang || "",
      size: fmtSize(size),
      headers: headers,
      provider: "allforu-moviebox",
      _claimed: size,
      _isDash: !!dash,
    });
  }
  return out;
}

/* For one language pack, try each se/ep combo until it yields streams. */
function mboxDubStreams(dub, combos, token) {
  var idx = 0;
  function attempt() {
    if (idx >= combos.length) return Promise.resolve([]);
    var combo = combos[idx++];
    return mboxPlayInfo(dub.sid, combo[0], combo[1], token).then(function (pi) {
      var list = mboxStreams(pi, dub.lang);
      if (list.length) return list;
      return attempt();
    }).catch(function () { return attempt(); });
  }
  return attempt();
}

function mboxTryCombos(dubs, combos, token) {
  var seen = {}, merged = [];
  var chain = Promise.resolve();
  dubs.slice(0, 12).forEach(function (dub) {
    chain = chain.then(function () {
      return mboxDubStreams(dub, combos, token).then(function (list) {
        list.forEach(function (s) {
          // Dedup per language — every language shares the same raw .mp4 URL,
          // so deduping by URL alone would collapse all audio tracks into one.
          var key = (s.language || "") + "|" + s.url;
          if (!seen[key]) { seen[key] = 1; merged.push(s); }
        });
      });
    });
  });
  return chain.then(function () {
    // Real per-language streams are CloudFront-signed DASH. Some dubs have no
    // signature and fall back to a shared, generic .mp4 placeholder, so when at
    // least one signed track exists, drop the unsigned decoys entirely.
    var hasDash = false;
    for (var i = 0; i < merged.length; i++) { if (merged[i]._isDash) { hasDash = true; break; } }
    var final = merged.filter(function (s) { return !hasDash || s._isDash; });
    final.forEach(function (s) { delete s._claimed; delete s._isDash; });
    final.sort(function (a, b) {
      var la = (a.language || "").toLowerCase(), lb = (b.language || "").toLowerCase();
      if (la !== lb) return la < lb ? -1 : 1;
      return parseInt(b.quality, 10) - parseInt(a.quality, 10);
    });
    return final;
  });
}

function mboxPick(subjects, title) {
  if (!subjects || !subjects.length) return null;
  var want = normTitle(title), exact = null, starts = null;
  for (var i = 0; i < subjects.length; i++) {
    var t = normTitle(subjects[i].title);
    if (!t) continue;
    if (t === want && !exact) exact = subjects[i];
    else if (!starts && want.length > 4 && (t.indexOf(want) === 0 || want.indexOf(t) === 0)) starts = subjects[i];
  }
  return exact || starts; // strict: never fall back to an unrelated title
}

/* ── Title resolution (Cinemeta first — reachable where TMDB is blocked) ── */
function fetchJsonT(url, ms) {
  return fetchT(url, ms, {}).then(function (r) { return r.json(); });
}

function resolveTitle(id, mediaType) {
  var kind = mediaType === "tv" ? "series" : "movie";
  var raw = String(id || "").split(":")[0].trim();
  if (raw.indexOf("tt") === 0) {
    return fetchJsonT("https://v3-cinemeta.strem.io/meta/" + kind + "/" + encodeURIComponent(raw) + ".json", 9000)
      .then(function (j) {
        var m = j && j.meta;
        if (!m || !m.name) throw new Error("cinemeta-miss");
        var yr = m.year || (m.releaseInfo ? String(m.releaseInfo).match(/\d{4}/) : null);
        return { title: m.name, year: yr ? String(yr).slice(0, 4) : "" };
      })
      .catch(function () {
        var f = "https://api.themoviedb.org/3/find/" + encodeURIComponent(raw) +
          "?api_key=" + TMDB_KEY + "&external_source=imdb_id";
        return fetchJsonT(f, 10000).then(function (j) {
          var list = ((j && (j.movie_results || j.tv_results)) || [])[0];
          if (!list) throw new Error("tmdb-miss");
          var d = list.release_date || list.first_air_date || "";
          return { title: list.title || list.name || "", year: String(d).slice(0, 4) };
        });
      });
  }
  var tk = mediaType === "tv" ? "tv" : "movie";
  return fetchJsonT("https://api.themoviedb.org/3/" + tk + "/" + encodeURIComponent(raw) + "?api_key=" + TMDB_KEY, 10000)
    .then(function (m) {
      return { title: m.title || m.name || "", year: String(m.release_date || m.first_air_date || "").slice(0, 4) };
    });
}

/* ── Public entry ────────────────────────────────────────────────────────── */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  var season = mediaType === "tv" ? (parseInt(seasonNum, 10) || 1) : 1;
  var episode = mediaType === "tv" ? (parseInt(episodeNum, 10) || 1) : 1;

  return resolveTitle(tmdbId, mediaType).then(function (meta) {
    if (!meta.title) throw new Error("no-title");
    return mboxToken().then(function (token) {
      return mboxSearch(meta.title, token).then(function (root) {
        var subjects = [];
        var results = (root && root.data && root.data.results) || [];
        results.forEach(function (g) {
          (g && g.subjects ? g.subjects : []).forEach(function (s) { subjects.push(s); });
        });
        var pick = mboxPick(subjects, meta.title);
        if (!pick) throw new Error("no-match");
        var sid = String(pick.subjectId);
        var isSeries = mboxTypeIsSeries(pick.subjectType);

        if (!isSeries) {
          return mboxGetInfo(sid, token).catch(function () { return {}; }).then(function (groot) {
            var dubs = mboxDubList(groot);
            if (!dubs.length) dubs = [{ sid: sid, lang: "Original" }];
            return mboxTryCombos(dubs, [[1, 1], [0, 0]], token);
          });
        }
        return mboxGetInfo(sid, token).then(function (groot) {
          var dubs = mboxDubList(groot);
          if (!dubs.length) dubs = [{ sid: sid, lang: "Original" }];
          return mboxTryCombos(dubs, [[season, episode], [0, 0], [1, 1]], token);
        });
      });
    });
  }).catch(function (e) {
    return [{
      name: "AllForU MovieBox (debug)",
      title: "MovieBox: " + String((e && e.message) || e).slice(0, 90),
      url: "https://raw.githubusercontent.com/RVRBEAST76/allforu-nuvio/main/README.md",
      quality: "DBG", size: "Unknown", headers: {}, provider: "allforu-debug",
    }];
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}