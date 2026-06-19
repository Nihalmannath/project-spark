import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTransfer } from "../lib/transfer-context";

export const Route = createFileRoute("/target")({
  component: TargetPicker,
});

function TargetPicker() {
  const { targets, target, setTargetId, registerCustomTarget, source } = useTransfer();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({
    display_name: "",
    country: "",
    region: "",
    osm_place_name: "",
    urban_population: "",
    notes: "",
    lon: "",
    lat: "",
  });

  const filtered = targets.filter((t) =>
    `${t.display_name} ${t.country} ${t.osm_place_name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  function addCustom() {
    if (!draft.display_name.trim() || !draft.country.trim()) return;
    const id = `custom_${Date.now()}`;
    const lon = parseFloat(draft.lon) || 0;
    const lat = parseFloat(draft.lat) || 0;
    registerCustomTarget({
      id,
      display_name: draft.display_name.trim(),
      country: draft.country.trim(),
      region: draft.region.trim() || undefined,
      osm_place_name: draft.osm_place_name.trim() || undefined,
      urban_population: draft.urban_population ? Number(draft.urban_population) : undefined,
      notes: draft.notes.trim() || undefined,
      center: [lon, lat],
      zoom: 11,
    });
    setTargetId(id);
    setDraft({ display_name: "", country: "", region: "", osm_place_name: "", urban_population: "", notes: "", lon: "", lat: "" });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-16">
      <header className="mb-6">
        <p className="smallcaps text-[10px] text-muted-foreground">Transfer workspace · step 02</p>
        <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
          Where should this model be transferred?
        </h1>
        <p className="mt-2 max-w-[820px] text-sm italic text-[color:var(--color-ink-deep)]">
          Any Tier-2 city in the world is a valid target. Mysuru is the working example.
          Predictions only appear after the transfer audit clears data readiness.
        </p>
      </header>

      <div className="mb-4 flex items-center gap-4 text-[11px]">
        <span className="smallcaps text-[10px] text-muted-foreground">Source model</span>
        <span className="font-serif text-foreground">{source.training_city} · {source.id}</span>
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        {/* Known + search */}
        <section className="hairline border border-border bg-[color:var(--color-paper)] p-6">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground">Pre-registered targets</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, country, OSM place…"
              className="w-72 rounded-sm border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </header>

          <ul className="space-y-2">
            {filtered.length === 0 && (
              <li className="text-[11px] italic text-muted-foreground">No matches. Add a custom target →</li>
            )}
            {filtered.map((t) => {
              const active = target?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setTargetId(t.id)}
                    className={`w-full rounded-sm border px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-foreground bg-[color:var(--color-muted)]"
                        : "border-border bg-background hover:border-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm text-foreground">
                        {t.display_name}, {t.country}
                      </span>
                      <span className="smallcaps text-[9px] text-muted-foreground">
                        {t.kind === "known" ? "Datasets wired" : "Custom"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {t.osm_place_name ?? t.id} · {t.center[0].toFixed(3)}, {t.center[1].toFixed(3)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* World map placeholder — schematic, not a real basemap */}
          <div className="mt-6">
            <p className="smallcaps text-[10px] text-muted-foreground">World coverage</p>
            <WorldMapSchematic targets={targets} activeId={target?.id ?? null} />
          </div>
        </section>

        {/* Custom entry */}
        <section className="hairline border border-border bg-[color:var(--color-paper)] p-6">
          <h2 className="font-serif text-lg text-foreground">Register a new target city</h2>
          <p className="mt-1 text-[11px] italic text-muted-foreground">
            Free entry. The custom target enters the audit at <span className="font-mono not-italic">INSUFFICIENT</span>
            until datasets are ingested.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="City name *" value={draft.display_name} onChange={(v) => setDraft({ ...draft, display_name: v })} />
            <Field label="Country *" value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} />
            <Field label="Region / state" value={draft.region} onChange={(v) => setDraft({ ...draft, region: v })} />
            <Field label="OSM place name" value={draft.osm_place_name} onChange={(v) => setDraft({ ...draft, osm_place_name: v })} />
            <Field label="Urban population" value={draft.urban_population} onChange={(v) => setDraft({ ...draft, urban_population: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Lon" value={draft.lon} onChange={(v) => setDraft({ ...draft, lon: v })} />
              <Field label="Lat" value={draft.lat} onChange={(v) => setDraft({ ...draft, lat: v })} />
            </div>
            <div className="col-span-2">
              <Field label="Target-city notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
            </div>
            <div className="col-span-2 rounded-sm border border-dashed border-border bg-background/40 px-3 py-2.5">
              <p className="smallcaps text-[9px] text-muted-foreground">Optional boundary upload</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                Drop a GeoJSON polygon — disabled in prototype.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[10px] italic text-muted-foreground">
              No prediction is shown until readiness checks pass.
            </p>
            <button
              onClick={addCustom}
              disabled={!draft.display_name.trim() || !draft.country.trim()}
              className="smallcaps text-[10px] rounded-sm bg-foreground px-3 py-2 text-background disabled:opacity-40"
            >
              Register target
            </button>
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link to="/" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">← Back to source</Link>
        <Link
          to="/audit"
          className="smallcaps text-[10px] rounded-sm bg-foreground px-4 py-2.5 text-background hover:bg-foreground/85"
        >
          Continue to transfer audit →
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="smallcaps text-[9px] text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
      />
    </label>
  );
}

function WorldMapSchematic({
  targets,
  activeId,
}: {
  targets: { id: string; display_name: string; center: [number, number] }[];
  activeId: string | null;
}) {
  // Equirectangular projection within a 600x300 viewBox
  const w = 600, h = 300;
  const proj = (lon: number, lat: number) => [
    ((lon + 180) / 360) * w,
    ((90 - lat) / 180) * h,
  ] as const;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full border border-border bg-background">
      {/* graticule */}
      {[-120, -60, 0, 60, 120].map((lon) => (
        <line key={`v${lon}`} x1={proj(lon, 90)[0]} y1={0} x2={proj(lon, 90)[0]} y2={h} stroke="#e3ddd1" strokeWidth="0.5" />
      ))}
      {[-60, -30, 0, 30, 60].map((lat) => (
        <line key={`h${lat}`} x1={0} y1={proj(0, lat)[1]} x2={w} y2={proj(0, lat)[1]} stroke="#e3ddd1" strokeWidth="0.5" />
      ))}
      <rect x="0" y="0" width={w} height={h} fill="none" stroke="#cfc8b9" strokeWidth="0.5" />
      {targets.map((t) => {
        const [x, y] = proj(t.center[0], t.center[1]);
        const active = t.id === activeId;
        return (
          <g key={t.id}>
            <circle cx={x} cy={y} r={active ? 5 : 3.5} fill={active ? "#3d5a80" : "#d59e71"} stroke="#1a1a1a" strokeWidth="0.5" />
            <text x={x + 7} y={y + 3} fontSize="8" fontFamily="Roboto Mono, monospace" fill="#465468">{t.display_name}</text>
          </g>
        );
      })}
      <text x="8" y={h - 6} fontSize="7" fontFamily="Roboto Mono, monospace" fill="#8e9db1">
        Equirectangular schematic · not a basemap
      </text>
    </svg>
  );
}
