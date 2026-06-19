import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/dashboard", label: "Map Dashboard" },
  { to: "/comparison", label: "Comparison" },
  { to: "/validation", label: "Validation" },
  { to: "/features", label: "Features" },
  { to: "/checkpoints", label: "Checkpoints" },
  { to: "/scenario", label: "Scenario" },
] as const;

export function SiteHeader() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="group flex flex-col leading-tight">
          <span className="smallcaps text-[10px] text-muted-foreground">
            Spatial Decision Support · Prototype
          </span>
          <span className="font-serif text-base font-medium tracking-tight text-foreground">
            Food Spatial Intelligence Platform
          </span>
        </Link>
        <nav className="hidden flex-wrap items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="smallcaps text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "smallcaps text-[10px] text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="hairline-top mt-24 bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-3">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Project</p>
          <p className="mt-2 font-serif text-base text-foreground">
            Food Spatial Intelligence Platform
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Graph-based diagnosis of urban food environments — MSc thesis prototype.
          </p>
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Study area</p>
          <p className="mt-2 text-sm text-foreground">
            Bengaluru · 31,645 road intersections · adaptive hex catchments
          </p>
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Headline checkpoints</p>
          <p className="mt-2 text-sm text-foreground">
            03c macro-F1 <span className="metric-num">0.506</span> · 08 accuracy{" "}
            <span className="metric-num">0.939</span>
          </p>
        </div>
      </div>
      <div className="hairline-top">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-xs text-muted-foreground">
          <span>Planning-support prototype · not a final policy tool</span>
          <span className="smallcaps text-[10px]">Built with TanStack Start</span>
        </div>
      </div>
    </footer>
  );
}
