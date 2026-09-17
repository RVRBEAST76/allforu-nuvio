/** AllForU hotstar provider for Nuvio — built 2026-09-17T05:48:28.623Z */

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

/* Shared net52 helpers for the AllForU Nuvio scrapers.
 * Ported from the AllForU CloudStream providers (net52 mirror network).
 * Promise-only; runs on the device IP so device-bound tokens work.
 */

var TMDB_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

var MIRRORS = ["https://net52.cc", "https://net22.cc", "https://net27.cc", "https://net77.cc"];

var MOBILE_UA = "Mozilla/5.0 (Linux; Android 12; RMX2117 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.55 Mobile Safari/537.36 /OS.Gatu v3.0";
var BROWSER_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
var NEW_TV_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0";

var NEW_TV_DOMAINS = [
  "aHR0cHM6Ly9tb2JpbGVkZXRlY3RzLmNvbQ==",
  "aHR0cHM6Ly9tb2JpbGVkZXRlY3QuYXBw",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmFydA==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNj",
];

function b64d(s) {
  try {
    if (typeof atob === "function") return atob(s);
    if (typeof Buffer !== "undefined") return Buffer.from(s, "base64").toString("binary");
  } catch (e) {}
  return "";
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function fetchT(url, ms, opts) {
  var p = fetch(url, opts);
  if (typeof setTimeout !== "function") return p;
  return Promise.race([
    p,
    new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms || 12000); }),
  ]);
}

function fetchJsonT(url, ms, opts) {
  return fetchT(url, ms, opts).then(function (r) { return r.json(); });
}

/* ── Title resolution: Cinemeta first (reachable where TMDB is blocked) ── */
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
          var hit = ((j && (j.movie_results || j.tv_results)) || [])[0];
          if (!hit) throw new Error("tmdb-miss");
          var d = hit.release_date || hit.first_air_date || "";
          return { title: hit.title || hit.name || "", year: String(d).slice(0, 4) };
        });
      });
  }
  var tk = mediaType === "tv" ? "tv" : "movie";
  return fetchJsonT("https://api.themoviedb.org/3/" + tk + "/" + encodeURIComponent(raw) + "?api_key=" + TMDB_KEY, 10000)
    .then(function (m) {
      return { title: m.title || m.name || "", year: String(m.release_date || m.first_air_date || "").slice(0, 4) };
    });
}

/* ── net52 session ──────────────────────────────────────────────────────── */
function netBypass() {
  var i = 0;
  function next() {
    if (i >= MIRRORS.length) throw new Error("net52: no cookie");
    var base = MIRRORS[i++];
    return tryVerify(base).catch(function () { return next(); });
  }
  return next();
}

function tryVerify(base) {
  var body = "g-recaptcha-response=" + uuid();
  return fetchT(base + "/verify.php", 12000, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: base,
      Referer: base + "/verify2",
      "User-Agent": BROWSER_UA,
    },
    body: body,
  }).then(function (r) {
    var sc = "";
    try { sc = r.headers.get("set-cookie") || ""; } catch (e) {}
    var m = sc.match(/t_hash_t=([^;]+)/i);
    if (!m || !m[1]) throw new Error("no-cookie@" + base);
    var tok = m[1];
    try { tok = decodeURIComponent(tok); } catch (e) {}
    return { base: base, token: tok };
  });
}

function netCookie(tok, ott) {
  return "t_hash_t=" + tok + "; ott=" + (ott || "nf") + "; hd=on";
}

function normTitle(s) {
  return String(s || "").toLowerCase().split("[")[0].replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/* ott: "nf" | "hs" | "pv" | "dp". prefix: "" (netflix) | "hs/" | "pv/" for the
 * search path; Hotstar/Prime keep their own sub-path. */
function netSearch(sess, title, ott, year, pathPrefix) {
  var t = Math.floor(Date.now() / 1000);
  var prefix = typeof pathPrefix === "string" ? pathPrefix : "";
  var url = sess.base + "/mobile/" + prefix + "search.php?s=" + encodeURIComponent(title) + "&t=" + t;
  return fetchT(url, 12000, {
    headers: {
      Accept: "application/json",
      Referer: sess.base + "/home",
      Cookie: netCookie(sess.token, ott),
      "User-Agent": MOBILE_UA,
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var list = (d && (d.searchResult || d.results)) || [];
      if (!list.length) throw new Error("net52: no results");
      var want = normTitle(title);
      var wantYear = year ? String(year) : "";
      var exact = null, starts = null, yearHit = null;
      for (var i = 0; i < list.length; i++) {
        var o = list[i] || {};
        var nm = normTitle(o.t || o.title);
        if (!nm) continue;
        var ry = String(o.y || o.year || "");
        if (nm === want) {
          if (wantYear && ry && ry.indexOf(wantYear) === 0) { yearHit = o; break; }
          if (!exact) exact = o;
        } else if (!starts && want.length > 4 && (nm.indexOf(want) === 0 || want.indexOf(nm) === 0)) {
          starts = o;
        }
      }
      var chosen = yearHit || exact || starts;
      if (!chosen) throw new Error("net52: no title match");
      return chosen;
    });
}

/* ── NewTV player (full-length content) ─────────────────────────────────── */
function resolveNewTvApi() {
  var i = 0;
  function next() {
    if (i >= NEW_TV_DOMAINS.length) return Promise.resolve(null);
    var base = b64d(NEW_TV_DOMAINS[i++]).replace(/\/+$/, "");
    if (!base) return next();
    return fetchJsonT(base + "/checknewtv.php", 10000, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache", Expires: "0",
        "X-Requested-With": "NetmirrorNewTV v1.0",
        "User-Agent": NEW_TV_UA,
        Accept: "application/json, text/plain, */*",
      },
    }).then(function (j) {
      var th = (j && j.token_hash ? String(j.token_hash) : "").trim();
      if (!th) return next();
      var api = b64d(th).replace(/\/+$/, "");
      return api || next();
    }).catch(function () { return next(); });
  }
  return next();
}

function newTvOtp(apiBase) {
  return fetchT(apiBase + "/newtv/otp.php", 10000, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "Keep-Alive", Expires: "0", Pragma: "no-cache",
      "User-Agent": NEW_TV_UA,
    },
  }).then(function (r) { return r.text(); })
    .then(function (t) {
      // Newer endpoints return JSON: {"otp":"..."} ; older return JS const otp=[...]
      var jm = t.match(/"otp"\s*:\s*"([^"]+)"/);
      if (jm && jm[1]) return jm[1];
      var m = t.match(/const\s+otp\s*=\s*\[(.*?)\]/m);
      if (!m) return null;
      var parts = m[1].split(",");
      for (var i = 0; i < parts.length; i++) {
        var v = parts[i].trim().replace(/^["']|["']$/g, "");
        if (v) return v;
      }
      return null;
    })
    .catch(function () { return null; });
}

function newTvPlayer(apiBase, playId, token, ott) {
  var url = apiBase + "/newtv/player.php?id=" + encodeURIComponent(playId);
  return fetchT(url, 12000, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache", Expires: "0",
      "X-Requested-With": "NetmirrorNewTV v1.0",
      "User-Agent": NEW_TV_UA,
      Accept: "application/json, text/plain, */*",
      Ott: ott || "nf",
      Usertoken: token || "",
    },
  }).then(function (r) { return r.json(); }).catch(function () { return null; });
}

/* Returns a stream object or null. */
function newTvStream(playId, label, ott) {
  return resolveNewTvApi().then(function (api) {
    if (!api) return null;
    return newTvOtp(api).then(function (otp) {
      var token = otp || "";
      return newTvPlayer(api, playId, token, ott).then(function (root) {
        if (root && root.status === "otp") {
          return newTvOtp(api).then(function (otp2) {
            token = otp2 || token;
            return newTvPlayer(api, playId, token, ott);
          });
        }
        return root;
      }).then(function (r) {
        // The NewTV player sometimes reports status "otp" yet still returns a
        // valid video_link (direct CDN, no rate-limit). Accept any non-empty
        // link instead of requiring status === "ok".
        var link = r ? (r.video_link || "") : "";
        if (!link) return null;
        var low = link.toLowerCase();
        if (low.indexOf("sample") >= 0 || low.indexOf("trailer") >= 0 ||
            low.indexOf("teaser") >= 0 || low.indexOf("signin") >= 0) return null;
        var ref = (r && r.referer) || (api + "/");
        return {
          name: label || "AllForU",
          title: "HD",
          url: link,
          quality: "1080p",
          size: "Unknown",
          headers: { "User-Agent": NEW_TV_UA, Ott: ott || "nf", Usertoken: token, Referer: ref },
          provider: "allforu-newtv",
        };
      });
    });
  });
}

/* ── Playlist fallback (older content) ──────────────────────────────────── */
function netPlaylist(sess, playId, label, ott, prefix, ottParam) {
  var t = Math.floor(Date.now() / 1000);
  var url = sess.base + "/mobile/" + prefix + "playlist.php?id=" + encodeURIComponent(playId) +
    "&t=Watch&tm=" + t;
  return fetchT(url, 12000, {
    headers: {
      Accept: "application/json",
      Referer: sess.base + "/mobile/home?app=1",
      Cookie: netCookie(sess.token, ottParam || ott),
      "User-Agent": MOBILE_UA,
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (arr) {
      var out = [];
      (arr || []).forEach(function (o) {
        (o.sources || []).forEach(function (s) {
          var file = s.file || "";
          if (!file) return;
          if (file.indexOf("http") !== 0) file = sess.base + "/" + file.replace(/^\//, "");
          var l = s.label || "HD";
          out.push({
            name: label || "AllForU",
            title: l,
            url: file,
            quality: l.indexOf("2160") >= 0 ? "4K"
              : l.indexOf("720") >= 0 ? "720p"
              : l.indexOf("480") >= 0 ? "480p"
              : l.indexOf("360") >= 0 ? "360p" : "1080p",
            size: "Unknown",
            headers: {
              "User-Agent": MOBILE_UA,
              Referer: sess.base + "/mobile/home?app=1",
              Cookie: netCookie(sess.token, ottParam || ott),
            },
            provider: "allforu-net52",
          });
        });
      });
      return out;
    })
    .catch(function () { return []; });
}

/* AllForU Hotstar provider for Nuvio (net52 mirror).
 * Ported from the AllForU CloudStream Hotstar plugin.
 */

var HS_OTT = "hs";
var HS_PREFIX = "hs/";
var HS_LABEL = "AllForU Hotstar";

function hsPost(sess, postId) {
  var t = Math.floor(Date.now() / 1000);
  var url = sess.base + "/mobile/" + HS_PREFIX + "post.php?id=" + encodeURIComponent(postId) + "&t=" + t;
  return fetchT(url, 12000, {
    headers: {
      Accept: "application/json",
      Referer: sess.base + "/home",
      Cookie: netCookie(sess.token, HS_OTT),
      "User-Agent": MOBILE_UA,
    },
  }).then(function (r) { return r.json(); }).catch(function () { return null; });
}

function hsFindEpisode(d, season, episode) {
  var eps = (d && d.episodes) || [];
  for (var i = 0; i < eps.length; i++) {
    var o = eps[i] || {};
    var s = parseInt(String(o.s || "1").replace(/[^0-9]/g, ""), 10) || 1;
    var e = parseInt(String(o.ep || "0").replace(/[^0-9]/g, ""), 10) || 0;
    if (s === season && e === episode && o.id) return String(o.id);
  }
  return null;
}

function hsResolvePlayId(sess, postId, mediaType, season, episode) {
  if (mediaType !== "tv") return Promise.resolve(postId);
  return hsPost(sess, postId).then(function (d) {
    if (!d) throw new Error("hs: post failed");
    if ((d.type || "") !== "t") return postId;
    var hit = hsFindEpisode(d, season, episode);
    if (hit) return hit;

    // post.php only returns the currently-selected season's episodes. Try the
    // next page of that season, then every season id listed in `season`.
    var chain = Promise.resolve(null);
    if (d.nextPageShow == 1 || d.nextPageShow === "1") {
      var ns = d.nextPageSeason || "";
      if (ns) chain = chain.then(function () {
        return hsEpisodes(sess, postId, ns, 2, season, episode, 0);
      });
    }
    var seasons = d.season || [];
    seasons.forEach(function (se) {
      var sid = se && se.id ? String(se.id) : "";
      if (!sid) return;
      chain = chain.then(function (got) {
        if (got) return got;
        return hsEpisodes(sess, postId, sid, 1, season, episode, 0);
      });
    });
    return chain.then(function (got) {
      if (got) return got;
      throw new Error("hs: episode not found");
    });
  });
}

function hsEpisodes(sess, seriesId, seasonId, page, season, episode, depth) {
  if (depth > 30) return Promise.resolve(null);
  var t = Math.floor(Date.now() / 1000);
  var url = sess.base + "/mobile/episodes.php?s=" + encodeURIComponent(seasonId) +
    "&series=" + encodeURIComponent(seriesId) + "&t=" + t + "&page=" + page;
  return fetchT(url, 12000, {
    headers: {
      Accept: "application/json",
      Referer: sess.base + "/home",
      Cookie: netCookie(sess.token, HS_OTT),
      "User-Agent": MOBILE_UA,
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var got = hsFindEpisode(d, season, episode);
      if (got) return got;
      var more = d && (d.nextPageShow == 1 || d.nextPageShow === "1" || d.nextPageShow === true);
      if (more) return hsEpisodes(sess, seriesId, seasonId, page + 1, season, episode, depth + 1);
      return null;
    })
    .catch(function () { return null; });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  var season = mediaType === "tv" ? (parseInt(seasonNum, 10) || 1) : 1;
  var episode = mediaType === "tv" ? (parseInt(episodeNum, 10) || 1) : 1;

  return resolveTitle(tmdbId, mediaType).then(function (meta) {
    if (!meta.title) throw new Error("no-title");
    return netBypass().then(function (sess) {
      return netSearch(sess, meta.title, HS_OTT, meta.year, HS_PREFIX).then(function (item) {
        var postId = item.id || "";
        if (!postId) throw new Error("no-id");
        return hsResolvePlayId(sess, postId, mediaType, season, episode).then(function (playId) {
          return newTvStream(playId, HS_LABEL, HS_OTT).then(function (stream) {
            if (stream) {
              stream.name = HS_LABEL + " · " + (stream.quality || "HD");
              return [stream];
            }
            return netPlaylist(sess, playId, HS_LABEL, HS_OTT, HS_PREFIX, "nf");
          });
        });
      });
    });
  }).catch(function (e) {
    return [{
      name: HS_LABEL + " (debug)",
      title: "Hotstar: " + String((e && e.message) || e).slice(0, 90),
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