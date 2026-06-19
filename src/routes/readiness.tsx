import { createFileRoute } from "@tanstack/react-router";
import { ReadinessMatrix } from "../components/ReadinessTable";

export const Route = createFileRoute("/readiness")({
  head: () => ({ meta: [{ title: "Data Readiness — Food Spatial Intelligence Platform" }] }),
  component: Readiness,
});

function Readiness() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl text-foreground">Data readiness</h1>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Per-dataset status across cities. <span className="font-mono">Verified</span> means the
          file is present, sourced, and dated. <span className="font-mono">Partial</span> means
          imputed or incomplete. <span className="font-mono">Missing</span> blocks any model run.
        </p>
      </header>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <Dot color="#7a9461" label="Verified — local source" />
        <Dot color="#d59e71" label="Partial — imputed / incomplete" />
        <Dot color="#d8dde4" label="Missing — blocks model run" />
      </div>
      <div className="mt-4">
        <ReadinessMatrix />
      </div>
    </div>
  );
}
function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
