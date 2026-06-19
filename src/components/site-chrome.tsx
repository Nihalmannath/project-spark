import { Link } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/", label: "Cities", exact: true },
  { to: "/results", label: "Map", exact: false },
  { to: "/scenario-lab", label: "What If?", exact: false },
  { to: "/exports", label: "Download", exact: false },
] as const;

export function SiteHeader() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="smallcaps text-[9px] text-muted-foreground">
            MSc thesis prototype · 2026
          </span>
          <span className="font-serif text-sm font-medium tracking-tight text-foreground">
            Food Access Planning Tool
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="smallcaps text-[10px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "smallcaps text-[10px] whitespace-nowrap text-foreground border-b-2 border-foreground pb-1 -mb-1" }}
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

export function SiteFooter() {
  return (
    <footer className="hairline-top mt-16 bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>Maps show estimated patterns to support planning discussions. Not a substitute for local research or ground-truth surveys.</span>
        <span className="smallcaps text-[10px]">MSc thesis prototype · 2026</span>
      </div>
    </footer>
  );
}
