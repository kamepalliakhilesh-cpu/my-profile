/* =====================================================================
   admin.js — "Is that you?" gate + edit mode

   HONEST WARNING, read this once:
   This is a static site. Everything here runs in the visitor's browser,
   so anyone who opens DevTools can read this file and switch admin mode
   on for themselves. It stops casual visitors from editing your house.
   It is NOT real security, and a 6-digit PIN is guessable in seconds.

   Your PIN is never stored here in plain text — only a salted SHA-256
   hash of it. To change the PIN: sign in, click "Change PIN", type the
   new one, and paste the hash it prints over CREDS.pass below.

   When you want edits to be visible to VISITORS (not just on your own
   computer), move the data to a backend — Firebase or Supabase free tier
   with real email/password auth. See README.
   ===================================================================== */
window.HouseAdmin = (function () {
  "use strict";

  var SALT = "house.akhilesh.v1";

  var CREDS = {
    mail: "791fd0aa329d4a6a7b737b8bf3414dec186e3ecf1bd04a4a35b47ab2a9463869",
    pass: "3345e5f34ad6a6f0d67f1cc5cd174585e79a0bfc989242b9bbebc5b7e84017a7"
  };

  var SESSION = "houseAdmin";
  var listeners = [];
  var admin = sessionStorage.getItem(SESSION) === "1";

  /* ---------- hashing (Web Crypto, with a pure-JS fallback) ---------- */
  function sha256Fallback(ascii) {
    function rr(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    var mathPow = Math.pow, maxWord = mathPow(2, 32), i, j, result = "";
    var words = [], asciiBitLength = ascii.length * 8;

    var hash = sha256Fallback.h = sha256Fallback.h || [];
    var k = sha256Fallback.k = sha256Fallback.k || [];
    var primeCounter = k.length;
    var isComposite = {};

    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";

    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return null;
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);

      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7] +
          (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
          ((e & hash[5]) ^ ((~e) & hash[6])) +
          k[i] +
          (w[i] = (i < 16) ? w[i] : (
            w[i - 16] +
            (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) +
            w[i - 7] +
            (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : "") + b.toString(16);
      }
    }
    return result;
  }

  function hash(text) {
    var input = SALT + ":" + text;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(input))
        .then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ("0" + b.toString(16)).slice(-2);
          }).join("");
        })
        .catch(function () { return sha256Fallback(input); });
    }
    return Promise.resolve(sha256Fallback(input));
  }

  /* ---------- state ---------- */
  function setAdmin(v) {
    admin = v;
    if (v) sessionStorage.setItem(SESSION, "1");
    else sessionStorage.removeItem(SESSION);
    document.body.classList.toggle("is-admin", v);
    var bar = document.getElementById("adminBar");
    if (bar) bar.classList.toggle("show", v);
    listeners.forEach(function (fn) { fn(v); });
  }

  /* ---------- login dialog ---------- */
  function openLogin() {
    var dlg = document.getElementById("loginDialog");
    dlg.classList.add("open");
    dlg.setAttribute("aria-hidden", "false");
    document.getElementById("loginEmail").focus();
  }

  function closeLogin() {
    var dlg = document.getElementById("loginDialog");
    dlg.classList.remove("open");
    dlg.setAttribute("aria-hidden", "true");
    document.getElementById("loginNote").textContent = "";
    document.getElementById("loginForm").reset();
  }

  function attempt(e) {
    e.preventDefault();
    var mail = document.getElementById("loginEmail").value.trim().toLowerCase();
    var pass = document.getElementById("loginPass").value;
    var note = document.getElementById("loginNote");

    note.textContent = "checking…";

    Promise.all([hash(mail), hash(pass)]).then(function (h) {
      if (h[0] === CREDS.mail && h[1] === CREDS.pass) {
        note.textContent = "Welcome home, Akhilesh.";
        setTimeout(function () { setAdmin(true); closeLogin(); }, 550);
      } else {
        note.textContent = "That's not the owner. Nice try though.";
        note.classList.add("shake");
        setTimeout(function () { note.classList.remove("shake"); }, 500);
      }
    });
  }

  /* ---------- wiring ---------- */
  function init() {
    document.getElementById("whoBtn").addEventListener("click", openLogin);
    document.getElementById("loginForm").addEventListener("submit", attempt);
    document.getElementById("loginCancel").addEventListener("click", closeLogin);

    document.addEventListener("keydown", function (e) {
      var dlg = document.getElementById("loginDialog");
      if (e.key === "Escape" && dlg.classList.contains("open")) closeLogin();
    });

    document.getElementById("adminOut").addEventListener("click", function () {
      setAdmin(false);
    });

    document.getElementById("adminExport").addEventListener("click", function () {
      var blob = new Blob([window.House.exportJSON()], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "house-data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });

    document.getElementById("adminImport").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          window.House.importJSON(reader.result);
          alert("Imported. Your house is updated.");
        } catch (err) {
          alert("That file didn't look like house data.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    document.getElementById("adminReset").addEventListener("click", function () {
      if (confirm("Throw away all your edits and go back to the original content?")) {
        window.House.reset();
      }
    });

    document.getElementById("adminPin").addEventListener("click", function () {
      var pin = prompt("Type the NEW password you want to use:");
      if (!pin) return;
      hash(pin).then(function (h) {
        prompt(
          "Open admin.js, find CREDS.pass, and replace it with this value:",
          h
        );
      });
    });

    setAdmin(admin);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    isAdmin: function () { return admin; },
    onChange: function (fn) { listeners.push(fn); },
    hash: hash
  };
})();
