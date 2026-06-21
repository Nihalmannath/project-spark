import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Globe2 } from "lucide-react";
import { NodeMap } from "../components/NodeMap";
import { NodeSidePanel } from "../components/NodeSidePanel";
import { Legend } from "../components/Legend";
import { FoliumMapFrame } from "../components/FoliumMapFrame";
import { AdaptiveHexExplorer } from "../components/AdaptiveHexExplorer";
import { WorldCityMap } from "../components/WorldCityMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { fetchMeta } from "../lib/inference";
import { useMotionPresets } from "../lib/motion";
import { CITY_INFO, labelColor, type NodeProps } from "../data/realData";
import { LABELS, type LabelKey } from "../data/labels";
import {
  EVIDENCE_VIEWS,
  getEvidenceView,
  isEvidenceCity,
  isEvidenceView,
  type EvidenceCity,
  type EvidenceViewId,
} from "../data/evidenceViews";

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => {
    const city: EvidenceCity = isEvidenceCity(search.city) ? search.city : "bengaluru";
    const requestedView: EvidenceViewId = isEvidenceView(search.view) ? search.view : "road";
    return { city, view: city === "mysuru" ? "road" : requestedView };
  },
  head: () => ({ meta: [{ title: "Evidence Map — Food Spatial Intelligence" }] }),
  component: EvidenceMap,
});

function EvidenceMap() {
  const { city, view: viewId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { reduce } = useMotionPresets();
  const [sel, setSel] = useState<NodeProps | null>(null);
  const [filter, setFilter] = useState<LabelKey | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const info = CITY_INFO[city];
  const view = getEvidenceView(viewId);
  const meta = useQuery({ queryKey: ["meta", city], queryFn: () => fetchMeta(city) });

  const counts = meta.data?.label_counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const modelPromoted = city === "mysuru" && meta.data?.model.status === "promoted";
  const modelMetrics = meta.data?.model.metrics;

  function selectCity(nextCity: EvidenceCity) {
    setSel(null);
    setFilter(null);
    setLocationOpen(false);
    void navigate({ search: { city: nextCity, view: "road" } });
  }

  function selectView(nextView: EvidenceViewId) {
    if (!getEvidenceView(nextView).availableIn.includes(city)) return;
    setSel(null);
    setFilter(null);
    void navigate({ search: { city, view: nextView }, replace: true });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            {view.targetType} ·{" "}
            {info.evidence === "AVAILABLE" ? "evidence-backed" : "transfer projection"}
          </p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
            {info.name} Food-Environment Evidence
          </h1>
          <p className="mt-2 max-w-[760px] text-sm text-[color:var(--color-ink-deep)]">
            Compare road-node evidence with the real thesis training maps, then inspect how each
            model and feature set was constructed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLocationOpen(true)}
          className="inline-flex items-center gap-2 rounded-sm border border-foreground px-4 py-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Globe2 className="size-4" />
          Change location
        </button>
      </header>

      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Choose an evidence location</DialogTitle>
            <DialogDescription>
              Bengaluru has local evidence. Mysuru uses a calibrated Bengaluru transfer projection.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[65vh] min-h-[440px] border-t border-border">
            <WorldCityMap
              supportedOnly
              onSelectLive={(selected) =>
                selectCity(selected.id === "mysuru" ? "mysuru" : "bengaluru")
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      <section aria-label="Evidence map view" className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {EVIDENCE_VIEWS.map((candidate) => {
            const available = candidate.availableIn.includes(city);
            const active = candidate.id === viewId;
            return (
              <button
                key={candidate.id}
                type="button"
                disabled={!available}
                aria-pressed={active}
                title={available ? candidate.description : "Available for Bengaluru only"}
                onClick={() => selectView(candidate.id)}
                className={`shrink-0 rounded-sm border px-3 py-2 text-[10px] transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : available
                      ? "border-border bg-card text-foreground hover:border-foreground/50"
                      : "cursor-not-allowed border-border text-muted-foreground opacity-40"
                }`}
              >
                {candidate.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4 grid gap-3 border border-border bg-card p-4 md:grid-cols-[1fr_auto]">
        <div>
          <p className="smallcaps text-[9px] text-muted-foreground">{view.notebook}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{view.description}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{view.limitation}</p>
        </div>
        <div className="flex gap-5 md:text-right">
          <div>
            <p className="smallcaps text-[9px] text-muted-foreground">Target</p>
            <p className="mt-1 text-xs text-foreground">{view.targetType}</p>
          </div>
          <div>
            <p className="smallcaps text-[9px] text-muted-foreground">Features</p>
            <p className="metric-num mt-1 text-xs text-foreground">{view.featureCount}</p>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${city}-${viewId}`}
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -8 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          {view.id === "road" ? (
            <div className="grid gap-4 lg:grid-cols-[260px_1fr_360px]">
              <aside className="space-y-4">
                <Legend
                  active={filter}
                  onToggle={(key) => setFilter((previous) => (previous === key ? null : key))}
                  proxyMode={city === "mysuru" && !modelPromoted}
                  modelMode={modelPromoted}
                  counts={counts}
                />
                <LabelDistribution counts={counts} total={total} />
                {city === "mysuru" && meta.data && (
                  <MysuruEvidence
                    methodology={meta.data.label_methodology}
                    unknown={meta.data.unknown_count}
                    promoted={modelPromoted}
                    macroF1={modelMetrics?.spatial_cv_macro_f1}
                    ece={modelMetrics?.calibrated_ece}
                  />
                )}
              </aside>
              <div className="h-[640px]">
                <NodeMap
                  geojsonUrl={`/data/${city}_nodes.geojson`}
                  center={info.center}
                  zoom={info.zoom}
                  filterLabel={filter}
                  onSelect={setSel}
                  selectedId={sel?.id ?? null}
                  caption={`${info.name} · ${meta.data?.n_nodes?.toLocaleString() ?? ""} road nodes`}
                />
              </div>
              <aside className="h-[640px]">
                <NodeSidePanel node={sel} onClose={() => setSel(null)} />
              </aside>
            </div>
          ) : view.id === "08" ? (
            <AdaptiveHexExplorer />
          ) : view.mapPath ? (
            <FoliumMapFrame
              src={view.mapPath}
              title={`${view.label} — Bengaluru predicted versus true labels`}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {city === "mysuru"
              ? "This projection comes from a model trained in Bengaluru."
              : "See every experiment behind the Bengaluru evidence."}
          </p>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{info.blurb}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to="/training/bengaluru"
            className="rounded-sm bg-foreground px-4 py-2.5 text-[11px] font-medium text-background hover:bg-foreground/85"
          >
            {city === "mysuru"
              ? "How the Bengaluru model behind this projection was built →"
              : "How the Bengaluru model was built →"}
          </Link>
          <Link
            to="/scenario-lab"
            search={{ city }}
            className="rounded-sm border border-foreground px-4 py-2.5 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            Run a scenario
          </Link>
        </div>
      </div>
    </div>
  );
}

function LabelDistribution({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <section className="border border-border bg-[color:var(--color-paper)] p-4">
      <p className="smallcaps text-[10px] text-muted-foreground">Label distribution</p>
      <ul className="mt-2 space-y-2 text-[11px]">
        {(["oasis", "mirage", "swamp", "desert", "unknown"] as LabelKey[])
          .filter((key) => counts[key])
          .map((key) => {
            const count = counts[key] ?? 0;
            const percentage = total ? (count / total) * 100 : 0;
            return (
              <li key={key}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ background: labelColor(key) }}
                    />
                    {LABELS[key].name}
                  </span>
                  <span className="font-mono text-muted-foreground">{count.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full"
                    style={{ width: `${percentage}%`, background: labelColor(key) }}
                  />
                </div>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

function MysuruEvidence({
  methodology,
  unknown,
  promoted,
  macroF1,
  ece,
}: {
  methodology: string;
  unknown: number;
  promoted: boolean;
  macroF1?: number;
  ece?: number;
}) {
  return (
    <section className="border border-[#d59e71] bg-[#fffaf0] p-4 text-[11px] leading-relaxed text-[#65421f]">
      <p className="font-medium text-foreground">No local ground truth</p>
      <p className="mt-1">{methodology}</p>
      <dl className="mt-3 space-y-1 font-mono text-[10px]">
        <div className="flex justify-between gap-3">
          <dt>Model status</dt>
          <dd>{promoted ? "promoted" : "evaluation only"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Unknown nodes</dt>
          <dd>{unknown.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Spatial-CV macro-F1</dt>
          <dd>{macroF1?.toFixed(3) ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Calibrated ECE</dt>
          <dd>{ece?.toFixed(3) ?? "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
