import { LABELS } from "../data/labels";
import { labelColor, type NodeProps, type ScenarioChange } from "../data/realData";

const MODEL_KEYS = ["desert", "oasis", "mirage", "swamp"] as const;

function Row({
  label,
  value,
  after,
}: {
  label: string;
  value: string | number;
  after?: string | number;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="smallcaps text-[10px] text-muted-foreground">{label}</span>
      <span className="metric-num text-sm text-foreground">
        {value}
        {after !== undefined && after !== value && (
          <span className="ml-2 text-[color:var(--color-oasis)]">→ {after}</span>
        )}
      </span>
    </div>
  );
}

function score(value: number | null | undefined) {
  return value == null ? "Not available" : value.toFixed(2);
}

function flagLabel(flag: string) {
  return flag.replaceAll("_", " ");
}

interface Props {
  node: NodeProps | null;
  change?: ScenarioChange | null;
  onClose: () => void;
}

export function NodeSidePanel({ node, change, onClose }: Props) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="smallcaps text-[10px] text-muted-foreground">No node selected</p>
        <p className="mt-3 max-w-[30ch] font-serif text-base leading-snug text-foreground">
          Click any road-intersection node on the map to inspect its features and label.
        </p>
      </div>
    );
  }
  const baseLabel = LABELS[node.label];
  const afterLabel = change ? LABELS[change.after] : null;
  const evidence = change?.evidence_level ?? node.evidence_level;
  const flags = change?.risk_flags ?? node.risk_flags;
  const modelConfidence =
    change?.model_confidence ?? (node.model_promoted ? node.model_confidence : null);
  const modelProbabilities = change?.after_probabilities ?? node.model_probabilities;
  const displayConfidence = modelConfidence ?? node.confidence;
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            node #{node.id} · {node.ward}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: labelColor(node.label) }}
            />
            <h3 className="font-serif text-xl font-medium text-foreground">{baseLabel.name}</h3>
            {afterLabel && change && change.after !== change.before && (
              <>
                <span className="text-muted-foreground">→</span>
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: labelColor(change.after) }}
                />
                <span className="font-serif text-xl font-medium text-[color:var(--color-oasis-deep,#3f6b46)]">
                  {afterLabel.name}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{(afterLabel ?? baseLabel).shortDef}</p>
          <span
            className={`mt-2 inline-flex rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-wider ${
              evidence === "proxy"
                ? "border-[#3d5a80] text-[#3d5a80]"
                : evidence === "model"
                  ? "border-foreground text-foreground"
                  : evidence === "unknown"
                    ? "border-border text-muted-foreground"
                    : "border-[#6f8758] text-[#52683e]"
            }`}
          >
            {evidence === "proxy"
              ? "OSM proxy evidence"
              : evidence === "model"
                ? "GraphSAGE model projection"
                : `${evidence} evidence`}
          </span>
          {change?.spillover && (
            <p className="mt-1 text-[11px] italic text-[color:var(--color-ink-deep)]">
              Changed via graph spillover (a neighbouring intersection improved).
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5 rounded-md bg-secondary/60 p-3">
          <div className="flex items-baseline justify-between">
            <span className="smallcaps text-[10px] text-muted-foreground">
              {evidence === "observed"
                ? "Label confidence"
                : modelConfidence != null
                  ? "Calibrated model confidence"
                  : "Evidence strength (heuristic)"}
            </span>
            <span className="metric-num text-base text-foreground">
              {(displayConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full"
              style={{
                width: `${displayConfidence * 100}%`,
                backgroundColor:
                  displayConfidence > 0.75 ? "var(--color-oasis)" : "var(--color-desert)",
              }}
            />
          </div>
          {evidence !== "observed" && modelConfidence == null && (
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Display heuristic, not validation accuracy.
            </p>
          )}
        </div>

        <p className="smallcaps mb-2 text-[10px] text-muted-foreground">Food-environment scores</p>
        <Row
          label="Access"
          value={node.access.toFixed(2)}
          after={change ? (change.access_pct / 100).toFixed(2) : undefined}
        />
        <Row
          label="Affordability"
          value={score(node.affordability)}
          after={change ? score(change.affordability) : undefined}
        />
        <Row
          label={node.quality_proxy != null ? "Quality / diversity proxy" : "Quality / diversity"}
          value={score(node.quality)}
          after={change ? score(change.quality) : undefined}
        />

        {node.model_label && modelProbabilities && (
          <section className="mt-5 border-y border-border py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-foreground">OSM-only GraphSAGE</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {node.model_promoted
                    ? "Primary transfer model"
                    : "Evaluation only · promotion gate failed"}
                </p>
              </div>
              <span className="rounded-full border border-border px-2 py-1 font-mono text-[9px] text-muted-foreground">
                {node.model_label === "unknown"
                  ? `abstained · top ${node.model_top_label ?? "—"}`
                  : LABELS[node.model_label].name.replace("Food ", "")}
              </span>
            </div>
            <dl className="mt-3 space-y-2">
              {MODEL_KEYS.map((key) => {
                const probability = Number(modelProbabilities[key] ?? 0);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[10px]">
                      <dt className="flex items-center gap-1.5 text-[color:var(--color-ink-deep)]">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: labelColor(key) }}
                        />
                        {LABELS[key].name.replace("Food ", "")}
                      </dt>
                      <dd className="font-mono text-foreground">
                        {(probability * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div className="mt-1 h-1 bg-secondary">
                      <div
                        className="h-full"
                        style={{ width: `${probability * 100}%`, background: labelColor(key) }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>Entropy</dt>
                <dd>{(change?.model_entropy ?? node.model_entropy)?.toFixed(3) ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>OOD score</dt>
                <dd>{(change?.model_ood_score ?? node.model_ood_score)?.toFixed(2) ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Four-class probabilities are learned from Bengaluru ward labels. Mirage and oasis do
              not mean Mysuru affordability was observed.
            </p>
          </section>
        )}

        {node.proxy_label && (
          <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground">Deterministic proxy comparison</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span
                className="size-2 rounded-full"
                style={{ background: labelColor(node.proxy_label) }}
              />
              {LABELS[node.proxy_label].name}
            </span>
          </div>
        )}
        {node.proxy_poi_count != null && (
          <>
            <p className="smallcaps mb-2 mt-5 text-[10px] text-muted-foreground">
              OSM proxy components
            </p>
            <Row label="Nearby proxy POIs" value={node.proxy_poi_count} />
            <Row
              label="Category diversity"
              value={`${node.proxy_category_diversity_pct?.toFixed(0) ?? 0}%`}
            />
            <Row
              label="Cuisine diversity"
              value={`${node.proxy_cuisine_diversity_pct?.toFixed(0) ?? 0}%`}
            />
            <Row
              label="Grocery share"
              value={`${node.proxy_grocery_share_pct?.toFixed(0) ?? 0}%`}
            />
            <Row
              label="Fast-food share"
              value={`${node.proxy_fast_food_share_pct?.toFixed(0) ?? 0}%`}
            />
            <Row
              label="Category coverage"
              value={`${node.proxy_category_coverage_pct?.toFixed(0) ?? 0}%`}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              These OSM tag signals screen for possible swamp risk; they are not observed nutrition
              or outlet-quality measurements.
            </p>
          </>
        )}

        {flags.length > 0 && (
          <>
            <p className="smallcaps mb-2 mt-5 text-[10px] text-muted-foreground">Evidence flags</p>
            <ul className="flex flex-wrap gap-1.5">
              {flags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-full bg-secondary px-2 py-1 text-[10px] text-[color:var(--color-ink-deep)]"
                >
                  {flagLabel(flag)}
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="smallcaps mb-2 mt-5 text-[10px] text-muted-foreground">
          Transferable OSM features
        </p>
        <Row label="Food outlets ≤800 m" value={node.food_800m} />
        <Row label="Food outlets ≤1500 m" value={node.food_1500m} />
        <Row label="Nearest food (km)" value={node.nearest_food_km.toFixed(2)} />
        <Row label="Road degree" value={node.road_degree} />
        <Row label="Intersections ≤1 km" value={node.inter_density_1km} />
        <Row label="Access percentile" value={`${node.access_pct.toFixed(0)}%`} />
      </div>
    </div>
  );
}
