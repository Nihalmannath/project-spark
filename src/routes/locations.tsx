import { createFileRoute } from "@tanstack/react-router";
import { CITIES, evidenceTone } from "../data/platform";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { useCity } from "../lib/city-context";

export const Route = createFileRoute("/locations")({
  head: () => ({ meta: [{ title: "Locations — Food Spatial Intelligence Platform" }] }),
  component: Locations,
});

function Locations() {
  const { city, setCityId } = useCity();
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl text-foreground">Locations</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Each city carries an evidence state. Available cities have a local model.
          Scenario cities carry a transfer projection only. Coming-soon cities have no predictions.
        </p>
      </header>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {CITIES.map((c) => {
          const tone = evidenceTone(c.evidence_state);
          const active = c.id === city.id;
          return (
            <button
              key={c.id}
              onClick={() => setCityId(c.id)}
              className={`rounded-sm border bg-background p-5 text-left transition-all ${
                active ? "border-foreground shadow-sm" : "border-border hover:border-foreground/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl text-foreground">{c.display_name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {c.osm_place_name}
                  </p>
                </div>
                <EvidenceBadge state={c.evidence_state} size="md" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="smallcaps text-[9px] text-muted-foreground">Region</p>
                  <p className="mt-0.5 text-foreground">{c.region}</p>
                </div>
                <div>
                  <p className="smallcaps text-[9px] text-muted-foreground">Readiness</p>
                  <p className="mt-0.5 font-mono text-foreground">{Math.round(c.data_readiness * 100)}%</p>
                </div>
                <div>
                  <p className="smallcaps text-[9px] text-muted-foreground">Evidence</p>
                  <p className="mt-0.5 text-foreground" style={{ color: tone.dot }}>
                    {tone.text}
                  </p>
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-3 text-[11px] italic text-muted-foreground">
                {c.caveat}
              </p>
            </button>
          );
        })}
        <div className="rounded-sm border border-dashed border-border p-5">
          <p className="smallcaps text-[9px] text-muted-foreground">+ Request new region</p>
          <p className="mt-1 font-serif text-base text-foreground">Add a city</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Provide OSM place name, boundary, and a contact. The team reviews requests by quarter.
          </p>
        </div>
      </div>
    </div>
  );
}
