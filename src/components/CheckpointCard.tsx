import type { Checkpoint } from "../data/mockData";

export function CheckpointCard({ cp }: { cp: Checkpoint }) {
  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Checkpoint · Notebook {cp.notebook}</p>
          <h3 className="mt-1 font-serif text-lg font-medium text-foreground">{cp.name}</h3>
        </div>
        <span className="smallcaps rounded-full border border-border bg-secondary px-2 py-0.5 text-[9px] text-foreground">
          {cp.targetType}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="smallcaps text-[9px] text-muted-foreground">Trained city</dt>
          <dd className="mt-0.5 text-foreground">{cp.trainedCity}</dd>
        </div>
        <div>
          <dt className="smallcaps text-[9px] text-muted-foreground">Feature set</dt>
          <dd className="mt-0.5 text-foreground">{cp.featureSet}</dd>
        </div>
      </dl>

      <Block title="Safe inference conditions" tone="ok" items={cp.safeConditions} />
      <Block title="Unsafe / out-of-scope" tone="warn" items={cp.unsafeConditions} />
      <Block title="Data quality requirements" tone="info" items={cp.dataRequirements} />
    </article>
  );
}

function Block({
  title, tone, items,
}: { title: string; tone: "ok" | "warn" | "info"; items: string[] }) {
  const dot =
    tone === "ok" ? "var(--color-oasis)" :
    tone === "warn" ? "var(--color-swamp)" :
    "var(--color-mirage)";
  return (
    <div className="mt-5">
      <p className="smallcaps flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: dot }} />
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-xs text-foreground">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground">·</span>
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
