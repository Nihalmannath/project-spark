## Goal

A polished, academic-style multi-page web app presenting your thesis "GraphSAGE Food Desert Identification (Bengaluru)" for thesis examiners. Built on the existing TanStack Start template.

## Sitemap

```text
/                  Overview — problem, 4 labels, GraphSAGE primer, headline metrics
/methodology       Concepts: graph, features, spatial CV, Moran's I, correlation pruning
/notebooks         Notebook-by-notebook cards (03 → 03h, 08) with metrics + findings
/notebooks/$id     Per-notebook detail: features table, model config, results, takeaways
/comparison        Charts: macro-F1 & accuracy across notebooks, per-class F1
/map               Embedded Folium prediction-vs-truth map (notebook 08)
/about             Data sources, citations, acknowledgements
```

Shared `__root.tsx` header (nav + thesis title) and footer (author, date, repo link). Each route gets its own SEO `head()` metadata.

## Content & data

All numeric results (macro-F1, accuracy, per-class F1, feature counts, label distributions) come from `NOTEBOOK_SUMMARIES.md` and are encoded as a typed TS data module:

```text
src/data/notebooks.ts        // typed array of notebook records
src/data/comparison.ts       // derived series for charts
src/data/labels.ts           // 4 label definitions + colors
```

For the interactive map, I'll look in the connected GitHub repo for `outputs/adaptive_hex_pred_vs_true_map.html` (or `08_adaptive_vs_03_series_interactive_map.html`). If found, copy into `public/maps/` and embed via `<iframe>`. If absent, the `/map` route shows a clear "upload the HTML file to `public/maps/`" placeholder.

## Design direction

Academic but modern — think a thesis defense site, not a SaaS landing page:
- Serif display headings (Fraunces / Source Serif) + clean sans body (Inter)
- Restrained palette: ink/paper base, accent tied to the 4 labels
  - Desert: warm amber `#C97B2A`
  - Oasis: deep green `#2F7D4F`
  - Mirage: muted teal `#4A8B91`
  - Swamp: dusty red `#A5453D`
- Generous whitespace, hairline borders, small caps for metric labels
- KaTeX-style number formatting, monospace for feature names
- Subtle fade/slide-in on scroll; no flashy animation

## Charts

`recharts` (already installed):
- Horizontal bar chart of macro-F1 across notebooks (sorted, highlight 03c and 08)
- Grouped bar: accuracy vs macro-F1 per notebook
- Stacked per-class F1 (desert/oasis/mirage/swamp) for 03c, 03g, 03h, 08
- Feature-count timeline (8 → 39 → 109)

## Technical details

- Pure frontend; no backend needed (no Lovable Cloud).
- File-based routes under `src/routes/`, each with `createFileRoute` and unique `head()` meta.
- Reusable components: `<MetricCard>`, `<NotebookCard>`, `<LabelBadge>`, `<FeatureTable>`, `<KeyFinding>`.
- Fonts via `@fontsource/fraunces` + `@fontsource/inter` (installed with `bun add`, imported in `src/start.ts`).
- Tailwind v4 design tokens added to `src/styles.css` (label colors, ink/paper).
- Map embedded as sandboxed `<iframe src="/maps/adaptive_hex_pred_vs_true_map.html" />` with loading skeleton.

## Build order

1. Install fonts; set up design tokens, label palette, typography in `src/styles.css`.
2. Build shared layout in `__root.tsx` (header nav, footer).
3. Encode notebook data in `src/data/notebooks.ts`.
4. Build reusable components.
5. Implement routes: `/` → `/methodology` → `/notebooks` + detail → `/comparison` → `/map` → `/about`.
6. Check the connected GitHub repo for the Folium HTML map and copy it into `public/maps/` if present.
7. Verify with a screenshot of `/` and `/comparison`.

## Open question for build time

You said the project is connected to your thesis GitHub repo. I'll list the repo contents at build time and pull in the Folium HTML map(s) and any small metric CSVs I find. If a CSV is richer than the markdown summary, I'll switch the data module to read from it; otherwise the markdown values stand.
