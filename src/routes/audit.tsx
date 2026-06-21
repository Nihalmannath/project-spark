import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { buildAudit, useTransfer } from "../lib/transfer-context";

export const Route = createFileRoute("/audit")({
  component: PreparingScreen,
});

const STEPS = [
  "Loading city boundary",
  "Mapping food outlets and grocery stores",
  "Building your map",
];

function PreparingScreen() {
  const { source, target } = useTransfer();
  const audit = buildAudit(source, target);
  const blocked = audit.verdict === "INSUFFICIENT" || audit.verdict === "LOCAL_TRAINING";
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (blocked) return;
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= STEPS.length) {
        setStep(STEPS.length - 1);
        setDone(true);
        return;
      }
      setStep(i);
      setTimeout(tick, 900);
    };
    const t = setTimeout(tick, 900);
    return () => clearTimeout(t);
  }, [blocked]);

  const cityName = target?.display_name ?? "your city";

  if (blocked) {
    return (
      <div className="mx-auto max-w-[600px] px-6 pt-16 pb-16 text-center">
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-foreground">
          Not enough data yet
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-ink-deep)]">
          This city doesn't have enough data available to generate a food access map.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block smallcaps text-[10px] text-muted-foreground hover:text-foreground"
        >
          ← Choose a different city
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-6 pt-16 pb-16">
      <header className="mb-10">
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-foreground">
          {done ? "Your map is ready" : "Preparing your analysis…"}
        </h1>
        {!done && (
          <p className="mt-3 text-sm text-[color:var(--color-ink-deep)]">
            We're getting the food access data ready for {cityName}. This only takes a moment.
          </p>
        )}
      </header>

      <ol className="space-y-5">
        {STEPS.map((label, i) => {
          const active = step === i && !done;
          const complete = step > i || done;
          return (
            <li key={label} className="flex items-center gap-4">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-medium ${
                  complete
                    ? "border-foreground bg-foreground text-background"
                    : active
                      ? "border-foreground bg-background text-foreground animate-pulse"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {complete ? "✓" : String(i + 1)}
              </div>
              <span
                className={`text-sm ${
                  complete || active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-muted)]">
          <div
            className="h-full bg-foreground transition-[width] duration-700"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      )}

      {done && (
        <div className="mt-10 flex items-center gap-5">
          <Link
            to="/results"
            search={{ city: "bengaluru", view: "road" }}
            className="smallcaps text-[10px] rounded-sm bg-foreground px-5 py-3 text-background hover:bg-foreground/85"
          >
            View food access map →
          </Link>
          <Link to="/" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">
            ← Choose different city
          </Link>
        </div>
      )}
    </div>
  );
}
