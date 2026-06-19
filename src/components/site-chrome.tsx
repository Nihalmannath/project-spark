import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/methodology", label: "Methodology" },
  { to: "/notebooks", label: "Notebooks" },
  { to: "/comparison", label: "Comparison" },
  { to: "/map", label: "Map" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="group flex flex-col leading-tight">
          <span className="smallcaps text-[10px] text-muted-foreground">
            MSc Thesis · 2026
          </span>
          <span className="font-serif text-lg font-medium tracking-tight text-foreground">
            GraphSAGE × Food Environments
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="smallcaps text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "smallcaps text-[11px] text-foreground" }}
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
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Thesis</p>
          <p className="mt-2 font-serif text-base text-foreground">
            GraphSAGE Food Desert Identification — Bengaluru
          </p>
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Study area</p>
          <p className="mt-2 text-sm text-foreground">
            31,645 labelled road intersections across the BBMP boundary, 198 wards.
          </p>
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Headline result</p>
          <p className="mt-2 text-sm text-foreground">
            03c — macro-F1 <span className="metric-num">0.506</span> · 08 — accuracy{" "}
            <span className="metric-num">0.939</span>
          </p>
        </div>
      </div>
      <div className="hairline-top">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs text-muted-foreground">
          <span>© 2026 · Research dashboard</span>
          <span className="smallcaps text-[10px]">Built with TanStack Start</span>
        </div>
      </div>
    </footer>
  );
}
