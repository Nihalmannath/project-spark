import { useState } from "react";
import { FEATURE_GROUPS, type FeatureDef } from "../data/mockData";

export function FeatureInspector() {
  const allFeatures = FEATURE_GROUPS.flatMap((g) => g.features.map((f) => ({ g, f })));
  const [selectedKey, setSelectedKey] = useState(allFeatures[0].f.key);
  const selected = allFeatures.find((x) => x.f.key === selectedKey)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        {FEATURE_GROUPS.map((g) => (
          <div key={g.key}>
            <p className="smallcaps text-[10px] text-muted-foreground">{g.name}</p>
            <ul className="mt-2 space-y-1">
              {g.features.map((f) => (
                <li key={f.key}>
                  <button
                    onClick={() => setSelectedKey(f.key)}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedKey === f.key
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <FeatureDetail def={selected.f} group={selected.g.name} />
    </div>
  );
}

function FeatureDetail({ def, group }: { def: FeatureDef; group: string }) {
  const dirColor =
    def.direction === "higher-is-better" ? "var(--color-oasis)" :
    def.direction === "lower-is-better" ? "var(--color-swamp)" :
    "var(--color-mirage)";
  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="smallcaps text-[10px] text-muted-foreground">{group}</p>
      <h2 className="mt-1 font-serif text-2xl font-medium text-foreground">{def.name}</h2>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{def.key}</p>

      <Section title="What it is">{def.explanation}</Section>
      <Section title="Why it matters for food access">{def.whyItMatters}</Section>
      <Section title="Example interpretation">{def.interpretation}</Section>

      <div className="mt-6 flex items-center gap-2">
        <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: dirColor }} />
        <span className="smallcaps text-[10px] text-foreground">
          {def.direction.replace(/-/g, " ")}
        </span>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="smallcaps text-[10px] text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{children}</p>
    </div>
  );
}
