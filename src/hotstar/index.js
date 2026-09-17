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
          return newTvStream(playId, HS_LABEL, HS_OTT, sess.token).then(function (stream) {
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