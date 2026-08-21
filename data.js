/* =====================================================================
   data.js — everything editable about the house lives here.

   The DEFAULTS below are what a fresh visitor sees. When you sign in as
   admin and change something, your version is saved in this browser's
   localStorage and used instead.

   To make your edits permanent for EVERYONE: sign in, hit "Export",
   and paste the downloaded JSON over the DEFAULTS object below, then
   commit the file.
   ===================================================================== */
window.House = (function () {
  "use strict";

  var KEY = "houseData.v1";

  var DEFAULTS = {
    profile: {
      name: "K. V. Akhilesh",
      tagline: "B.Tech student, competitive programmer, builder of things",
      email: "kamepalliakhilesh@gmail.com",
      github: "yourusername",
      linkedin: "yourusername",
      college: "Aditya University, Surampalem"
    },

    handles: {
      leetcode:   "k_v_akhilesh",
      codechef:   "k_v_akhilesh",
      hackerrank: "kamepalliakhile1",
      codeforces: "kamepalliakhilesh"
    },

    marks: {
      class10:  { got: 561, total: 600 },
      inter:    { got: 962, total: 1000 },
      jee:      { percentile: 86.6 }
    },

    about: {
      lead: "Hi, I'm Akhilesh — a second-year B.Tech student at Aditya University who spends most of his day either solving problems on a judge or building something on the web.",
      paras: [
        "I got hooked on competitive programming in my first year and have kept at it since — LeetCode most days, CodeChef contests when they come round. I like problems that have a clean answer hiding somewhere underneath a messy question.",
        "Alongside the coursework I train at Technical Hub, and I took part in YESSIST 12, an international hackathon, where building something end to end under a deadline taught me more than a semester of theory.",
        "Right now I'm looking for an internship where I can ship real features and learn from people who have done it before."
      ],
      facts: [
        { label: "Degree",   value: "B.Tech, 2nd year" },
        { label: "College",  value: "Aditya University, Surampalem" },
        { label: "Training", value: "Trainee at Technical Hub" },
        { label: "Focus",    value: "DSA, competitive programming, web development" },
        { label: "Status",   value: "Open to internships" }
      ]
    },

    education: [
      {
        date: "now — 2nd year",
        title: "B.Tech — Computer Science",
        org: "Aditya University, Surampalem",
        text: "Coursework in data structures, DBMS, operating systems and computer networks, alongside daily problem solving."
      },
      {
        date: "alongside college",
        title: "Trainee — Technical Hub",
        org: "Technical Hub",
        text: "Hands-on training in software development and problem solving."
      },
      {
        date: "hackathon",
        title: "YESSIST 12 — international hackathon",
        org: "Participant",
        text: "Built and pitched a project end to end under a deadline, with a team."
      },
      {
        date: "Intermediate",
        title: "962 / 1000 — 96.2%",
        org: "Your Junior College · MPC",
        text: "Mathematics, Physics and Chemistry, alongside JEE preparation."
      },
      {
        date: "Class 10",
        title: "561 / 600 — 93.5%",
        org: "Your School",
        text: "Where the first lines of code happened."
      }
    ],

    skills: [
      { group: "Languages",    items: ["C", "C++", "Java", "Python", "JavaScript", "SQL"] },
      { group: "Frontend",     items: ["HTML5", "CSS3", "React", "Bootstrap"] },
      { group: "Backend & data", items: ["Node.js", "Express", "MySQL", "MongoDB"] },
      { group: "Core CS",      items: ["DSA", "OOP", "DBMS", "Operating Systems", "Networks"] },
      { group: "Tools",        items: ["Git", "GitHub", "VS Code", "Excel", "Power Platform"] },
      { group: "Learning next", items: ["TypeScript", "React Native", "System Design"] }
    ],

    projects: [
      {
        name: "Medicare",
        desc: "A health web app built to make scanning and understanding medical reports simple. Live and usable — open it and try it.",
        tags: ["Web app", "Health"],
        link: "https://pulse-scan-friend.lovable.app/"
      },
      {
        name: "Your next project",
        desc: "Sign in as owner and use + add a project to fill this in — name, one or two lines, tags and a link.",
        tags: ["placeholder"],
        link: ""
      }
    ],

    certificates: [
      { icon: "🥇", title: "LeetCode 50 Days Badge",         note: "50 days of consistent problem solving", file: "assets/certificates/leetcode-50-days.png" },
      { icon: "🏅", title: "CodeChef Badge",                 note: "Problem solving milestone",             file: "assets/certificates/codechef-badge.png" },
      { icon: "📜", title: "CodeChef 500 Difficulty Rating", note: "Certificate of achievement",            file: "assets/certificates/codechef-500-rating.pdf" },
      { icon: "📊", title: "Microsoft Excel 2019 Associate", note: "Microsoft Office Specialist",           file: "assets/certificates/excel-2019-associate.pdf" },
      { icon: "⚡", title: "Power Platform Fundamentals",    note: "Microsoft certification",               file: "assets/certificates/power-platform-fundamentals.pdf" },
      { icon: "🎓", title: "Coursera Certificate",           note: "Online coursework",                     file: "assets/certificates/coursera.pdf" }
    ]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = (function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULTS);
      var saved = JSON.parse(raw);
      var base = clone(DEFAULTS);
      for (var k in saved) {
        if (Object.prototype.hasOwnProperty.call(saved, k)) base[k] = saved[k];
      }
      return base;
    } catch (e) {
      return clone(DEFAULTS);
    }
  })();

  var listeners = [];

  return {
    get: function () { return state; },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      listeners.forEach(function (fn) { fn(state); });
    },

    onChange: function (fn) { listeners.push(fn); },

    reset: function () {
      state = clone(DEFAULTS);
      try { localStorage.removeItem(KEY); } catch (e) {}
      listeners.forEach(function (fn) { fn(state); });
    },

    exportJSON: function () { return JSON.stringify(state, null, 2); },

    importJSON: function (text) {
      var incoming = JSON.parse(text);
      var base = clone(DEFAULTS);
      for (var k in incoming) {
        if (Object.prototype.hasOwnProperty.call(incoming, k)) base[k] = incoming[k];
      }
      state = base;
      this.save();
    }
  };
})();
