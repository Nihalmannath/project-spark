import { useState, useRef, useEffect } from "react";
import { CITIES } from "../data/platform";
import { useCity } from "../lib/city-context";
import { EvidenceBadge } from "./EvidenceBadge";

export function CitySelector() {
  const { city, setCityId } = useCity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-sm border border-border bg-background px-3 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="smallcaps text-[9px] text-muted-foreground">Location</span>
        <span className="font-serif text-sm text-foreground">{city.display_name}</span>
        <EvidenceBadge state={city.evidence_state} />
        <span className="text-xs text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-[320px] rounded-sm border border-border bg-background shadow-lg">
          <ul className="divide-y divide-border">
            {CITIES.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setCityId(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${
                    c.id === city.id ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-serif text-sm text-foreground">{c.display_name}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {c.osm_place_name}
                    </div>
                  </div>
                  <EvidenceBadge state={c.evidence_state} />
                </button>
              </li>
            ))}
            <li>
              <button
                disabled
                className="flex w-full items-center justify-between px-3 py-2.5 text-left opacity-60"
              >
                <span className="font-serif text-sm text-foreground">Request new region</span>
                <span className="smallcaps text-[9px] text-muted-foreground">+ submit</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
