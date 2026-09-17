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
        var link = r && r.status === "ok" ? (r.video_link || "") : "";
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