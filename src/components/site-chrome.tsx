import { Link } from "@tanstack/react-router";
import { CitySelector } from "./CitySelector";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/locations", label: "Locations" },
  { to: "/readiness", label: "Data Readiness" },
  { to: "/runs", label: "Model Runs" },
  { to: "/scenario-lab", label: "Scenario Lab" },
  { to: "/results", label: "Results" },
  { to: "/exports", label: "Exports" },
] as const;

export function SiteHeader() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="smallcaps text-[9px] text-muted-foreground">
            Food Spatial Intelligence · Planning prototype
          </span>
          <span className="font-serif text-sm font-medium tracking-tight text-foreground">
            Urban Food Environment Decision Support
          </span>
        </Link>
        <CitySelector />
      </div>
      <div className="hairline-top">
        <nav className="mx-auto flex max-w-[1400px] items-center gap-5 px-6 py-2 overflow-x-auto">
          {NAV.map((item) => (
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
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="hairline-top mt-16 bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>Research and planning tool — never present scenario projections as ground truth.</span>
        <span className="smallcaps text-[10px]">MSc thesis prototype · 2026</span>
      </div>
    </footer>
  );
}
