# AllForU — Nuvio Scraper

MovieBox streams for the **Nuvio** app. No server, no extra app — Nuvio runs the
JavaScript directly on your device.

## Install

1. Open **Nuvio**
2. Go to **Settings → Local Scrapers**
3. Add this repository URL:

```
https://raw.githubusercontent.com/RVRBEAST76/allforu-nuvio/main/
```

4. Enable **AllForU MovieBox**

> For home rows and search you also need a catalog addon such as **Cinemeta**
> (`https://v3-cinemeta.strem.io/manifest.json`). The scraper itself only
> provides the playable streams.

## Provider

| Name | Movie | Series | Notes |
|------|:-----:|:------:|-------|
| AllForU MovieBox | ✅ | ✅ | Multi-audio, multiple qualities, DASH + HLS |

## How it works

The scraper resolves the title (Cinemeta first, TMDB fallback), signs requests
to the MovieBox API with HMAC-MD5 (ported to pure JS), and returns direct
playable stream URLs with the required headers. Everything runs on your own
device IP.

## Development

```
node build.js     # bundles src/moviebox/index.js + src/_md5.js -> providers/moviebox.js
node test.js      # verifies crypto, title resolution, and live streams
```

## Disclaimer

This scraper only fetches links from third-party sites, like a web browser does.
No content is hosted here. Users are responsible for how they use it.