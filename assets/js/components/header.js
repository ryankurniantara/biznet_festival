// Hide Nav when it mobile view

document.getElementById("header").innerHTML = `
  <div role="banner">
    <div class="header__inner">
      <a class="logo" href="index.html" aria-label="Home">
        <img src="assets/img/logo-bfest.png" alt="Festival Logo" />
      </a>

      <nav aria-label="Utama" class="nav">
        <ul class="nav__list" id="nav-list">
          <li><a id="nav-home"    class="nav__link" href="index.html">Home</a></li>
          <li><a id="nav-event"   class="nav__link" href="event.html">My Events</a></li>
          <li><a id="nav-profile" class="nav__link" href="profile.html">Profile</a></li>
          <li><a id="nav-logout"  class="nav__link" href="#">Logout</a></li>
        </ul>
      </nav>

       <!-- TOMBOL untuk mobile -->
      <button id="menu-toggle" class="menu-toggle" aria-label="Buka menu" aria-expanded="false">
        <span></span>
      </button>
    </div>
  </div>
`;

// tandai menu aktif berdasarkan nama file
(function setActiveNav() {
  var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var map = {
    "index.html": "nav-home",
    "event.html": "nav-event",
    "about.html": "nav-about",
    "profile.html": "nav-profile",
  };
  for (var key in map) {
    var el = document.getElementById(map[key]);
    if (!el) continue;
    el.className = "nav__link" + (key === path ? " is-active" : "");
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // === Logout ===
  const logoutLink = document.getElementById("nav-logout");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Logging out...");
      logoutLink.style.pointerEvents = "none";
      logoutLink.textContent = "Logging out...";
      authLogout();
    });
  }

  // === Mobile menu toggle ===
  (function () {
    var btn = document.getElementById("menu-toggle");
    var list = document.getElementById("nav-list");
    if (!btn || !list) return;

    function closeMenu() {
      list.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault(); // cegah default focus/submit di mobile
      var isOpen = list.classList.contains("is-open");
      list.classList.toggle("is-open", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
    });

    // Tutup menu setelah memilih item
    list.querySelectorAll("a.nav__link").forEach((link) => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });
  })();

  // === Cegah reload jika klik link ke halaman yang sama (Home, Event, Profile, bahkan logo) ===
  (function preventSamePageReload() {
    // helper untuk normalisasi path target
    function normalizePath(p) {
      if (!p) return "index.html";
      p = p.split("?")[0].split("#")[0]; // buang query & hash
      if (p.endsWith("/")) p += "index.html";
      const last = p.split("/").pop();
      return (last || "index.html").toLowerCase();
    }

    const current = normalizePath(location.pathname);

    // semua link nav + logo
    const links = document.querySelectorAll("a.nav__link, a.logo");
    links.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = normalizePath(href);

      a.addEventListener("click", (e) => {
        if (target === current) {
          // sudah di halaman yang sama → jangan reload
          e.preventDefault();

          // pastikan state aktif tetap nyala
          document
            .querySelectorAll("a.nav__link.is-active")
            .forEach((el) => el.classList.remove("is-active"));
          if (a.classList.contains("nav__link")) {
            a.classList.add("is-active");
          }
          // optionally fokus ke top
          // window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  })();
});
