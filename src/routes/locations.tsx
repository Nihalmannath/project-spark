import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CITIES, evidenceTone } from "../data/platform";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { useCity } from "../lib/city-context";

export const Route = createFileRoute("/locations")({
  head: () => ({ meta: [{ title: "Locations — Food Spatial Intelligence Platform" }] }),
  component: Locations,
});

function Locations() {
  const { city, setCityId } = useCity();
  const scenarioCity = city.id === "bengaluru" || city.id === "mysuru" ? city.id : null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "runnable" | "roadmap">("all");
  const visibleCities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return CITIES.filter((candidate) => {
      const matchesQuery =
        !normalized ||
        `${candidate.display_name} ${candidate.region} ${candidate.country}`
          .toLowerCase()
          .includes(normalized);
      const matchesFilter =
        filter === "all" ||
        (filter === "runnable" && candidate.evidence_state !== "COMING_SOON") ||
        (filter === "roadmap" && candidate.evidence_state === "COMING_SOON");
      return matchesQuery && matchesFilter;
    });
  }, [filter, query]);
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl text-foreground">Locations</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Each city carries an evidence state. Available cities have local evidence. Scenario cities
          carry an OSM-derived projection only. Coming-soon cities have no predictions.
        </p>
      </header>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-sm border border-border bg-card p-1">
          {(["all", "runnable", "roadmap"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`rounded-sm px-3 py-2 text-[11px] capitalize transition-colors ${
                filter === option
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {option === "runnable" ? "Available now" : option}
            </button>
          ))}
        </div>
        <label className="flex min-w-[260px] items-center gap-2 border-b border-border px-1 py-2 text-[11px] focus-within:border-foreground">
          <span className="text-muted-foreground">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="City or region"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <div>
          <p className="text-[11px] font-medium text-foreground">Selected: {city.display_name}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {scenarioCity
              ? "A road-node scenario is available for this city."
              : "This city is selectable for roadmap and readiness review; predictions are withheld."}
          </p>
        </div>
        {scenarioCity ? (
          <Link
            to="/scenario-lab"
            search={{ city: scenarioCity }}
            className="rounded-sm bg-foreground px-4 py-2.5 smallcaps text-[10px] text-background hover:bg-foreground/85"
          >
            Open {city.display_name} scenario →
          </Link>
        ) : (
          <span className="rounded-full border border-border px-3 py-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            Roadmap only
          </span>
        )}
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visibleCities.map((c) => {
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
                  <p className="mt-0.5 font-mono text-foreground">
                    {Math.round(c.data_readiness * 100)}%
                  </p>
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
        {visibleCities.length === 0 && (
          <div className="border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2">
            No city matches this search. Clear the search or view the roadmap.
          </div>
        )}
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
