/* =====================================================================
   script.js — the house
   1 helpers · 2 preloader · 3 typing · 4 sound · 5 the corridor
   6 walking · 7 rooms · 8 heat maps · 9 numbers
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. helpers ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  function admin() { return window.HouseAdmin && window.HouseAdmin.isAdmin(); }
  function data() { return window.House.get(); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function bind(path, type) {
    if (!admin()) return "";
    return ' data-bind="' + path + '"' + (type ? ' data-type="' + type + '"' : "") +
           ' contenteditable="true" spellcheck="false"';
  }

  function delBtn(act, attrs) {
    if (!admin()) return "";
    return '<button class="x-btn" data-act="' + act + '" ' + attrs + ' title="Remove">&times;</button>';
  }

  function setPath(obj, path, value) {
    var parts = path.split("."), o = obj;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }

  function watchPhoto(img) {
    if (!img) return;
    var mark = function () {
      img.style.display = "none";
      if (img.parentElement) img.parentElement.classList.add("no-img");
    };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener("error", mark);
  }

  /* ---------- 2. preloader ---------- */
  (function preload() {
    var pct = $("pct"), pre = $("preloader");
    if (!pct) return;
    var n = 0;
    var timer = setInterval(function () {
      n += Math.random() * 9 + 3;
      if (n >= 100) { n = 100; clearInterval(timer); }
      pct.textContent = Math.floor(n) + "%";
    }, reduced ? 20 : 90);

    window.addEventListener("load", function () {
      setTimeout(function () {
        clearInterval(timer);
        pct.textContent = "100%";
        pre.classList.add("done");
      }, reduced ? 150 : 2400);
    });
  })();

  /* ---------- 3. typing line ---------- */
  (function typeLine() {
    var el = $("typed");
    if (!el) return;
    var lines = ["b.tech student", "competitive programmer", "web developer", "problem solver"];
    if (reduced) { el.textContent = lines[0]; return; }

    var li = 0, ci = 0, deleting = false;
    (function tick() {
      var word = lines[li];
      el.textContent = word.slice(0, ci);
      var wait = deleting ? 45 : 85;
      if (!deleting && ci === word.length) { deleting = true; wait = 1600; }
      else if (deleting && ci === 0) { deleting = false; li = (li + 1) % lines.length; wait = 260; }
      else { ci += deleting ? -1 : 1; }
      setTimeout(tick, wait);
    })();
  })();

  /* ---------- 4. sound ---------- */
  var Sound = (function () {
    var ctx = null;
    var on = localStorage.getItem("houseSound") === "on";

    function ensure() {
      if (!on) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function noise(c, seconds) {
      var len = Math.floor(c.sampleRate * seconds);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    return {
      isOn: function () { return on; },
      toggle: function () {
        on = !on;
        localStorage.setItem("houseSound", on ? "on" : "off");
        if (on) { ensure(); this.chime(); }
        return on;
      },
      knock: function () {
        var c = ensure(); if (!c) return;
        [0, 0.18].forEach(function (t) {
          var s = c.createBufferSource(); s.buffer = noise(c, 0.12);
          var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 320;
          var g = c.createGain();
          g.gain.setValueAtTime(0.5, c.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.12);
          s.connect(f); f.connect(g); g.connect(c.destination);
          s.start(c.currentTime + t); s.stop(c.currentTime + t + 0.14);
        });
      },
      creak: function () {
        var c = ensure(); if (!c) return;
        var o = c.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(140, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(58, c.currentTime + 0.85);
        var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 6;
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.95);
        o.connect(f); f.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 1);
      },
      step: function () {
        var c = ensure(); if (!c) return;
        var s = c.createBufferSource(); s.buffer = noise(c, 0.06);
        var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220;
        var g = c.createGain();
        g.gain.setValueAtTime(0.14, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
        s.connect(f); f.connect(g); g.connect(c.destination);
        s.start(); s.stop(c.currentTime + 0.08);
      },
      chime: function () {
        var c = ensure(); if (!c) return;
        [880, 1320].forEach(function (freq, i) {
          var o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
          var g = c.createGain();
          g.gain.setValueAtTime(0.0001, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.1 / (i + 1), c.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.7);
          o.connect(g); g.connect(c.destination);
          o.start(); o.stop(c.currentTime + 0.75);
        });
      }
    };
  })();

  var soundBtn = $("soundBtn");
  soundBtn.setAttribute("aria-pressed", Sound.isOn() ? "true" : "false");
  soundBtn.addEventListener("click", function () {
    soundBtn.setAttribute("aria-pressed", Sound.toggle() ? "true" : "false");
  });

  /* ---------- 5. building the corridor ---------- */
  var ROOMS = [
    { key: "about",        sign: "About Me",        sub: "profile",         side: "left"  },
    { key: "education",    sign: "Education",       sub: "academic record", side: "right" },
    { key: "coding",       sign: "Coding Profiles", sub: "live stats",      side: "left"  },
    { key: "skills",       sign: "Technical Skills",sub: "tools & tech",    side: "right" },
    { key: "projects",     sign: "Projects",        sub: "what I built",    side: "left"  },
    { key: "certificates", sign: "Certifications",  sub: "credentials",     side: "right" },
    { key: "contact",      sign: "Contact",         sub: "get in touch",    side: "left"  }
  ];

  var HALF_LEN = 2600;          /* half the corridor length (matches --hall-len) */
  var FIRST_Z = -520;           /* depth of the first door         */
  var GAP_Z = 300;              /* depth between consecutive doors */
  var VIEW_OFFSET = 640;        /* how far ahead a door sits when you arrive */

  ROOMS.forEach(function (r, i) { r.z = FIRST_Z - i * GAP_Z; });

  var MAX_Z = -ROOMS[ROOMS.length - 1].z - VIEW_OFFSET + 120;

  (function buildCorridor() {
    var left = $("wallLeft"), right = $("wallRight"), ceiling = $("ceiling");

    ROOMS.forEach(function (r, i) {
      /* left wall: local +X runs away from the viewer.
         right wall: local +X runs toward the viewer. Mirror it. */
      var localX = (r.side === "left") ? HALF_LEN - r.z : HALF_LEN + r.z;

      var b = document.createElement("button");
      b.className = "hall-door";
      b.dataset.room = r.key;
      b.dataset.index = i;
      b.style.left = (localX - 75) + "px";
      b.setAttribute("aria-label", "Open " + r.sign);
      b.innerHTML =
        '<span class="sign">' + esc(r.sign) + "</span>" +
        '<span class="leaf"><span class="knob"></span></span>' +
        '<span class="door-sub">' + esc(r.sub) + "</span>";

      (r.side === "left" ? left : right).appendChild(b);
    });

    /* ceiling strip lights: local +Y runs away from the viewer */
    for (var z = -150; z > -HALF_LEN; z -= 420) {
      var l = document.createElement("div");
      l.className = "striplight";
      l.style.top = (HALF_LEN - z) + "px";
      ceiling.appendChild(l);
    }
  })();

  /* room menu in the HUD */
  (function buildMenu() {
    var list = $("roomMenuList");
    list.innerHTML = ROOMS.map(function (r, i) {
      return '<button data-index="' + i + '">' + esc(r.sign) + "</button>";
    }).join("");

    $("roomMenuBtn").addEventListener("click", function (e) {
      e.stopPropagation();
      $("roomMenu").classList.toggle("open");
    });
    document.addEventListener("click", function () { $("roomMenu").classList.remove("open"); });

    list.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-index]");
      if (!b) return;
      var i = parseInt(b.dataset.index, 10);
      walkTo(i, function () { openRoom(ROOMS[i].key); });
    });
  })();

  /* ---------- 6. walking ---------- */
  var tunnel = $("tunnel");
  var bar = $("progressBar");
  var z = 0, targetZ = 0, raf = null, lastStep = 0;

  tunnel.style.transition = "none";

  function applyZ() {
    tunnel.style.setProperty("--z", z.toFixed(1) + "px");
    bar.style.width = (clamp(z / MAX_Z, 0, 1) * 100).toFixed(1) + "%";
  }

  function loop() {
    z += (targetZ - z) * 0.11;
    if (Math.abs(targetZ - z) < 0.6) z = targetZ;
    applyZ();

    if (Sound.isOn() && Math.abs(z - lastStep) > 150) { lastStep = z; Sound.step(); }

    raf = (z !== targetZ) ? requestAnimationFrame(loop) : null;
  }

  function nudge(delta) {
    targetZ = clamp(targetZ + delta, 0, MAX_Z);
    if (!raf) raf = requestAnimationFrame(loop);
    hideHint();
  }

  function walkTo(i, done) {
    targetZ = clamp(-ROOMS[i].z - VIEW_OFFSET, 0, MAX_Z);
    if (!raf) raf = requestAnimationFrame(loop);
    hideHint();
    setTimeout(done || function () {}, reduced ? 60 : 620);
  }

  var hintGone = false;
  function hideHint() {
    if (hintGone) return;
    hintGone = true;
    var h = $("walkHint");
    if (h) { h.style.transition = "opacity .5s"; h.style.opacity = "0"; }
  }

  var corridor = $("sceneCorridor");

  corridor.addEventListener("wheel", function (e) {
    e.preventDefault();
    nudge(e.deltaY * 0.9);
  }, { passive: false });

  /* Never swallow keys while someone is typing — this used to eat the
     w/s/a/d in the sign-in form. */
  function isTyping(e) {
    var t = e.target;
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  document.addEventListener("keydown", function (e) {
    if (!corridor.classList.contains("is-active")) return;
    if ($("roomOverlay").classList.contains("open")) return;
    if ($("loginDialog").classList.contains("open")) return;
    if (isTyping(e)) return;

    if (e.key === "ArrowUp") { e.preventDefault(); nudge(180); }
    if (e.key === "ArrowDown") { e.preventDefault(); nudge(-180); }
    if (e.key === "PageDown") { e.preventDefault(); nudge(500); }
    if (e.key === "PageUp") { e.preventDefault(); nudge(-500); }
  });

  (function touchWalk() {
    var startY = null;
    corridor.addEventListener("touchstart", function (e) { startY = e.touches[0].clientY; }, { passive: true });
    corridor.addEventListener("touchmove", function (e) {
      if (startY === null) return;
      var y = e.touches[0].clientY;
      nudge((startY - y) * 2.2);
      startY = y;
    }, { passive: true });
    corridor.addEventListener("touchend", function () { startY = null; });
  })();

  /* --- door clicks ---------------------------------------------------
     A full-size wrapper used to sit over the corridor and swallow every
     click, which is why no door opened. With it gone the browser hit-tests
     the rotated doors correctly, so trust the event target: it is
     pixel-accurate, where guessing from bounding boxes opened the wrong
     room whenever a nearer door overlapped a further one.                */
  corridor.addEventListener("click", function (e) {
    if (e.target.closest(".hud, .room-menu")) return;

    if (e.target.closest(".exit-door")) {
      Sound.creak();
      leaveHouse();
      return;
    }

    var d = e.target.closest(".hall-door");
    if (!d) return;

    var i = parseInt(d.dataset.index, 10);
    Sound.creak();
    d.classList.add("opening");
    walkTo(i, function () {
      d.classList.remove("opening");
      openRoom(d.dataset.room);
    });
  });

  /* door clicks */
  corridor.addEventListener("click", function (e) {
    var d = e.target.closest(".hall-door");
    if (!d) return;
    var i = parseInt(d.dataset.index, 10);

    Sound.creak();
    d.classList.add("opening");
    walkTo(i, function () {
      d.classList.remove("opening");
      openRoom(d.dataset.room);
    });
  });

  /* ---------- entering & leaving ---------- */
  var outside = $("sceneOutside");
  var entering = false;

  function enterHouse() {
    if (entering) return;
    entering = true;
    Sound.knock();
    setTimeout(function () { Sound.creak(); }, 380);

    setTimeout(function () {
      outside.classList.remove("is-active");
      outside.setAttribute("aria-hidden", "true");
      corridor.classList.add("is-active");
      corridor.setAttribute("aria-hidden", "false");
      z = targetZ = 0; applyZ();
      entering = false;
    }, reduced ? 120 : 900);
  }

  $("frontDoor").addEventListener("click", enterHouse);
  $("frontDoor").addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enterHouse(); }
  });
  $("knockBtn").addEventListener("click", enterHouse);

  function leaveHouse() {
    Sound.creak();
    corridor.classList.remove("is-active");
    corridor.setAttribute("aria-hidden", "true");
    outside.classList.add("is-active");
    outside.setAttribute("aria-hidden", "false");
  }

  $("exitHouse").addEventListener("click", leaveHouse);

  /* ---------- 7. rooms ---------- */
  var titles = {};
  ROOMS.forEach(function (r) { titles[r.key] = r.sign; });
  var order = ROOMS.map(function (r) { return r.key; });

  var overlay = $("roomOverlay"), body = $("roomBody");
  var titleEl = $("roomTitle"), kicker = $("roomKicker"), panel = $("roomPanel");
  var current = null, lastFocus = null;

  var build = {};

  build.about = function (d) {
    var a = d.about;
    var paras = a.paras.map(function (p, i) {
      return "<p" + bind("about.paras." + i) + ">" + esc(p) + "</p>";
    }).join("");

    var facts = a.facts.map(function (f, i) {
      return "<li><b" + bind("about.facts." + i + ".label") + ">" + esc(f.label) + "</b>" +
             "<span" + bind("about.facts." + i + ".value") + ">" + esc(f.value) + "</span>" +
             delBtn("del-fact", 'data-i="' + i + '"') + "</li>";
    }).join("");

    return '<div class="grid-2"><div>' +
      '<p class="lead"' + bind("about.lead") + ">" + esc(a.lead) + "</p>" + paras +
      (admin() ? '<button class="add-btn" data-act="add-para">+ paragraph</button>' : "") +
      '<ul class="facts">' + facts + "</ul>" +
      (admin() ? '<button class="add-btn" data-act="add-fact">+ fact</button>' : "") +
      '</div><div class="poster"><div class="poster-frame">' +
      '<img src="assets/me.jpg" alt="' + esc(d.profile.name) + '" class="poster-img" />' +
      '<span class="poster-fallback">photo goes at<br /><code>assets/me.jpg</code></span>' +
      '</div><p class="poster-cap">the resident</p></div></div>';
  };

  build.education = function (d) {
    var m = d.marks;
    var p10 = (m.class10.got / m.class10.total * 100).toFixed(1);
    var p12 = (m.inter.got / m.inter.total * 100).toFixed(1);

    function card(label, path, got, total, pct) {
      return '<div class="score"><span class="score-label">' + esc(label) + "</span>" +
        '<b class="score-val" data-target="' + got + '">0</b>' +
        (admin()
          ? '<span class="score-edit">edit <span' + bind(path + ".got", "number") + ">" + esc(got) +
            "</span> / <span" + bind(path + ".total", "number") + ">" + esc(total) + "</span></span>"
          : '<span class="score-of">out of ' + esc(total) + "</span>") +
        '<div class="bar"><i style="--pct:' + pct + '%"></i></div>' +
        '<span class="score-pct">' + pct + "%</span></div>";
    }

    var cards = '<div class="score-cards">' +
      card("Class 10", "marks.class10", m.class10.got, m.class10.total, p10) +
      card("Intermediate", "marks.inter", m.inter.got, m.inter.total, p12) +
      '<div class="score highlight"><span class="score-label">JEE percentile</span>' +
      '<b class="score-val" data-target="' + m.jee.percentile + '" data-decimals="1">0</b>' +
      (admin()
        ? '<span class="score-edit">edit <span' + bind("marks.jee.percentile", "number") + ">" + esc(m.jee.percentile) + "</span></span>"
        : '<span class="score-of">percentile</span>') +
      '<div class="bar"><i style="--pct:' + m.jee.percentile + '%"></i></div>' +
      '<span class="score-pct">' + esc(m.jee.percentile) + "</span></div></div>";

    var items = d.education.map(function (e, i) {
      return '<div class="tl-item"><span class="dot"></span>' +
        '<span class="tl-date"' + bind("education." + i + ".date") + ">" + esc(e.date) + "</span>" +
        "<h3" + bind("education." + i + ".title") + ">" + esc(e.title) + "</h3>" +
        '<p class="tl-org"' + bind("education." + i + ".org") + ">" + esc(e.org) + "</p>" +
        "<p" + bind("education." + i + ".text") + ">" + esc(e.text) + "</p>" +
        delBtn("del-edu", 'data-i="' + i + '"') + "</div>";
    }).join("");

    return '<p class="lead">The shelf where the report cards live.</p>' + cards +
      '<div class="timeline">' + items + "</div>" +
      (admin() ? '<button class="add-btn" data-act="add-edu">+ add an entry</button>' : "");
  };

  var PLATFORMS = [
    { key: "leetcode",   logo: "LC", name: "LeetCode",   sub: "daily grind",  url: "https://leetcode.com/u/{h}/" },
    { key: "codechef",   logo: "CC", name: "CodeChef",   sub: "contests",     url: "https://www.codechef.com/users/{h}" },
    { key: "hackerrank", logo: "HR", name: "HackerRank", sub: "badges",       url: "https://www.hackerrank.com/profile/{h}" },
    { key: "codeforces", logo: "CF", name: "Codeforces", sub: "rated rounds", url: "https://codeforces.com/profile/{h}" }
  ];

  var arenaView = null;   /* null = the lobby, otherwise a platform key */

  function platformMeta(key) {
    for (var i = 0; i < PLATFORMS.length; i++) if (PLATFORMS[i].key === key) return PLATFORMS[i];
    return null;
  }

  function fileWarn() {
    return window.HouseStats.isFileProtocol()
      ? '<p class="stats-warn">Live numbers and heat maps are blocked while the page is opened straight from your computer. Put it online and they start working.</p>'
      : "";
  }

  build.coding = function (d) {
    if (arenaView) return arenaRoom(d, arenaView);

    var doors = PLATFORMS.map(function (p) {
      return '<button class="arena-door" data-act="arena-open" data-p="' + p.key + '">' +
        '<span class="arena-logo">' + p.logo + "</span>" +
        '<span class="arena-plate">' + esc(p.name) + "</span>" +
        '<span class="arena-sub" id="lob-' + p.key + '">' + esc(p.sub) + "</span>" +
        '<span class="arena-knob"></span></button>';
    }).join("");

    return '<p class="lead">Four doors, four judges. Step into any of them.</p>' +
      '<div class="stats-head"><span id="statsAgo">checking…</span>' +
      '<button class="add-btn" data-act="refresh-stats">↻ refresh all</button></div>' +
      fileWarn() + '<div class="arena-doors">' + doors + "</div>";
  };

  function arenaRoom(d, key) {
    var p = platformMeta(key);
    var h = d.handles[key];

    var stats = window.HouseStats.hasStats(key)
      ? '<div class="big-stats" id="big-' + key + '"><div class="big-stat"><b>…</b><span>loading</span></div></div>'
      : '<p class="stats-warn">HackerRank has no public API, so there is nothing to pull automatically. The link below goes to the real profile.</p>';

    var heat = window.HouseStats.hasCalendar(key)
      ? '<div class="heat" id="heat-' + key + '"><p class="heat-empty">drawing the heat map…</p></div>'
      : "";

    return '<button class="back-to-arena" data-act="arena-back">&larr; back to the arena</button>' +
      '<div class="pf-headline"><span class="pf-logo">' + p.logo + "</span>" +
      "<div><h3>" + esc(p.name) + "</h3>" +
      '<span class="pf-handle"' + bind("handles." + key) + ">" + esc(h) + "</span></div></div>" +
      '<div class="stats-head"><span id="statsAgo">checking…</span>' +
      '<button class="add-btn" data-act="refresh-stats">↻ refresh</button></div>' +
      fileWarn() + stats + heat +
      '<p style="margin-top:1rem"><a class="pf-go" href="' +
      p.url.replace("{h}", encodeURIComponent(h)) +
      '" target="_blank" rel="noopener">open the real profile ↗</a></p>';
  }

  build.skills = function (d) {
    var groups = d.skills.map(function (g, gi) {
      var tags = g.items.map(function (s, si) {
        return "<span>" + esc(s) +
          (admin() ? '<button class="tag-x" data-act="del-skill" data-g="' + gi + '" data-i="' + si + '">&times;</button>' : "") +
          "</span>";
      }).join("");

      return '<div class="card"><h3' + bind("skills." + gi + ".group") + ">" + esc(g.group) + "</h3>" +
        delBtn("del-group", 'data-g="' + gi + '"') +
        '<div class="tags">' + tags + "</div>" +
        (admin()
          ? '<div class="add-row"><input class="mini" data-input="skill-' + gi + '" placeholder="new skill" />' +
            '<button class="add-btn" data-act="add-skill" data-g="' + gi + '">add</button></div>'
          : "") + "</div>";
    }).join("");

    return '<p class="lead">The tools hanging on the pegboard.</p>' +
      '<div class="skill-cards">' + groups + "</div>" +
      (admin() ? '<button class="add-btn" data-act="add-group">+ add a group</button>' : "");
  };

  build.projects = function (d) {
    var items = d.projects.map(function (p, i) {
      return '<article class="project"><div class="project-top"><span class="folder">📁</span>' +
        '<span class="project-links">' +
        (p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">open project</a>' : "") +
        delBtn("del-project", 'data-i="' + i + '"') + "</span></div>" +
        "<h3" + bind("projects." + i + ".name") + ">" + esc(p.name) + "</h3>" +
        "<p" + bind("projects." + i + ".desc") + ">" + esc(p.desc) + "</p>" +
        (admin()
          ? '<p class="mini-label">tags <span' + bind("projects." + i + ".tags", "list") + ">" + esc(p.tags.join(", ")) + "</span></p>" +
            '<p class="mini-label">link <span' + bind("projects." + i + ".link") + ">" + esc(p.link || "—") + "</span></p>"
          : '<div class="tags">' + p.tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>") +
        "</article>";
    }).join("");

    return '<p class="lead">Framed on the wall: things I actually finished.</p>' +
      '<div class="projects">' + items + "</div>" +
      (admin() ? '<button class="add-btn" data-act="add-project">+ add a project</button>' : "");
  };

  build.certificates = function (d) {
    var items = d.certificates.map(function (c, i) {
      var inner = '<span class="cert-badge"' + bind("certificates." + i + ".icon") + ">" + esc(c.icon) + "</span>" +
        "<b" + bind("certificates." + i + ".title") + ">" + esc(c.title) + "</b>" +
        "<span" + bind("certificates." + i + ".note") + ">" + esc(c.note) + "</span>" +
        (admin()
          ? '<span class="mini-label">file <span' + bind("certificates." + i + ".file") + ">" + esc(c.file) + "</span></span>" +
            delBtn("del-cert", 'data-i="' + i + '"')
          : "");
      return admin()
        ? '<div class="cert">' + inner + "</div>"
        : '<a class="cert" href="' + esc(c.file) + '" target="_blank" rel="noopener">' + inner + "</a>";
    }).join("");

    return '<p class="lead">The shelf with the trophies on it.' +
      (admin() ? " Drop files into <code>assets/certificates/</code> first." : " Click one to open it.") + "</p>" +
      '<div class="cert-grid">' + items + "</div>" +
      (admin() ? '<button class="add-btn" data-act="add-cert">+ add a certificate</button>' : "");
  };

  build.contact = function (d) {
    var p = d.profile;
    function line(icon, label, value, href, path) {
      var inner = '<span class="cl-ico">' + icon + "</span><span><b>" + esc(label) + "</b><br />" +
        "<span" + bind(path) + ">" + esc(value) + "</span></span>";
      return admin()
        ? '<div class="contact-line">' + inner + "</div>"
        : '<a class="contact-line" href="' + esc(href) + '" target="_blank" rel="noopener">' + inner + "</a>";
    }

    return '<p class="lead">Out on the balcony, where the wifi still reaches.</p><div class="contact-wrap">' +
      line("✉️", "Email", p.email, "mailto:" + p.email, "profile.email") +
      line("🐙", "GitHub", p.github, "https://github.com/" + p.github, "profile.github") +
      line("💼", "LinkedIn", p.linkedin, "https://linkedin.com/in/" + p.linkedin, "profile.linkedin") +
      line("🧩", "LeetCode", d.handles.leetcode, "https://leetcode.com/u/" + d.handles.leetcode + "/", "handles.leetcode") +
      '</div><p class="sign-off">Thanks for visiting. Pull the door shut on your way out.</p>';
  };

  /* ---------- 8. live stats & heat maps ---------- */
  function heatmapHTML(cal, name) {
    var MS = 86400000;
    var today = new Date(); today.setHours(0, 0, 0, 0);

    var start = new Date(today.getTime() - 363 * MS);
    start = new Date(start.getTime() - start.getDay() * MS);   /* back to Sunday */

    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var cells = [], labels = [], lastMonth = -1;
    var weeks = Math.ceil((today - start) / MS / 7) + 1;

    for (var w = 0; w < weeks; w++) {
      var weekStart = new Date(start.getTime() + w * 7 * MS);
      var m = weekStart.getMonth();
      labels.push('<span>' + (m !== lastMonth && weekStart.getDate() <= 7 ? months[m] : "") + "</span>");
      if (m !== lastMonth && weekStart.getDate() <= 7) lastMonth = m;

      for (var dd = 0; dd < 7; dd++) {
        var day = new Date(weekStart.getTime() + dd * MS);
        if (day > today) { cells.push('<i class="heat-cell" style="visibility:hidden"></i>'); continue; }

        var mm = day.getMonth() + 1, ddn = day.getDate();
        var key = day.getFullYear() + "-" + (mm < 10 ? "0" : "") + mm + "-" + (ddn < 10 ? "0" : "") + ddn;
        var n = cal.days[key] || 0;
        var lvl = n === 0 ? "" : (n < 3 ? " l1" : n < 6 ? " l2" : n < 10 ? " l3" : " l4");
        var isToday = day.getTime() === today.getTime() ? " today" : "";
        cells.push('<i class="heat-cell' + lvl + isToday + '" title="' + key + ": " + n + ' submissions"></i>');
      }
    }

    var extra = (cal.streak ? cal.streak + " day streak · " : "") + (cal.activeDays ? cal.activeDays + " active days · " : "");
    return '<div class="heat-head"><b>' + esc(name || "submission") + ' heat map</b>' +
      '<span class="heat-total">' + extra + cal.total + " submissions</span></div>" +
      '<div class="heat-scroll"><div class="heat-inner">' +
      '<div class="heat-months">' + labels.join("") + "</div>" +
      '<div class="heat-grid">' + cells.join("") + "</div></div></div>" +
      '<div class="heat-legend">less <i class="heat-cell"></i><i class="heat-cell l1"></i>' +
      '<i class="heat-cell l2"></i><i class="heat-cell l3"></i><i class="heat-cell l4"></i> more</div>';
  }

  function loadStats(force) {
    var d = data();
    var ago = $("statsAgo");

    function stamp(at) { if (ago) ago.textContent = "updated " + window.HouseStats.ago(at); }

    /* lobby: a one-line teaser under each door */
    PLATFORMS.forEach(function (p) {
      var lob = $("lob-" + p.key);
      if (!lob || !window.HouseStats.hasStats(p.key)) return;

      window.HouseStats.fetchOne(p.key, d.handles[p.key], force).then(function (res) {
        var top = res.rows[0];
        lob.textContent = top ? (top.label + " " + top.value) : p.sub;
        stamp(res.at);
      }).catch(function () { lob.textContent = "offline"; });
    });

    /* inside one platform room: the full numbers */
    if (arenaView && window.HouseStats.hasStats(arenaView)) {
      var box = $("big-" + arenaView);
      if (box) {
        window.HouseStats.fetchOne(arenaView, d.handles[arenaView], force).then(function (res) {
          box.innerHTML = res.rows.map(function (r) {
            return '<div class="big-stat"><b>' + esc(r.value) + "</b><span>" + esc(r.label) + "</span></div>";
          }).join("") + (res.stale ? '<div class="big-stat"><b>·</b><span>cached</span></div>' : "");
          stamp(res.at);
        }).catch(function () {
          box.innerHTML = '<p class="heat-empty">the service did not answer. Try refresh in a minute.</p>';
        });
      }
    }

    /* heat maps */
    PLATFORMS.forEach(function (p) {
      var hbox = $("heat-" + p.key);
      if (!hbox || !window.HouseStats.hasCalendar(p.key)) return;

      window.HouseStats.fetchCalendar(p.key, d.handles[p.key], force).then(function (res) {
        hbox.innerHTML = heatmapHTML(res.cal, p.name);
      }).catch(function (e) {
        hbox.innerHTML = '<p class="heat-empty">' + (/rate-limited/.test(String(e)) ? "the free LeetCode mirror is rate-limiting right now — it clears within the hour." : "heat map unavailable — the service did not answer.") + '</p>';
      });
    });
  }

  /* ---------- render / open / close ---------- */
  function renderRoom(key) {
    current = key;
    titleEl.textContent = titles[key] || "Room";
    kicker.textContent = "room " + (order.indexOf(key) + 1) + " of " + order.length;
    body.innerHTML = build[key](data());
    panel.scrollTop = 0;

    watchPhoto(body.querySelector(".poster-img"));
    animateNumbers(body);
    fillBars(body);
    if (key === "coding") loadStats(false);
  }

  function openRoom(key) {
    lastFocus = document.activeElement;
    renderRoom(key);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    Sound.chime();
    $("closeRoom").focus();
  }

  function closeRoom() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    body.innerHTML = "";
    current = null;
    arenaView = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function step(dir) {
    if (!current) return;
    var i = order.indexOf(current);
    var next = (i + dir + order.length) % order.length;
    renderRoom(order[next]);
    walkTo(next);
    Sound.chime();
  }

  $("closeRoom").addEventListener("click", closeRoom);
  $("prevRoom").addEventListener("click", function () { step(-1); });
  $("nextRoom").addEventListener("click", function () { step(1); });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeRoom(); });

  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("open")) return;
    if (document.activeElement && document.activeElement.isContentEditable) {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }
    if (e.key === "Escape") { closeRoom(); return; }
    if (e.key === "ArrowLeft") { step(-1); return; }
    if (e.key === "ArrowRight") { step(1); return; }

    if (e.key === "Tab") {
      var f = overlay.querySelectorAll("button, a[href], input, [contenteditable='true']");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* saving inline edits */
  body.addEventListener("focusout", function (e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.bind) return;

    var raw = el.textContent.trim();
    var val = raw;
    if (el.dataset.type === "number") val = parseFloat(raw) || 0;
    if (el.dataset.type === "list") val = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    if (/\.link$/.test(el.dataset.bind) && (raw === "—" || raw === "")) val = "";

    setPath(data(), el.dataset.bind, val);
    window.House.save();
  });

  /* add / remove */
  body.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;

    var d = data(), act = btn.dataset.act;
    var gi = parseInt(btn.dataset.g, 10), i = parseInt(btn.dataset.i, 10);

    if (act === "refresh-stats") { loadStats(true); return; }
    if (act === "arena-open") { arenaView = btn.dataset.p; Sound.creak(); renderRoom("coding"); return; }
    if (act === "arena-back") { arenaView = null; renderRoom("coding"); return; }

    if (act === "add-skill") {
      var input = body.querySelector('[data-input="skill-' + gi + '"]');
      var v = input && input.value.trim();
      if (!v) return;
      d.skills[gi].items.push(v);
    }
    else if (act === "del-skill")   { d.skills[gi].items.splice(i, 1); }
    else if (act === "add-group")   { d.skills.push({ group: "New group", items: [] }); }
    else if (act === "del-group")   { if (!confirm("Remove this whole group?")) return; d.skills.splice(gi, 1); }
    else if (act === "add-project") { d.projects.push({ name: "New project", desc: "What it does.", tags: ["tag"], link: "" }); }
    else if (act === "del-project") { if (!confirm("Remove this project?")) return; d.projects.splice(i, 1); }
    else if (act === "add-cert")    { d.certificates.push({ icon: "📜", title: "New certificate", note: "What it was for", file: "assets/certificates/" }); }
    else if (act === "del-cert")    { if (!confirm("Remove this certificate?")) return; d.certificates.splice(i, 1); }
    else if (act === "add-fact")    { d.about.facts.push({ label: "Label", value: "Value" }); }
    else if (act === "del-fact")    { d.about.facts.splice(i, 1); }
    else if (act === "add-para")    { d.about.paras.push("A new paragraph about me."); }
    else if (act === "add-edu")     { d.education.push({ date: "year", title: "Qualification", org: "Institution", text: "Details." }); }
    else if (act === "del-edu")     { if (!confirm("Remove this entry?")) return; d.education.splice(i, 1); }
    else return;

    window.House.save();
    renderRoom(current);
  });

  if (window.HouseAdmin) {
    window.HouseAdmin.onChange(function () { if (current) renderRoom(current); });
  }

  /* ---------- 9. numbers & bars ---------- */
  function animateNumbers(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll("[data-target]"), function (el) {
      var target = parseFloat(el.dataset.target);
      var decimals = parseInt(el.dataset.decimals || "0", 10);
      if (reduced) { el.textContent = target.toFixed(decimals); return; }

      var start = performance.now();
      (function frame(now) {
        var t = Math.min((now - start) / 1100, 1);
        el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals);
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    });
  }

  function fillBars(scope) {
    var bars = scope.querySelectorAll(".bar");
    setTimeout(function () {
      Array.prototype.forEach.call(bars, function (b) { b.classList.add("fill"); });
    }, 120);
  }
})();
