# TUF SDE Sheet — Pattern Column

A Chrome extension that upgrades [Striver's SDE Sheet](https://takeuforward.org/dsa/strivers-sde-sheet-top-coding-interview-problems)
on takeuforward.org with **pattern tags and company tags for all 191 problems** — so
you can see, at a glance, which technique each problem's optimal solution uses, which
companies ask it, and drill problems by pattern instead of by sheet order.

![Pattern and Companies columns, toolbar filters, and an expanded company list](docs/screenshot.png)

## Features

- **Pattern column** — every problem gets tags for the pattern(s) its optimal solution
  uses (`Sliding Window`, `Hashing`, `Monotonic Stack`, `Fast & Slow Pointers`, …).
  A problem with multiple patterns shows each as its own tag.
- **Click a tag to filter** — collapsed sections auto-expand, only matching problems
  stay visible, and sections with no matches are hidden entirely. Selecting a second
  tag narrows to problems that use *both*. Clearing the filter re-collapses the
  sections that were auto-expanded, leaving the sheet as you left it.
- **Pattern & Company dropdowns in the toolbar** — styled like the site's own
  Difficulty dropdown. Pattern is nested: pick a DS/algo family first (Arrays,
  Graphs, DP, …), then the pattern inside it. Company is a flat list sorted by how
  many problems each company asks. Every entry shows its problem count, and each
  button shows its active count, e.g. `Pattern (2)`. Both buttons carry a subtle
  brand-colored outline so they're easy to spot among the site's own filters.
- **Companies column** — the top companies that ask each problem, as chips (top 3
  visible; click the `+N` chip to expand the full list in place, `− less` to
  collapse it). Chips are clickable filters, just like pattern tags — "show me
  everything Google asks" is one click — and pattern + company filters combine,
  e.g. Sliding Window problems asked at Google.
- **Solution column** — a lightbulb per problem opens a modal (like the site's Note
  popup) with the pattern tags, a one-line description of the optimal approach, the
  time complexity, and a link to the problem's free editorial.
- **Declutters the table** — hides the "Plus" and "Resource Plus" columns (the
  paid-course links).

## Install

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the repository folder.
5. Open the [SDE sheet](https://takeuforward.org/dsa/strivers-sde-sheet-top-coding-interview-problems)
   and expand any section — or just pick a pattern from the new **Pattern** dropdown.

## Coverage

All **191 problems** of the sheet are categorized, across **13 DS/algo families**
(Arrays, Linked List, Greedy, Recursion & Backtracking, Binary Search, Heaps,
Stack & Queue, Strings, Binary Tree, BST, Graphs, Dynamic Programming, Trie) and
**52 pattern tags**.

Problems are grouped by their *nature*, not their sheet section — e.g. 3 Sum and
Trapping Rainwater are under Arrays (despite sitting in the "Linked List and Arrays"
section), and Rotten Oranges / Flood Fill are under Graphs (they're grid-BFS).

**185 of the 191 problems carry company tags** (the remaining 6 are implementation
exercises with no tags on any platform).

## Company tags

Company tags answer "which companies have asked this in interviews", and come from
two public sources:

- **LeetCode company tags**, via the public
  [leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems)
  dataset. Each TUF problem is mapped to its LeetCode counterpart in
  `tools/tuf-lc-map.js` — including renames (Kadane's Algorithm → Maximum Subarray)
  and equivalent re-skins (Aggressive Cows → Magnetic Force Between Two Balls,
  Allocate Pages → Split Array Largest Sum).
- **GeeksforGeeks company tags** for the problems that aren't on LeetCode
  (N Meetings, Bottom View, 0/1 Knapsack, …), captured in `tools/gfg-tags.json`.

Companies are ranked by how frequently they ask the problem. The dataset's frequency
is normalized per company, so ranking is weighted by company size
(`freq × log10(1 + company's tagged-problem count)`) to keep small companies from
always outranking Google/Amazon. Lists are capped at 12 companies per problem.

To regenerate `companies.js`:

```sh
git clone --depth 1 https://github.com/liquidslr/leetcode-company-wise-problems tools/lc-companies
node tools/build-index.js
node tools/gen-companies.js
```

## How it works

- `data.js` holds the dataset: one entry per problem with its family (`cat`), pattern
  tags (`t`), a one-line optimal approach (`how`), and time complexity (`time`).
  Entries are keyed by the problem title lowercased with all non-alphanumerics
  stripped (`Pow(x, n)` → `powxn`); `TUF_ALIASES` maps alternate title spellings onto
  canonical keys, so minor renames on the site don't break matching.
- `companies.js` holds `TUF_COMPANIES`, the company tags per problem, keyed the same
  way. It's generated by `tools/gen-companies.js` (see "Company tags" above).
- `content.js` injects the columns and dropdown, matches each table row's title
  against the dataset, and re-applies everything through a `MutationObserver` — the
  sheet is a React app that re-renders rows, so all injection is idempotent.
- Styling uses the site's own CSS variables (`--brand`, `--surface-1`, …), so the
  injected UI follows the site theme automatically.
- Filtering auto-expands sections by clicking the site's own accordion triggers, so
  open/close animations stay native.

## Maintenance

- **The site renamed a problem?** Add the new title's key to `TUF_ALIASES` in
  `data.js`, pointing at the existing entry.
- **New problem on the sheet?** Add a `TUF_DATA` entry with `cat`, `t`, `how`, and
  `time`. The dropdown and tag counts update automatically. For its company tags,
  add the LeetCode mapping to `tools/tuf-lc-map.js` (or GFG tags to
  `tools/gfg-tags.json`) and regenerate `companies.js`.

## Disclaimer

This is an unofficial, personal-use extension and is not affiliated with or endorsed
by takeUforward. It adds a purely client-side overlay: no data is collected, nothing
is sent anywhere, and the site's own content is not modified — editorial links point
to takeuforward's free articles. The one-line approach summaries are study hints, not
a substitute for the full editorials. Company tags come from community-maintained
public datasets and are indicative, not authoritative — interview pools change over
time.

## License

[MIT](LICENSE)
