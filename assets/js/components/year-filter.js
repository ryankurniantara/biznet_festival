(function (global) {
  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function mount(selectorOrEl, opts) {
    var el =
      typeof selectorOrEl === "string"
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
    if (!el) return null;

    var min = Number.isInteger(opts?.minYear) ? opts.minYear : 2000;
    var max = Number.isInteger(opts?.maxYear) ? opts.maxYear : 2100;
    var year = Number.isInteger(opts?.initialYear)
      ? opts.initialYear
      : new Date().getFullYear();
    year = clamp(year, min, max);

    // HTML sederhana
    el.innerHTML = [
      "<style>",
      ".yf{display:inline-flex;align-items:center;gap:.5rem}",
      ".yf__box{display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1rem;border:1px solid #e5e7eb;border-radius:.75rem;background:#fafafa}",
      ".yf__input{width:4.5rem;border:none;background:transparent;font:600 1.2rem Poppins,system-ui,sans-serif}",
      ".yf__input:focus{outline:none}",
      ".yf__icon{width:1rem;height:1rem;opacity:.7}",
      ".yf__hint{font-size:.75rem;color:#6b7280}",
      "</style>",
      '<div class="yf" aria-label="Filter tahun">',
      '<div class="yf__box">',
      '<input class="yf__input" type="number" min="' +
        min +
        '" max="' +
        max +
        '" value="' +
        year +
        '" aria-label="Tahun"/>',
      '<span class="yf__icon">📅</span>',
      "</div>",
      '<span class="yf__hint">' + min + "–" + max + "</span>",
      "</div>",
    ].join("");

    var input = el.querySelector(".yf__input");

    function commit(v) {
      var next = clamp(parseInt(v, 10), min, max);
      if (!Number.isInteger(next) || next === year) return;
      var prev = year;
      year = next;
      input.value = String(next);
      // trigger event sederhana
      el.dispatchEvent(
        new CustomEvent("yearchange", { detail: { year: next, prev: prev } })
      );
      if (typeof opts?.onChange === "function") opts.onChange(next, prev);
    }

    input.addEventListener("change", function (e) {
      commit(e.target.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        commit(input.value);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        commit((parseInt(input.value, 10) || year) + 1);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        commit((parseInt(input.value, 10) || year) - 1);
      }
    });

    return {
      getYear: function () {
        return year;
      },
      setYear: function (y) {
        commit(y);
      },
      setBounds: function (mi, ma) {
        if (Number.isInteger(mi) && Number.isInteger(ma) && mi <= ma) {
          min = mi;
          max = ma;
          input.min = mi;
          input.max = ma;
          el.querySelector(".yf__hint").textContent = mi + "–" + ma;
          commit(year);
        }
      },
      el: el,
    };
  }

  // expose global
  global.YearFilter = { mount: mount };
})(window);
