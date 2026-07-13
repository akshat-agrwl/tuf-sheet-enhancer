// TUF SDE Sheet Enhancer
// - Injects "Pattern" + "Companies" + "Solution" columns into the problem tables
// - Hides the "Plus" and "Resource Plus" columns
// - Adds a nested "Pattern" dropdown (DS/algo family → pattern) and a flat
//   "Company" dropdown (sorted by problem count) to the toolbar
// - Selecting a pattern or company auto-expands all sections, shows only
//   matching problems, and hides sections with no matches; clearing restores
//   them. Pattern and company filters combine (AND).
// - The Solution icon opens a modal with the optimal approach (like Notes).
//
// The problem dataset (TUF_DATA / TUF_ALIASES / TUF_FAMILY_ORDER) lives in
// data.js and the company tags (TUF_COMPANIES) in companies.js, both loaded
// by the manifest before this file.

(() => {
  "use strict";

  const TAG_COUNTS = {};
  Object.values(TUF_DATA).forEach((d) => d.t.forEach((t) => { TAG_COUNTS[t] = (TAG_COUNTS[t] || 0) + 1; }));

  // Nested filter: DS/algo family → patterns of its problems, derived from the dataset.
  const CATEGORIES = {};
  TUF_FAMILY_ORDER.forEach((f) => { CATEGORIES[f] = new Set(); });
  Object.values(TUF_DATA).forEach((d) => { if (CATEGORIES[d.cat]) d.t.forEach((t) => CATEGORIES[d.cat].add(t)); });
  Object.keys(CATEGORIES).forEach((f) => {
    if (!CATEGORIES[f].size) delete CATEGORIES[f];
    else CATEGORIES[f] = [...CATEGORIES[f]].sort();
  });

  // Company filter: companies of all problems, most-asked first.
  const CO_COUNTS = {};
  if (typeof TUF_COMPANIES !== "undefined") {
    Object.values(TUF_COMPANIES).forEach((list) =>
      list.forEach((c) => { CO_COUNTS[c] = (CO_COUNTS[c] || 0) + 1; })
    );
  }
  const CO_ORDER = Object.keys(CO_COUNTS).sort(
    (a, b) => CO_COUNTS[b] - CO_COUNTS[a] || a.localeCompare(b)
  );

  const activeTags = new Set();
  const activeCos = new Set();
  const autoExpanded = new Set(); // section titles we expanded for a filter
  const openCats = new Set(Object.keys(CATEGORIES).length === 1 ? Object.keys(CATEGORIES) : []);
  const filterCount = () => activeTags.size + activeCos.size;

  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const dataForTitle = (title) => {
    const k = norm(title);
    return TUF_DATA[k] || TUF_DATA[TUF_ALIASES[k]] || null;
  };
  const companiesForTitle = (title) => {
    if (typeof TUF_COMPANIES === "undefined") return null;
    const k = norm(title);
    return TUF_COMPANIES[k] || TUF_COMPANIES[TUF_ALIASES[k]] || null;
  };

  function isSheetTable(table) {
    const head = table.tHead && table.tHead.textContent;
    return !!head && head.includes("Problem") && head.includes("Difficulty");
  }

  // ---------- section expand / collapse ----------

  const sectionTitleOf = (btn) => {
    const t = btn.querySelector(".tuf-accordion-title");
    return (t ? t.textContent : btn.textContent).trim();
  };

  function expandAllSections() {
    document
      .querySelectorAll('button[data-slot="accordion-trigger"][data-state="closed"]')
      .forEach((btn) => {
        autoExpanded.add(sectionTitleOf(btn));
        btn.click();
      });
  }

  function restoreSections() {
    if (autoExpanded.size) {
      document
        .querySelectorAll('button[data-slot="accordion-trigger"][data-state="open"]')
        .forEach((btn) => {
          if (autoExpanded.has(sectionTitleOf(btn))) btn.click();
        });
      autoExpanded.clear();
    }
    document
      .querySelectorAll(".tufp-sec-hidden")
      .forEach((el) => el.classList.remove("tufp-sec-hidden"));
  }

  // While filtering, hide whole sections that have no matching problems.
  function updateSectionVisibility() {
    const filtering = filterCount() > 0;
    document.querySelectorAll('[data-slot="accordion-item"]').forEach((item) => {
      if (!filtering) {
        item.classList.remove("tufp-sec-hidden");
        return;
      }
      const hasMatch = [...item.querySelectorAll("tbody tr")].some(
        (r) => r.dataset.tufpTags && !r.classList.contains("tufp-row-hidden")
      );
      item.classList.toggle("tufp-sec-hidden", !hasMatch);
    });
  }

  // ---------- shared filter logic ----------

  function afterFilterChange(wasActive) {
    if (!wasActive && filterCount()) expandAllSections();
    if (!filterCount()) restoreSections();
    refreshTagStates();
    applyFilter();
  }

  function toggleTag(tag) {
    const wasActive = filterCount() > 0;
    if (activeTags.has(tag)) activeTags.delete(tag);
    else activeTags.add(tag);
    afterFilterChange(wasActive);
  }

  function toggleCo(name) {
    const wasActive = filterCount() > 0;
    if (activeCos.has(name)) activeCos.delete(name);
    else activeCos.add(name);
    afterFilterChange(wasActive);
  }

  function clearTags() {
    activeTags.clear();
    afterFilterChange(true);
  }

  function clearCos() {
    activeCos.clear();
    afterFilterChange(true);
  }

  function clearAllFilters() {
    activeTags.clear();
    activeCos.clear();
    afterFilterChange(true);
  }

  function refreshTagStates() {
    document.querySelectorAll(".tufp-tag").forEach((b) => {
      b.classList.toggle("tufp-on", activeTags.has(b.textContent));
    });
    document.querySelectorAll(".tufp-co-btn").forEach((b) => {
      b.classList.toggle("tufp-co-on", activeCos.has(b.textContent));
    });
    renderDropdownList();
    renderCompanyList();
    const label = document.querySelector(".tufp-dd-pattern .tufp-dd-label");
    if (label) {
      label.textContent = activeTags.size ? `Pattern (${activeTags.size})` : "Pattern";
    }
    const coLabel = document.querySelector(".tufp-dd-company .tufp-dd-label");
    if (coLabel) {
      coLabel.textContent = activeCos.size ? `Company (${activeCos.size})` : "Company";
    }
  }

  function applyFilter() {
    const tags = [...activeTags];
    const cos = [...activeCos];
    document.querySelectorAll("table").forEach((table) => {
      if (!isSheetTable(table)) return;
      for (const row of table.tBodies[0] ? table.tBodies[0].rows : []) {
        if (!tags.length && !cos.length) {
          row.classList.remove("tufp-row-hidden");
          continue;
        }
        const rowTags = (row.dataset.tufpTags || "").split("|");
        const rowCos = (row.dataset.tufpCos || "").split("|");
        const match =
          tags.every((t) => rowTags.includes(t)) && cos.every((c) => rowCos.includes(c));
        row.classList.toggle("tufp-row-hidden", !match);
      }
    });
    updateSectionVisibility();
    renderBar();
  }

  function makeTag(tag) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tufp-tag" + (activeTags.has(tag) ? " tufp-on" : "");
    b.textContent = tag;
    b.title = "Filter by " + tag;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTag(tag);
    });
    return b;
  }

  // Non-clickable tag chip (used in the solution modal).
  function makeStaticTag(tag) {
    const s = document.createElement("span");
    s.className = "tufp-tag tufp-static";
    s.textContent = tag;
    return s;
  }

  // Clickable company chip (used in the table; filters like pattern tags).
  function makeCompanyTag(name) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tufp-co tufp-co-btn" + (activeCos.has(name) ? " tufp-co-on" : "");
    b.textContent = name;
    b.title = "Filter by " + name;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCo(name);
    });
    return b;
  }

  // Companies cell content: top 3 chips + a "+N" toggle that expands/collapses
  // the full list in place (widening the cell while expanded).
  function buildCompanyChips(companies, cell) {
    const wrap = document.createElement("div");
    wrap.className = "tufp-tags";
    let expanded = false;
    const render = () => {
      cell.classList.toggle("tufp-co-expanded", expanded);
      wrap.replaceChildren();
      (expanded ? companies : companies.slice(0, 3)).forEach((c) =>
        wrap.appendChild(makeCompanyTag(c))
      );
      if (companies.length > 3) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "tufp-co tufp-co-more";
        toggle.textContent = expanded ? "− less" : "+" + (companies.length - 3);
        toggle.title = expanded ? "Show fewer companies" : "Show all companies";
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          expanded = !expanded;
          render();
        });
        wrap.appendChild(toggle);
      }
    };
    render();
    return wrap;
  }

  // ---------- solution modal (opens like Notes) ----------

  function openSolutionModal(title, info, editorialHref) {
    closeSolutionModal();
    const overlay = document.createElement("div");
    overlay.className = "tufp-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSolutionModal();
    });

    const modal = document.createElement("div");
    modal.className = "tufp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Solution: " + title);

    const head = document.createElement("div");
    head.className = "tufp-modal-head";
    const h = document.createElement("div");
    h.className = "tufp-modal-title";
    h.textContent = title;
    const x = document.createElement("button");
    x.type = "button";
    x.className = "tufp-modal-close";
    x.textContent = "✕";
    x.setAttribute("aria-label", "Close");
    x.addEventListener("click", closeSolutionModal);
    head.append(h, x);

    const tagWrap = document.createElement("div");
    tagWrap.className = "tufp-tags";
    info.t.forEach((t) => tagWrap.appendChild(makeStaticTag(t)));

    const how = document.createElement("p");
    how.className = "tufp-modal-how";
    how.textContent = info.how;

    const time = document.createElement("div");
    time.className = "tufp-modal-time";
    time.textContent = "Time: " + info.time;

    modal.append(head, tagWrap, how, time);

    if (editorialHref) {
      const a = document.createElement("a");
      a.className = "tufp-modal-link";
      a.href = editorialHref;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = "Read full editorial →";
      modal.appendChild(a);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", escClose);
  }

  function escClose(e) {
    if (e.key === "Escape") closeSolutionModal();
  }

  function closeSolutionModal() {
    const o = document.querySelector(".tufp-overlay");
    if (o) o.remove();
    document.removeEventListener("keydown", escClose);
  }

  // ---------- table enhancement ----------

  const BULB_SVG =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.5 1.1 1.2 1.3 2.1h4.4c.2-.9.6-1.6 1.3-2.1A6 6 0 0 0 12 3z"/></svg>';

  function plusColumnIndexes(table) {
    const headRow = table.tHead && table.tHead.rows[0];
    if (!headRow) return [];
    const idx = [];
    [...headRow.cells].forEach((c, i) => {
      const t = norm(c.textContent || "");
      if (t === "plus" || t === "resourceplus") idx.push(i);
    });
    return idx;
  }

  function enhanceTable(table) {
    if (!isSheetTable(table)) return;
    const headRow = table.tHead && table.tHead.rows[0];
    if (!headRow) return;

    const hideIdx = plusColumnIndexes(table);
    hideIdx.forEach((i) => headRow.cells[i] && headRow.cells[i].classList.add("tufp-col-hidden"));

    if (!headRow.querySelector(".tufp-head")) {
      const ref = headRow.lastElementChild;
      for (const label of ["Pattern", "Companies", "Solution"]) {
        const th = document.createElement("th");
        th.className = (ref ? ref.className + " " : "") + "tufp-head";
        th.textContent = label;
        headRow.appendChild(th);
      }
    }

    for (const row of table.tBodies[0] ? table.tBodies[0].rows : []) {
      hideIdx.forEach((i) => row.cells[i] && row.cells[i].classList.add("tufp-col-hidden"));
      if (row.querySelector(".tufp-cell")) continue;

      const titleCell = row.cells[1];
      const title = titleCell ? titleCell.textContent.trim() : "";
      const info = dataForTitle(title);

      // Pattern cell (centered)
      const tdP = document.createElement("td");
      tdP.className = "tufp-cell";
      if (info) {
        row.dataset.tufpTags = info.t.join("|");
        const wrap = document.createElement("div");
        wrap.className = "tufp-tags";
        info.t.forEach((t) => wrap.appendChild(makeTag(t)));
        tdP.appendChild(wrap);
      } else {
        tdP.innerHTML = '<span class="tufp-none">—</span>';
      }
      row.appendChild(tdP);

      // Companies cell: top 3 chips + a "+N" chip carrying the rest in its tooltip
      const tdC = document.createElement("td");
      tdC.className = "tufp-cell tufp-co-cell";
      const companies = companiesForTitle(title);
      if (companies && companies.length) {
        row.dataset.tufpCos = companies.join("|");
        tdC.appendChild(buildCompanyChips(companies, tdC));
      } else {
        tdC.innerHTML = '<span class="tufp-none">—</span>';
      }
      row.appendChild(tdC);

      // Solution cell
      const tdS = document.createElement("td");
      tdS.className = "tufp-cell tufp-sol-cell";
      if (info) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tufp-sol-btn";
        btn.title = "Show solution approach";
        btn.setAttribute("aria-label", "Show solution for " + title);
        btn.innerHTML = BULB_SVG;
        const link = titleCell && titleCell.querySelector("a");
        const href = link ? link.href : null;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openSolutionModal(title, info, href);
        });
        tdS.appendChild(btn);
      } else {
        tdS.innerHTML = '<span class="tufp-none">—</span>';
      }
      row.appendChild(tdS);
    }
  }

  // ---------- toolbar dropdowns (Pattern: category → pattern; Company: flat) ----------

  function renderDropdownList() {
    const list = document.querySelector(".tufp-dd-pattern .tufp-dd-list");
    if (!list) return;
    list.replaceChildren();

    Object.entries(CATEGORIES).forEach(([cat, tags]) => {
      const activeInCat = tags.filter((t) => activeTags.has(t)).length;

      const catBtn = document.createElement("button");
      catBtn.type = "button";
      catBtn.className = "tufp-dd-cat";
      const chev = document.createElement("span");
      chev.className = "tufp-dd-chev";
      chev.textContent = openCats.has(cat) ? "▾" : "▸";
      const name = document.createElement("span");
      name.textContent = cat + (activeInCat ? ` (${activeInCat})` : "");
      catBtn.append(chev, name);
      catBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (openCats.has(cat)) openCats.delete(cat);
        else openCats.add(cat);
        renderDropdownList();
      });
      list.appendChild(catBtn);

      if (!openCats.has(cat)) return;

      tags.forEach((tag) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className =
          "tufp-dd-item tufp-dd-sub" + (activeTags.has(tag) ? " tufp-dd-item-on" : "");
        const check = document.createElement("span");
        check.className = "tufp-dd-check";
        check.textContent = activeTags.has(tag) ? "✓" : "";
        const tagName = document.createElement("span");
        tagName.textContent = tag;
        const count = document.createElement("span");
        count.className = "tufp-dd-count";
        count.textContent = TAG_COUNTS[tag];
        item.append(check, tagName, count);
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleTag(tag);
        });
        list.appendChild(item);
      });
    });

    if (activeTags.size) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "tufp-dd-item tufp-dd-clear";
      clear.textContent = "Clear all";
      clear.addEventListener("click", (e) => {
        e.stopPropagation();
        clearTags();
      });
      list.appendChild(clear);
    }
  }

  function renderCompanyList() {
    const list = document.querySelector(".tufp-dd-company .tufp-dd-list");
    if (!list) return;
    list.replaceChildren();

    CO_ORDER.forEach((name) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tufp-dd-item" + (activeCos.has(name) ? " tufp-dd-item-on" : "");
      const check = document.createElement("span");
      check.className = "tufp-dd-check";
      check.textContent = activeCos.has(name) ? "✓" : "";
      const coName = document.createElement("span");
      coName.textContent = name;
      const count = document.createElement("span");
      count.className = "tufp-dd-count";
      count.textContent = CO_COUNTS[name];
      item.append(check, coName, count);
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCo(name);
      });
      list.appendChild(item);
    });

    if (activeCos.size) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "tufp-dd-item tufp-dd-clear";
      clear.textContent = "Clear all";
      clear.addEventListener("click", (e) => {
        e.stopPropagation();
        clearCos();
      });
      list.appendChild(clear);
    }
  }

  function buildDropdown(kindClass, labelText, refClassName, renderList) {
    const wrap = document.createElement("div");
    wrap.className = "tufp-dd " + kindClass;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = refClassName; // mirror the site's dropdown styling
    btn.innerHTML =
      '<span class="tufp-dd-label">' + labelText + "</span>" +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    const panel = document.createElement("div");
    panel.className = "tufp-dd-panel";
    const list = document.createElement("div");
    list.className = "tufp-dd-list";
    panel.appendChild(list);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".tufp-dd-panel.tufp-dd-open").forEach((p) => {
        if (p !== panel) p.classList.remove("tufp-dd-open");
      });
      panel.classList.toggle("tufp-dd-open");
      renderList();
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) panel.classList.remove("tufp-dd-open");
    });

    wrap.append(btn, panel);
    return wrap;
  }

  function injectDropdown() {
    if (document.querySelector(".tufp-dd")) return;
    const buttons = [...document.querySelectorAll("button")];
    const diffBtn = buttons.find((b) => b.textContent.trim() === "Difficulty");
    if (!diffBtn || !diffBtn.parentElement) return;

    // insertion order after Difficulty: Pattern, then Company
    if (CO_ORDER.length) {
      diffBtn.insertAdjacentElement(
        "afterend",
        buildDropdown("tufp-dd-company", "Company", diffBtn.className, renderCompanyList)
      );
    }
    diffBtn.insertAdjacentElement(
      "afterend",
      buildDropdown("tufp-dd-pattern", "Pattern", diffBtn.className, renderDropdownList)
    );
    refreshTagStates();
  }

  // ---------- active-filter bar ----------

  function renderBar() {
    let bar = document.querySelector(".tufp-bar");
    if (!filterCount()) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "tufp-bar";
      document.body.appendChild(bar);
    }
    const parts = [];
    if (activeTags.size) parts.push("Pattern: " + [...activeTags].join(" + "));
    if (activeCos.size) parts.push("Company: " + [...activeCos].join(" + "));
    bar.textContent = parts.join(" · ");
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "clear";
    clear.addEventListener("click", clearAllFilters);
    bar.appendChild(clear);
  }

  // ---------- boot / observe ----------

  function enhanceAll() {
    document.querySelectorAll("table").forEach(enhanceTable);
    injectDropdown();
    if (filterCount()) applyFilter();
  }

  let scheduled = false;
  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) =>
      [...m.addedNodes].some(
        (n) => n.nodeType === 1 && !String(n.className).includes("tufp")
      )
    );
    if (!relevant || scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      enhanceAll();
    }, 150);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  enhanceAll();
})();
