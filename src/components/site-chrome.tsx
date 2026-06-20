import { Link } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/", label: "Overview", exact: true },
  { to: "/cities", label: "Cities", exact: false },
  { to: "/results", label: "Evidence Map", exact: false },
  { to: "/scenario-lab", label: "Transfer & Scenario", exact: false },
  { to: "/checkpoints", label: "Model & Validation", exact: false },
  { to: "/methodology", label: "Methodology", exact: false },
] as const;

export function SiteHeader() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-sm border-2 border-foreground font-serif text-sm font-bold">
            F
          </span>
          <span className="flex flex-col leading-tight">
            <span className="smallcaps text-[9px] tracking-[0.14em] text-muted-foreground">
              Food Spatial Intelligence
            </span>
            <span className="font-serif text-sm font-medium tracking-tight text-foreground">
              Map your city&apos;s food climate
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <Pill dot="#7a9461" label="Available" />
          <Pill dot="#d59e71" label="Scenario" />
          <Pill dot="#64748b" label="Coming soon" />
        </div>
      </div>
      <div className="hairline-top">
        <nav className="mx-auto flex max-w-[1400px] items-center gap-6 overflow-x-auto px-6 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="smallcaps text-[10px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className:
                  "smallcaps text-[10px] whitespace-nowrap text-foreground border-b-2 border-foreground pb-1.5 -mb-2",
              }}
              activeOptions={{ exact: item.exact }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Pill({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 smallcaps text-[9px] text-muted-foreground">
      <span className="size-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="hairline-top mt-16 bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>
          Labels are rule-based proxy labels, not survey ground truth. Cross-city predictions are
          projections — read relative scenario change, not absolute class.
        </span>
        <span className="smallcaps text-[10px]">MSc thesis prototype · 2026</span>
      </div>
    </footer>
  );
}
