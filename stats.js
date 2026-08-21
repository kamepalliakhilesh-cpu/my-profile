/* =====================================================================
   stats.js — live tracking of the coding profiles

   Every endpoint below was tested against the real profiles. Results are
   cached for 6 hours in localStorage; if a service is down you keep the
   last numbers it gave, marked "(cached)".

     Codeforces  official API            — ratings + full submission list
     LeetCode    alfa-leetcode-api       — solved counts + submission calendar
     CodeChef    profile page via a CORS proxy — rating, rank, stars, heat map
     HackerRank  no usable public API    — link only

   Opening index.html straight from disk (file://) blocks all of this.
   It works once the site is hosted.
   ===================================================================== */
window.HouseStats = (function () {
  "use strict";

  var KEY = "houseStats.v2";
  var MAX_AGE = 6 * 60 * 60 * 1000;

  var PROXIES = [
    function (u) { return "https://corsproxy.io/?url=" + encodeURIComponent(u); },
    function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); },
    function (u) { return "https://r.jina.ai/" + u; }
  ];

  function readCache() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeCache(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
  }

  function getJSON(url) {
    return fetch(url, { mode: "cors" }).then(function (r) {
      if (r.status === 429) throw new Error("rate-limited");
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function getText(url) {
    return fetch(url, { mode: "cors" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  /* fetch a page through whichever CORS proxy answers first */
  function getViaProxy(url) {
    var i = 0;
    function next() {
      if (i >= PROXIES.length) return Promise.reject(new Error("no proxy answered"));
      return getText(PROXIES[i++](url)).then(function (t) {
        if (!t || t.length < 500) throw new Error("short body");
        return t;
      }).catch(next);
    }
    return next();
  }

  function firstOf(attempts) {
    var i = 0;
    function next() {
      if (i >= attempts.length) return Promise.reject(new Error("all sources failed"));
      var a = attempts[i++];
      return getJSON(a.url).then(a.parse).catch(next);
    }
    return next();
  }

  function dayKey(ms) {
    var d = new Date(ms);
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function pad(dateStr) {
    /* CodeChef writes 2025-12-3; normalise to 2025-12-03 */
    var p = dateStr.split("-");
    if (p.length !== 3) return dateStr;
    return p[0] + "-" + (p[1].length < 2 ? "0" : "") + p[1] + "-" + (p[2].length < 2 ? "0" : "") + p[2];
  }

  /* ---------------- headline numbers ---------------- */
  var sources = {
    codeforces: function (handle) {
      return getJSON("https://codeforces.com/api/user.info?handles=" + encodeURIComponent(handle))
        .then(function (d) {
          var u = d.result[0];
          return [
            { label: "Rating", value: u.rating || "unrated" },
            { label: "Best",   value: u.maxRating || "—" },
            { label: "Rank",   value: u.rank || "unrated" }
          ];
        });
    },

    leetcode: function (handle) {
      return firstOf([
        {
          url: "https://alfa-leetcode-api.onrender.com/userProfile/" + encodeURIComponent(handle),
          parse: function (d) {
            if (!d || d.totalSolved === undefined) throw new Error("bad payload");
            return [
              { label: "Solved", value: d.totalSolved },
              { label: "Easy",   value: d.easySolved },
              { label: "Medium", value: d.mediumSolved },
              { label: "Hard",   value: d.hardSolved }
            ];
          }
        },
        {
          url: "https://alfa-leetcode-api.onrender.com/" + encodeURIComponent(handle) + "/solved",
          parse: function (d) {
            if (!d || d.solvedProblem === undefined) throw new Error("bad payload");
            return [
              { label: "Solved", value: d.solvedProblem },
              { label: "Easy",   value: d.easySolved },
              { label: "Medium", value: d.mediumSolved },
              { label: "Hard",   value: d.hardSolved }
            ];
          }
        }
      ]);
    },

    codechef: function (handle) {
      return getViaProxy("https://www.codechef.com/users/" + encodeURIComponent(handle))
        .then(function (html) {
          var rating = html.match(/class="rating-number"[^>]*>\s*([0-9]+)/);
          var best   = html.match(/Highest Rating\s*([0-9]+)/);
          var rank   = html.match(/<strong>\s*([0-9,]+)\s*<\/strong>\s*<\/a>\s*Global Rank/);
          var solved = html.match(/Total Problems Solved:\s*([0-9]+)/i);
          var stars  = (html.match(/rating-star[\s\S]{0,400}?<\/div>/) || [""])[0];
          var starN  = (stars.match(/&#9733;|★/g) || []).length;

          if (!rating) throw new Error("could not read the profile");

          var rows = [];
          if (solved) rows.push({ label: "Solved", value: solved[1] });
          rows.push({ label: "Rating", value: rating[1] });
          if (best) rows.push({ label: "Best", value: best[1] });
          if (starN) rows.push({ label: "Stars", value: starN + "★" });
          if (rank) rows.push({ label: "Global", value: "#" + rank[1] });
          return rows;
        });
    }
  };

  /* ---------------- submission calendars (the heat maps) ---------------- */
  function calendarFromTimestamps(list) {
    var days = {}, total = 0;
    list.forEach(function (ms) {
      var k = dayKey(ms);
      days[k] = (days[k] || 0) + 1;
      total++;
    });
    return { days: days, total: total };
  }

  function calendarFromObject(cal) {
    var days = {}, total = 0;
    for (var ts in cal) {
      if (!Object.prototype.hasOwnProperty.call(cal, ts)) continue;
      var n = parseInt(cal[ts], 10) || 0;
      var k = dayKey(parseInt(ts, 10) * 1000);
      days[k] = (days[k] || 0) + n;
      total += n;
    }
    return { days: days, total: total };
  }

  var calendars = {
    codeforces: function (handle) {
      return getJSON("https://codeforces.com/api/user.status?handle=" +
                     encodeURIComponent(handle) + "&from=1&count=3000")
        .then(function (d) {
          if (!d.result) throw new Error("bad payload");
          return calendarFromTimestamps(d.result.map(function (s) {
            return s.creationTimeSeconds * 1000;
          }));
        });
    },

    leetcode: function (handle) {
      return firstOf([
        {
          url: "https://alfa-leetcode-api.onrender.com/" + encodeURIComponent(handle) + "/calendar",
          parse: function (d) {
            var raw = d && d.submissionCalendar;
            if (!raw) throw new Error("no calendar");
            var cal = calendarFromObject(typeof raw === "string" ? JSON.parse(raw) : raw);
            cal.streak = d.streak;
            cal.activeDays = d.totalActiveDays;
            return cal;
          }
        },
        {
          url: "https://alfa-leetcode-api.onrender.com/userProfileCalendar?username=" + encodeURIComponent(handle),
          parse: function (d) {
            var raw = d && d.data && d.data.matchedUser &&
                      d.data.matchedUser.userCalendar &&
                      d.data.matchedUser.userCalendar.submissionCalendar;
            if (!raw) throw new Error("no calendar");
            return calendarFromObject(typeof raw === "string" ? JSON.parse(raw) : raw);
          }
        }
      ]);
    },

    codechef: function (handle) {
      return getViaProxy("https://www.codechef.com/users/" + encodeURIComponent(handle))
        .then(function (html) {
          var m = html.match(/userDailySubmissionsStats\s*=\s*(\[[\s\S]*?\])\s*;/);
          if (!m) throw new Error("no heat map on the page");

          var list = JSON.parse(m[1]);
          var days = {}, total = 0;
          list.forEach(function (row) {
            var k = pad(row.date);
            var n = parseInt(row.value, 10) || 0;
            days[k] = (days[k] || 0) + n;
            total += n;
          });
          return { days: days, total: total };
        });
    }
  };

  /* ---------------- caching wrappers ---------------- */
  function cached(kind, platform, handle, force, build) {
    var ck = kind + ":" + platform;
    var cache = readCache();
    var hit = cache[ck];
    var fresh = hit && (Date.now() - hit.at < MAX_AGE) && hit.handle === handle;

    if (fresh && !force) return Promise.resolve({ value: hit.value, at: hit.at, cached: true });

    return build(handle).then(function (value) {
      var c = readCache();
      c[ck] = { value: value, at: Date.now(), handle: handle };
      writeCache(c);
      return { value: value, at: c[ck].at, cached: false };
    }).catch(function (err) {
      if (hit) return { value: hit.value, at: hit.at, cached: true, stale: true };
      throw err;
    });
  }

  return {
    fetchOne: function (platform, handle, force) {
      if (!sources[platform]) return Promise.reject(new Error("no source"));
      return cached("s", platform, handle, force, sources[platform]).then(function (r) {
        return { rows: r.value, at: r.at, cached: r.cached, stale: r.stale };
      });
    },

    fetchCalendar: function (platform, handle, force) {
      if (!calendars[platform]) return Promise.reject(new Error("no calendar source"));
      return cached("c", platform, handle, force, calendars[platform]).then(function (r) {
        return { cal: r.value, at: r.at, cached: r.cached, stale: r.stale };
      });
    },

    hasStats: function (p) { return !!sources[p]; },
    hasCalendar: function (p) { return !!calendars[p]; },

    ago: function (ts) {
      if (!ts) return "never";
      var s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return "just now";
      if (s < 3600) return Math.floor(s / 60) + " min ago";
      if (s < 86400) return Math.floor(s / 3600) + " h ago";
      return Math.floor(s / 86400) + " d ago";
    },

    isFileProtocol: function () { return location.protocol === "file:"; }
  };
})();
