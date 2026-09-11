/* AllForU Netflix scraper for Nuvio (Local Scrapers)
 * Source: net52.cc mirror network (same backend as AllForU CloudStream plugin)
 * Promise-only (no async/await). Works with plain fetch.
 */

// Free key from https://www.themoviedb.org (Nuvio also injects its own key natively)
function tmdbKey() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.TMDB_API_KEY) return globalThis.TMDB_API_KEY;
  } catch (e) {}
  return "1865f43a0549ca50d341dd9ab8b29f49";
}

var NF_BASE = "https://net52.cc";
var NF_MOBILE = NF_BASE + "/mobile";
var NF_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
var NF_DEBUG = true;
var NF_TRACE = [];
function mark(s) { try { NF_TRACE.push(s); } catch (e) {} }

function nfFetch(url, opts) {
  // NOTE: no setTimeout here (sandbox may not provide timers) - native fetch has its own timeouts
  opts = opts || {};
  opts.headers = opts.headers || {};
  if (!opts.headers["User-Agent"]) opts.headers["User-Agent"] = NF_UA;
  return fetch(url, opts);
}

function nfJson(url, headers) {
  return nfFetch(url, { headers: headers || {} }).then(function (r) {
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  });
}

function nfUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* Step 1: bypass -> t_hash_t cookie (manual cookie handling for sandbox fetch) */
function nfBypass() {
  var body = "g-recaptcha-response=" + nfUuid();
  return nfFetch(NF_BASE + "/verify.php", {
    method: "POST",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "max-age=0",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://net52.cc",
      Referer: "https://net52.cc/verify2",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    },
    body: body
  }).then(function (r) {
    mark("verify:" + r.status);
    var sc = "";
    try {
      sc = r.headers.get("set-cookie") || r.headers.get("Set-Cookie") || "";
    } catch (e) {}
    return r.text().then(function (t) {
      mark("body:" + String(t || "").replace(/\s+/g, " ").slice(0, 110));
      var m = sc.match(/t_hash_t=([^;]+)/i);
      if (m && m[1]) { mark("cookie:ok"); return decodeURIComponent(m[1]); }
      mark("cookie:missing");
      throw new Error("no cookie");
    });
  });
}

function nfCookieHeader(tok) {
  return "t_hash_t=" + tok + "; ott=nf; hd=on";
}

function nfApiHeaders(tok) {
  return {
    Accept: "application/json",
    Referer: NF_BASE + "/home",
    Cookie: nfCookieHeader(tok)
  };
}

/* Step 2: tmdbId -> title/year via TMDB */
function nfTitle(tmdbId, mediaType) {
  var kind = mediaType === "tv" ? "tv" : "movie";
  return nfJson("https://api.themoviedb.org/3/" + kind + "/" + encodeURIComponent(tmdbId) + "?api_key=" + tmdbKey())
    .then(function (m) {
      mark("tmdb:" + (m && (m.title || m.name) || "null"));
      if (!m) throw new Error("tmdb null");
      var title = m.title || m.name || "";
      var date = m.release_date || m.first_air_date || "";
      return { title: title, year: (date || "").slice(0, 4) };
    });
}

/* Step 3: search net52 -> best post id */
function nfSearch(title, tok) {
  var t = Math.floor(Date.now() / 1000);
  return nfJson(NF_MOBILE + "/search.php?s=" + encodeURIComponent(title) + "&t=" + t, nfApiHeaders(tok))
    .then(function (d) {
      var list = d.searchResult || d.results || [];
      mark("search:" + list.length);
      if (!list.length) throw new Error("no results");
      var lc = title.toLowerCase();
      var best = null;
      for (var i = 0; i < list.length; i++) {
        var nm = String(list[i].t || list[i].title || "");
        if (nm.toLowerCase().indexOf(lc) >= 0 || lc.indexOf(nm.toLowerCase()) >= 0) {
          best = list[i];
          break;
        }
      }
      return best || list[0];
    });
}

/* Step 4: post -> movie play id OR find series episode eid */
function nfFindEpisode(postId, seasonNum, episodeNum, tok) {
  var t = Math.floor(Date.now() / 1000);
  return nfJson(NF_MOBILE + "/post.php?id=" + encodeURIComponent(postId) + "&t=" + t, nfApiHeaders(tok))
    .then(function (d) {
      mark("post:" + (d.type || "?") + "/" + ((d.episodes || []).length) + "ep");
      if ((d.type || "") !== "t") return { playId: postId, title: d.title || d.t || "" };
      var eps = d.episodes || [];
      var found = findEp(eps, seasonNum, episodeNum);
      if (found) return { playId: found, title: d.title || d.t || "" };
      var chain = Promise.resolve(null);
      // next pages of current season
      if (d.nextPageShow == 1 || d.nextPageShow === "1") {
        var ns = d.nextPageSeason || "";
        if (ns) chain = chain.then(function () { return nfPages(postId, ns, 2, tok, seasonNum, episodeNum); });
      }
      // other seasons
      var seasons = d.season || [];
      for (var i = 0; i < seasons.length; i++) {
        (function (sid) {
          if (!sid) return;
          chain = chain.then(function (got) {
            if (got) return got;
            return nfPages(postId, sid, 1, tok, seasonNum, episodeNum);
          });
        })(seasons[i] && seasons[i].id);
      }
      return chain.then(function (got) {
        if (got) return { playId: got, title: d.title || d.t || "" };
        throw new Error("episode not found");
      });
    });
}

function findEp(eps, seasonNum, episodeNum) {
  for (var i = 0; i < eps.length; i++) {
    var o = eps[i] || {};
    var s = parseInt(String(o.s || "1").replace(/[^0-9]/g, ""), 10) || 1;
    var e = parseInt(String(o.ep || "0").replace(/[^0-9]/g, ""), 10) || 0;
    if (s === seasonNum && e === episodeNum && o.id) return o.id;
  }
  return null;
}

function nfPages(seriesId, seasonId, page, tok, seasonNum, episodeNum) {
  var t = Math.floor(Date.now() / 1000);
  return nfJson(
    NF_MOBILE + "/episodes.php?s=" + encodeURIComponent(seasonId) + "&series=" + encodeURIComponent(seriesId) + "&t=" + t + "&page=" + page,
    nfApiHeaders(tok)
  ).then(function (d) {
    var got = findEp(d.episodes || [], seasonNum, episodeNum);
    if (got) return got;
    var more = d.nextPageShow == 1 || d.nextPageShow === "1" || d.nextPageShow === true;
    if (more && page < 30) return nfPages(seriesId, seasonId, page + 1, tok, seasonNum, episodeNum);
    return null;
  });
}

/* Step 5: playlist -> direct streams */
function nfPlaylist(playId, title, tok) {
  var tm = Math.floor(Date.now() / 1000);
  var cookieStr = nfCookieHeader(tok);
  var headers = {
    Accept: "application/json",
    Referer: NF_BASE + "/mobile/home?app=1",
    Cookie: cookieStr
  };
  return nfJson(NF_MOBILE + "/playlist.php?id=" + encodeURIComponent(playId) + "&t=Watch&tm=" + tm, headers)
    .then(function (arr) {
      mark("playlist:" + ((arr || []).length) + "rows");
      var out = [];
      (arr || []).forEach(function (o) {
        (o.sources || []).forEach(function (s) {
          var file = s.file || "";
          if (!file) return;
          if (file.indexOf("http") !== 0) file = NF_BASE + "/" + file.replace(/^\//, "");
          var label = s.label || "HD";
          var q = "1080p";
          if (label.indexOf("2160") >= 0 || label.toLowerCase().indexOf("4k") >= 0) q = "4K";
          else if (label.indexOf("720") >= 0) q = "720p";
          else if (label.indexOf("480") >= 0) q = "480p";
          else if (label.indexOf("360") >= 0) q = "360p";
          out.push({
            name: "AllForU Netflix",
            title: title + " " + label,
            url: file,
            quality: q,
            size: "Unknown",
            headers: {
              "User-Agent": NF_UA,
              Referer: NF_BASE + "/mobile/home?app=1",
              Cookie: cookieStr
            },
            provider: "allforu-netflix"
          });
        });
      });
      // HD first
      out.sort(function (a, b) {
        return parseInt(b.quality, 10) - parseInt(a.quality, 10);
      });
      return out;
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  NF_TRACE = [];
  mark("start:" + tmdbId + "/" + mediaType);
  return nfTitle(tmdbId, mediaType)
    .then(function (meta) {
      if (!meta.title) return [];
      var season = mediaType === "tv" ? seasonNum || 1 : 1;
      var ep = mediaType === "tv" ? episodeNum || 1 : 1;
      return nfBypass()
        .then(function (tok) {
          return nfSearch(meta.title, tok).then(function (item) {
            var pid = item.id || item.postId || "";
            if (!pid) return [];
            if (mediaType !== "tv") {
              return nfPlaylist(pid, meta.title, tok).catch(function () { return []; });
            }
            return nfFindEpisode(pid, season, ep, tok).then(function (found) {
              return nfPlaylist(found.playId, (found.title || meta.title) + " S" + season + "E" + ep, tok);
            });
          });
        })
        .catch(function (e) { mark("ERR:" + (e && e.message || e)); return []; });
    })
    .catch(function (e) { mark("ERR:" + (e && e.message || e)); return []; })
    .then(function (out) {
      if (out.length === 0 && NF_DEBUG) {
        return [{
          name: "AllForU DEBUG",
          title: NF_TRACE.join(" > "),
          url: "https://raw.githubusercontent.com/RVRBEAST76/allforu-nuvio/main/README.md",
          quality: "DBG",
          size: "Unknown",
          headers: {},
          provider: "allforu-debug"
        }];
      }
      return out;
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
