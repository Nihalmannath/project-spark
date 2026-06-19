import { createFileRoute } from "@tanstack/react-router";
import { CheckpointCard } from "../components/CheckpointCard";
import { CHECKPOINTS } from "../data/mockData";

export const Route = createFileRoute("/checkpoints")({
  head: () => ({
    meta: [
      { title: "Checkpoints & Inference — Food Spatial Intelligence" },
      { name: "description", content: "Safe inference conditions for each trained checkpoint." },
    ],
  }),
  component: CheckpointsPage,
});

function CheckpointsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 max-w-3xl">
        <p className="smallcaps text-[10px] text-muted-foreground">Checkpoint / Inference</p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-foreground">
          Safe inference and checkpoint scope
        </h1>
      </header>

      <div
        role="note"
        className="mb-8 rounded-md border-l-4 border-[var(--color-swamp)] bg-card p-4 shadow-sm"
      >
        <p className="smallcaps text-[10px] text-[var(--color-swamp)]">Planning support, not policy</p>
        <p className="mt-1 text-sm text-foreground">
          Predictions are planning-support outputs, not final policy decisions. They require local
          validation against ground-truth surveys before any operational use.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {CHECKPOINTS.map((cp) => (
          <CheckpointCard key={cp.id} cp={cp} />
        ))}
      </div>
    </div>
  );
}
