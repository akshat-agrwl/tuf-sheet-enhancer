# TUF SDE Sheet — Pattern Column

A Chrome extension that upgrades [Striver's SDE Sheet](https://takeuforward.org/dsa/strivers-sde-sheet-top-coding-interview-problems)
on takeuforward.org with **pattern tags for all 191 problems** — so you can see, at a
glance, which technique each problem's optimal solution uses, and drill problems by
pattern instead of by sheet order.

![Sliding Window filter active across sections](docs/screenshot.png)

## Features

- **Pattern column** — every problem gets tags for the pattern(s) its optimal solution
  uses (`Sliding Window`, `Hashing`, `Monotonic Stack`, `Fast & Slow Pointers`, …).
  A problem with multiple patterns shows each as its own tag.
- **Click a tag to filter** — collapsed sections auto-expand, only matching problems
  stay visible, and sections with no matches are hidden entirely. Selecting a second
  tag narrows to problems that use *both*. Clearing the filter re-collapses the
  sections that were auto-expanded, leaving the sheet as you left it.
- **Nested Pattern dropdown in the toolbar** — styled like the site's own Difficulty
  dropdown. Pick a DS/algo family first (Arrays, Graphs, DP, …), then the pattern
  inside it; each pattern shows how many problems use it. The button shows the active
  count, e.g. `Pattern (2)`.
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

## How it works

- `data.js` holds the dataset: one entry per problem with its family (`cat`), pattern
  tags (`t`), a one-line optimal approach (`how`), and time complexity (`time`).
  Entries are keyed by the problem title lowercased with all non-alphanumerics
  stripped (`Pow(x, n)` → `powxn`); `TUF_ALIASES` maps alternate title spellings onto
  canonical keys, so minor renames on the site don't break matching.
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
  `time`. The dropdown and tag counts update automatically.

## Disclaimer

This is an unofficial, personal-use extension and is not affiliated with or endorsed
by takeUforward. It adds a purely client-side overlay: no data is collected, nothing
is sent anywhere, and the site's own content is not modified — editorial links point
to takeuforward's free articles. The one-line approach summaries are study hints, not
a substitute for the full editorials.

## License

[MIT](LICENSE)
