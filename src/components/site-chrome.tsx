import { Link } from "@tanstack/react-router";
import { TransferConnector } from "./TransferConnector";

const WORKFLOW = [
  { to: "/", label: "01 · Source Model" },
  { to: "/target", label: "02 · Target City" },
  { to: "/audit", label: "03 · Transfer Audit" },
  { to: "/run", label: "04 · Run Transfer" },
  { to: "/results", label: "05 · Results" },
] as const;

const SECONDARY = [
  { to: "/scenario-lab", label: "Scenario Lab" },
  { to: "/checkpoints", label: "Checkpoint Library" },
  { to: "/exports", label: "Exports" },
] as const;

export function SiteHeader() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="smallcaps text-[9px] text-muted-foreground">
            Cross-city model transfer · planning prototype
          </span>
          <span className="font-serif text-sm font-medium tracking-tight text-foreground">
            Urban Food Environment · Transfer Workspace
          </span>
        </Link>
        <TransferConnector />
      </div>
      <div className="hairline-top">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-5 px-6 py-2 overflow-x-auto">
          <div className="flex items-center gap-5">
            {WORKFLOW.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="smallcaps text-[10px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "smallcaps text-[10px] whitespace-nowrap text-foreground border-b-2 border-foreground pb-1.5 -mb-2" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {SECONDARY.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="smallcaps text-[9px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "smallcaps text-[9px] whitespace-nowrap text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="hairline-top mt-16 bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>Cross-city projections are not ground truth. Use relative scenario change as the signal.</span>
        <span className="smallcaps text-[10px]">MSc thesis prototype · 2026</span>
      </div>
    </footer>
  );
}
