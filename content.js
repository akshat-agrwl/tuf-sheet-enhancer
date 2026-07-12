// TUF SDE Sheet — Pattern Column
// - Injects "Pattern" + "Solution" columns into the problem tables
// - Hides the "Plus" and "Resource Plus" columns
// - Adds a nested "Pattern" dropdown (DS/algo family → pattern) to the toolbar
// - Selecting a pattern auto-expands all sections, shows only matching
//   problems, and hides sections with no matches; clearing restores them.
// - The Solution icon opens a modal with the optimal approach (like Notes).
//
// The problem dataset (TUF_DATA / TUF_ALIASES / TUF_FAMILY_ORDER) lives in
// data.js, which the manifest loads before this file.

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

  const activeTags = new Set();
  const autoExpanded = new Set(); // section titles we expanded for a filter
  const openCats = new Set(Object.keys(CATEGORIES).length === 1 ? Object.keys(CATEGORIES) : []);

  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const dataForTitle = (title) => {
    const k = norm(title);
    return TUF_DATA[k] || TUF_DATA[TUF_ALIASES[k]] || null;
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
    const filtering = activeTags.size > 0;
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

  function toggleTag(tag) {
    const wasEmpty = activeTags.size === 0;
    if (activeTags.has(tag)) activeTags.delete(tag);
    else activeTags.add(tag);
    if (wasEmpty && activeTags.size) expandAllSections();
    if (!activeTags.size) restoreSections();
    refreshTagStates();
    applyFilter();
  }

  function clearTags() {
    activeTags.clear();
    restoreSections();
    refreshTagStates();
    applyFilter();
  }

  function refreshTagStates() {
    document.querySelectorAll(".tufp-tag").forEach((b) => {
      b.classList.toggle("tufp-on", activeTags.has(b.textContent));
    });
    renderDropdownList();
    const label = document.querySelector(".tufp-dd-label");
    if (label) {
      label.textContent = activeTags.size ? `Pattern (${activeTags.size})` : "Pattern";
    }
  }

  function applyFilter() {
    const active = [...activeTags];
    document.querySelectorAll("table").forEach((table) => {
      if (!isSheetTable(table)) return;
      for (const row of table.tBodies[0] ? table.tBodies[0].rows : []) {
        if (!active.length) {
          row.classList.remove("tufp-row-hidden");
          continue;
        }
        const tags = (row.dataset.tufpTags || "").split("|");
        row.classList.toggle("tufp-row-hidden", !active.every((t) => tags.includes(t)));
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
      for (const label of ["Pattern", "Solution"]) {
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

  // ---------- toolbar dropdown (nested: category → pattern) ----------

  function renderDropdownList() {
    const list = document.querySelector(".tufp-dd-list");
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

  function injectDropdown() {
    if (document.querySelector(".tufp-dd")) return;
    const buttons = [...document.querySelectorAll("button")];
    const diffBtn = buttons.find((b) => b.textContent.trim() === "Difficulty");
    if (!diffBtn || !diffBtn.parentElement) return;

    const wrap = document.createElement("div");
    wrap.className = "tufp-dd";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = diffBtn.className; // mirror the site's dropdown styling
    btn.innerHTML =
      '<span class="tufp-dd-label">Pattern</span>' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    const panel = document.createElement("div");
    panel.className = "tufp-dd-panel";
    const list = document.createElement("div");
    list.className = "tufp-dd-list";
    panel.appendChild(list);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("tufp-dd-open");
      renderDropdownList();
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) panel.classList.remove("tufp-dd-open");
    });

    wrap.append(btn, panel);
    diffBtn.insertAdjacentElement("afterend", wrap);
    refreshTagStates();
  }

  // ---------- active-filter bar ----------

  function renderBar() {
    let bar = document.querySelector(".tufp-bar");
    if (!activeTags.size) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "tufp-bar";
      document.body.appendChild(bar);
    }
    bar.textContent = "Pattern: " + [...activeTags].join(" + ");
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "clear";
    clear.addEventListener("click", clearTags);
    bar.appendChild(clear);
  }

  // ---------- boot / observe ----------

  function enhanceAll() {
    document.querySelectorAll("table").forEach(enhanceTable);
    injectDropdown();
    if (activeTags.size) applyFilter();
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
