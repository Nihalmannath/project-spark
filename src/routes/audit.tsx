import { createFileRoute, Link } from "@tanstack/react-router";
import { buildAudit, useTransfer, verdictTone, type AuditCheck } from "../lib/transfer-context";

export const Route = createFileRoute("/audit")({
  component: AuditScreen,
});

function AuditScreen() {
  const { source, target } = useTransfer();
  const audit = buildAudit(source, target);
  const tone = verdictTone(audit.verdict);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-16">
      <header className="mb-6">
        <p className="smallcaps text-[10px] text-muted-foreground">Transfer workspace · step 03</p>
        <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
          Can this model be responsibly transferred?
        </h1>
        <p className="mt-2 max-w-[820px] text-sm italic text-[color:var(--color-ink-deep)]">
          {audit.summary}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-6 border border-border bg-[color:var(--color-paper)] p-5">
        <Pair k="Source model" v={`${source.training_city} · ${source.id}`} sub={source.model_type} />
        <Arrow />
        <Pair k="Target city" v={target ? `${target.display_name}, ${target.country}` : "—"} sub={target?.osm_place_name ?? "Not selected"} />
        <div className="flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2">
          <span className="h-2 w-2 rounded-full" style={{ background: tone.dot }} />
          <span className="smallcaps text-[10px] text-foreground">{tone.label}</span>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6">
        <AuditGroup
          title="Data readiness"
          subtitle="Inputs the target city must provide"
          checks={audit.readiness}
        />
        <AuditGroup
          title="Feature compatibility"
          subtitle="Source vs target distributions"
          checks={audit.feature_compat}
        />
        <AuditGroup
          title="Context compatibility"
          subtitle="Urban, market, and geographic context"
          checks={audit.context_compat}
        />
      </div>

      <section className="mt-8 border border-border bg-[color:var(--color-paper)] p-6">
        <h3 className="font-serif text-base text-foreground">Verdict semantics</h3>
        <ul className="mt-3 grid grid-cols-4 gap-4 text-[11px] text-[color:var(--color-ink-deep)]">
          <li><span className="smallcaps text-[9px]" style={{ color: "#7a9461" }}>● Ready</span><p className="mt-1">All checks pass. Projection is interpretable.</p></li>
          <li><span className="smallcaps text-[9px]" style={{ color: "#d59e71" }}>● Caution</span><p className="mt-1">Run the transfer, but trust relative change over absolute class.</p></li>
          <li><span className="smallcaps text-[9px]" style={{ color: "#aab3bf" }}>● Insufficient</span><p className="mt-1">Required datasets missing. Ingest before running.</p></li>
          <li><span className="smallcaps text-[9px]" style={{ color: "#b85c4a" }}>● Local training</span><p className="mt-1">Morphology too distant — train a target-city model instead.</p></li>
        </ul>
        <p className="mt-4 text-[10px] italic text-muted-foreground">
          The word "safe" is never used. Transfer accuracy cannot be quantified without local target labels.
        </p>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <Link to="/target" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">← Back to target</Link>
        <Link
          to="/run"
          className={`smallcaps text-[10px] rounded-sm px-4 py-2.5 ${
            audit.verdict === "INSUFFICIENT" || audit.verdict === "LOCAL_TRAINING"
              ? "bg-muted text-muted-foreground"
              : "bg-foreground text-background hover:bg-foreground/85"
          }`}
        >
          {audit.verdict === "INSUFFICIENT" ? "Cannot run — insufficient data" : "Continue to run transfer →"}
        </Link>
      </div>
    </div>
  );
}

function AuditGroup({ title, subtitle, checks }: { title: string; subtitle: string; checks: AuditCheck[] }) {
  return (
    <section className="hairline border border-border bg-[color:var(--color-paper)] p-5">
      <header className="mb-3">
        <p className="smallcaps text-[10px] text-muted-foreground">{title}</p>
        <p className="font-serif text-sm text-foreground">{subtitle}</p>
      </header>
      <ul className="space-y-1.5">
        {checks.length === 0 && <li className="text-[11px] italic text-muted-foreground">Not evaluated — select a target.</li>}
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2.5 border-b border-border/60 pb-1.5 last:border-0">
            <Mark status={c.status} />
            <div className="flex-1">
              <p className="text-[12px] text-foreground">{c.label}</p>
              {c.note && <p className="font-mono text-[10px] text-muted-foreground">{c.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mark({ status }: { status: "pass" | "warn" | "fail" }) {
  const color = status === "pass" ? "#7a9461" : status === "warn" ? "#d59e71" : "#b85c4a";
  const glyph = status === "pass" ? "✓" : status === "warn" ? "!" : "✕";
  return (
    <span
      className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-background"
      style={{ background: color }}
    >
      {glyph}
    </span>
  );
}

function Pair({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <p className="smallcaps text-[10px] text-muted-foreground">{k}</p>
      <p className="mt-0.5 font-serif text-base text-foreground">{v}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="46" height="14" viewBox="0 0 46 14" className="text-foreground/60">
      <line x1="2" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M40 3 L44 7 L40 11 Z" fill="currentColor" />
    </svg>
  );
}
