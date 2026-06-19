import { createFileRoute, Link } from "@tanstack/react-router";
import { CHECKPOINTS_V2 } from "../data/platform";
import { buildAudit, useTransfer, verdictTone } from "../lib/transfer-context";

export const Route = createFileRoute("/")({
  component: SourceWorkspace,
});

function SourceWorkspace() {
  const { source, setSourceId, target, targets, setTargetId } = useTransfer();
  const audit = buildAudit(source, target);
  const tone = verdictTone(audit.verdict);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-16">
      <header className="mb-8">
        <p className="smallcaps text-[10px] text-muted-foreground">Transfer workspace · step 01</p>
        <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
          Transfer a trained urban food-environment model from one city to another.
        </h1>
        <p className="mt-2 max-w-[820px] text-sm italic text-[color:var(--color-ink-deep)]">
          Pick a trained source checkpoint on the left. Pick any Tier-2 target city on the right.
          The platform audits compatibility, applies the frozen model, and shows projections — never
          ground truth — for the target city.
        </p>
      </header>

      {/* Two-column selector with connector */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
        {/* LEFT: source */}
        <section className="hairline border border-border bg-[color:var(--color-paper)] p-6">
          <header className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="smallcaps text-[10px] text-muted-foreground">01 · Select trained source model</p>
              <h2 className="mt-0.5 font-serif text-lg text-foreground">Choose a trained city model</h2>
            </div>
            <Link to="/checkpoints" className="smallcaps text-[9px] text-muted-foreground hover:text-foreground">Open library →</Link>
          </header>

          <div className="space-y-2">
            {CHECKPOINTS_V2.map((c) => {
              const active = c.id === source.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSourceId(c.id)}
                  className={`w-full rounded-sm border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-foreground bg-[color:var(--color-muted)]"
                      : "border-border bg-background hover:border-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm text-foreground">{c.training_city}, India</span>
                    <span className="smallcaps text-[9px]" style={{ color: "#7a9461" }}>● Trained & available</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{c.id} · {c.model_type}</p>
                  <p className="mt-2 text-[11px] text-[color:var(--color-ink-deep)]">
                    Target: <span className="italic">{c.target_definition}</span>
                  </p>
                  <dl className="mt-2 grid grid-cols-4 gap-2 font-mono text-[10px] text-muted-foreground">
                    <div><dt className="smallcaps text-[8px]">Acc</dt><dd className="text-foreground">{c.metrics.accuracy.toFixed(3)}</dd></div>
                    <div><dt className="smallcaps text-[8px]">F1</dt><dd className="text-foreground">{c.metrics.macroF1.toFixed(3)}</dd></div>
                    <div><dt className="smallcaps text-[8px]">Schema</dt><dd className="text-foreground">{c.feature_schema_version.split(" ")[0]}</dd></div>
                    <div><dt className="smallcaps text-[8px]">Trained</dt><dd className="text-foreground">{c.training_date.slice(0, 7)}</dd></div>
                  </dl>
                </button>
              );
            })}

            <UnavailableSlot label="Add checkpoint" subtitle="Upload a trained .pt + schema.json" />
            <UnavailableSlot label="Import checkpoint" subtitle="From research repository" />
            <UnavailableSlot label="Request local training" subtitle="When source ≠ target morphology" />
          </div>

          <p className="mt-4 text-[11px] italic text-muted-foreground">
            Other source cities are not pre-loaded. The architecture supports future checkpoints from any city worldwide.
          </p>
        </section>

        {/* MIDDLE: connector */}
        <section className="flex flex-col items-center justify-center px-2">
          <div className="flex flex-col items-center gap-2">
            <p className="smallcaps text-[9px] text-muted-foreground">Transfer</p>
            <svg width="20" height="160" viewBox="0 0 20 160" className="text-foreground/70">
              <line x1="10" y1="0" x2="10" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
              <path d="M4 140 L10 152 L16 140 Z" fill="currentColor" />
            </svg>
            <p className="smallcaps writing-mode-vertical text-[9px] text-muted-foreground" style={{ writingMode: "vertical-rl" as const }}>
              Frozen weights
            </p>
          </div>
        </section>

        {/* RIGHT: target */}
        <section className="hairline border border-border bg-[color:var(--color-paper)] p-6">
          <header className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="smallcaps text-[10px] text-muted-foreground">02 · Select target tier-2 city</p>
              <h2 className="mt-0.5 font-serif text-lg text-foreground">Where should this model be transferred?</h2>
            </div>
            <Link to="/target" className="smallcaps text-[9px] text-muted-foreground hover:text-foreground">Open target picker →</Link>
          </header>

          <div className="space-y-2">
            {targets.map((t) => {
              const active = target?.id === t.id;
              const isExample = t.id === "mysuru";
              return (
                <button
                  key={t.id}
                  onClick={() => setTargetId(t.id)}
                  className={`w-full rounded-sm border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-foreground bg-[color:var(--color-muted)]"
                      : "border-border bg-background hover:border-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm text-foreground">{t.display_name}, {t.country}</span>
                    {isExample && (
                      <span className="smallcaps text-[9px] text-muted-foreground">Example target</span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{t.osm_place_name ?? t.id}</p>
                  <p className="mt-2 text-[11px] italic text-[color:var(--color-ink-deep)]">
                    {isExample
                      ? "Verified datasets · audit returns Transfer with caution"
                      : "No verified datasets — audit will return Insufficient data"}
                  </p>
                </button>
              );
            })}

            <Link
              to="/target"
              className="block rounded-sm border border-dashed border-border bg-background px-4 py-3 text-left transition-colors hover:border-foreground/40"
            >
              <span className="font-serif text-sm text-foreground">+ Enter any city globally</span>
              <p className="mt-1 text-[11px] italic text-muted-foreground">
                Free entry: city, country, OSM place name, optional boundary upload.
              </p>
            </Link>
          </div>
        </section>
      </div>

      {/* Summary strip */}
      <section className="mt-6 grid grid-cols-3 gap-6 border border-border bg-[color:var(--color-paper)] p-6">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Source checkpoint</p>
          <p className="mt-1 font-serif text-base text-foreground">{source.training_city} · {source.id}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{source.feature_schema_version}</p>
          <p className="mt-2 text-[11px] text-[color:var(--color-ink-deep)]">{source.interpretation_note}</p>
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Target data readiness</p>
          <p className="mt-1 font-serif text-base text-foreground">{target ? `${target.display_name}, ${target.country}` : "—"}</p>
          {target && (
            <>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {audit.readiness.filter((r) => r.status === "pass").length}/{audit.readiness.length} checks pass
              </p>
              <p className="mt-2 text-[11px] text-[color:var(--color-ink-deep)]">
                {audit.readiness.filter((r) => r.status !== "pass").length} dataset gap(s) — affordability, quality, or coverage may be imputed.
              </p>
            </>
          )}
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Transfer audit status</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: tone.dot }} />
            <p className="font-serif text-base text-foreground">{tone.label}</p>
          </div>
          <p className="mt-2 text-[11px] italic text-[color:var(--color-ink-deep)]">{audit.summary}</p>
        </div>
      </section>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link
          to="/audit"
          className="smallcaps text-[10px] rounded-sm bg-foreground px-4 py-2.5 text-background hover:bg-foreground/85"
        >
          Continue to transfer audit →
        </Link>
      </div>

      <p className="mt-8 text-[10px] text-muted-foreground">
        Source: thesis checkpoint registry · Audit logic deterministic per (source, target) pair · Predictions on target cities are projections, never ground truth.
      </p>
    </div>
  );
}

function UnavailableSlot({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-dashed border-border bg-background/40 px-4 py-2.5">
      <div>
        <p className="font-serif text-sm text-muted-foreground">{label}</p>
        <p className="text-[10px] italic text-muted-foreground">{subtitle}</p>
      </div>
      <span className="smallcaps text-[9px] text-muted-foreground">Coming soon</span>
    </div>
  );
}
