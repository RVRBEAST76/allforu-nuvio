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