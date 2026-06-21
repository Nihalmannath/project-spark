import { Link } from "@tanstack/react-router";
import { ArrowDown, CheckCircle2, Database, GitBranch, ShieldCheck, XCircle } from "lucide-react";
import { Reveal } from "./Reveal";
import { LABELS } from "../data/labels";
import {
  ALLOWED_FEATURE_GROUPS,
  CONFIDENCE_FIELDS,
  EXCLUDED_FEATURE_GROUPS,
  NORMALISATION_NOTES,
  WARD_LABEL_PIPELINE,
  WARD_LABEL_RULES,
  WARD_SCORE_FORMULAS,
  WARD_SOURCE_LINEAGE,
  type FeaturePolicyGroup,
  type LineagePolicy,
} from "../data/wardLabelLineage";

const POLICY_STYLE: Record<
  LineagePolicy,
  { label: string; background: string; foreground: string; border: string }
> = {
  "target-and-local": {
    label: "Target + local predictors",
    background: "#eef3e8",
    foreground: "#50683f",
    border: "#b9ca9d",
  },
  "target-only": {
    label: "Target / audit only",
    background: "#fbeede",
    foreground: "#7a4a1f",
    border: "#d59e71",
  },
  "predictor-only": {
    label: "Predictor only",
    background: "#eaf0f7",
    foreground: "#3d5a80",
    border: "#8e9db1",
  },
  "adaptive-target": {
    label: "Adaptive target",
    background: "#fff7df",
    foreground: "#755b13",
    border: "#ffe09d",
  },
};

export function WardLabelConstruction() {
  return (
    <Reveal className="border-t border-border py-14">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Before model training</p>
          <h2 className="mt-2 max-w-3xl font-serif text-3xl font-light text-foreground">
            How every raw source became a ward label — without leaking that answer into the model.
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Notebook 01 builds one transparent proxy target for each of 198 BBMP wards. The
            GraphSAGE notebooks then reuse selected raw evidence at road-node scale, while blocking
            the final ward scores, labels, and audit fields from the predictor matrix.
          </p>
        </div>
        <Link
          to="/notebooks/$id"
          params={{ id: "01" }}
          className="smallcaps inline-flex rounded-sm border border-border bg-card px-3 py-2 text-[9px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          Open Notebook 01 record →
        </Link>
      </div>

      <div className="mt-8 grid overflow-hidden rounded-sm border border-border bg-card md:grid-cols-5">
        {WARD_LABEL_PIPELINE.map((step, index) => (
          <article
            key={step.number}
            className={`relative p-5 ${index < WARD_LABEL_PIPELINE.length - 1 ? "border-b border-border md:border-b-0 md:border-r" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="metric-num text-xs text-[color:var(--color-navy)]">
                {step.number}
              </span>
              {index < WARD_LABEL_PIPELINE.length - 1 && (
                <ArrowDown
                  className="size-3 text-muted-foreground md:-rotate-90"
                  aria-hidden="true"
                />
              )}
            </div>
            <h3 className="mt-4 text-sm font-medium text-foreground">{step.title}</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </div>

      <section className="mt-12" aria-labelledby="ward-source-lineage-title">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-[color:var(--color-navy)]" aria-hidden="true" />
          <h3 id="ward-source-lineage-title" className="text-base font-medium text-foreground">
            Raw-to-computed lineage
          </h3>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          “Target” means the ward-label build. “Local predictors” means the same underlying source
          is independently summarised around each road node rather than copying its ward aggregate.
        </p>

        <div className="mt-5 overflow-x-auto rounded-sm border border-border bg-card">
          <table className="w-full min-w-[1160px] table-fixed text-left text-[11px] leading-relaxed">
            <caption className="sr-only">
              Every raw dataset, its computed ward fields, score domains, and model feature policy
            </caption>
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="w-[19%] p-4 font-medium">
                  Raw source
                </th>
                <th scope="col" className="w-[20%] p-4 font-medium">
                  Raw evidence
                </th>
                <th scope="col" className="w-[27%] p-4 font-medium">
                  Computed ward data
                </th>
                <th scope="col" className="w-[13%] p-4 font-medium">
                  Score role
                </th>
                <th scope="col" className="w-[21%] p-4 font-medium">
                  Training-feature policy
                </th>
              </tr>
            </thead>
            <tbody>
              {WARD_SOURCE_LINEAGE.map((source) => (
                <tr key={source.id} className="border-b border-border align-top last:border-0">
                  <th scope="row" className="p-4 font-normal">
                    <p className="font-medium text-foreground">{source.source}</p>
                    <div className="mt-2 space-y-1">
                      {source.files.map((file) => (
                        <code
                          key={file}
                          className="block break-all font-mono text-[9px] text-[color:var(--color-ink-deep)]"
                        >
                          {file}
                        </code>
                      ))}
                    </div>
                  </th>
                  <td className="p-4 text-muted-foreground">
                    <details>
                      <summary className="cursor-pointer select-none font-medium text-foreground marker:text-[color:var(--color-navy)]">
                        Show raw fields
                      </summary>
                      <BulletList items={source.rawFields} className="mt-2" />
                    </details>
                  </td>
                  <td className="p-4 text-[color:var(--color-ink-deep)]">
                    <BulletList items={source.computedFields} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {source.scoreDomains.map((domain) => (
                        <span
                          key={domain}
                          className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[9px] text-muted-foreground"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <PolicyBadge policy={source.policy} />
                    <p className="mt-2 text-muted-foreground">{source.policyDetail}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[9px] text-muted-foreground md:hidden">
          Scroll horizontally to inspect every lineage column.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="score-construction-title">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-[color:var(--color-navy)]" aria-hidden="true" />
          <h3 id="score-construction-title" className="text-base font-medium text-foreground">
            Exact ward-score construction
          </h3>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {WARD_SCORE_FORMULAS.map((score) => (
            <article
              key={score.id}
              className="overflow-hidden rounded-sm border border-border bg-card"
            >
              <div className="h-1.5" style={{ background: score.color }} />
              <div className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-medium text-foreground">{score.name}</h4>
                  <span className="smallcaps text-[8px] text-muted-foreground">{score.role}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {score.terms.map((term) => (
                    <div key={term.label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[11px] text-[color:var(--color-ink-deep)]">
                          {term.label}
                          {term.direction === "lower" && (
                            <span className="ml-1 text-[9px] text-muted-foreground">
                              (lower is better)
                            </span>
                          )}
                        </span>
                        <span className="metric-num text-[10px] text-foreground">
                          {term.weight}%
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${term.weight}%`, background: score.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {score.note && (
                  <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
                    {score.note}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-sm border border-border bg-muted/35 p-5">
          <p className="smallcaps text-[9px] text-muted-foreground">
            Normalisation and missingness
          </p>
          <ul className="mt-3 grid gap-3 text-xs leading-relaxed text-[color:var(--color-ink-deep)] md:grid-cols-2">
            {NORMALISATION_NOTES.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--color-navy)]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="label-rule-title">
        <h3 id="label-rule-title" className="text-base font-medium text-foreground">
          Ordered four-class rule
        </h3>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          The order is part of the definition: access failure takes precedence, then affordability,
          then quality/diversity. Stability never overrides the hard class.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {WARD_LABEL_RULES.map((rule) => {
            const label = LABELS[rule.labelKey];
            return (
              <article
                key={rule.labelKey}
                className="overflow-hidden rounded-sm border border-border bg-card"
              >
                <div className="h-2" style={{ background: label.color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="metric-num text-xs text-muted-foreground">{rule.order}</span>
                    <span className="smallcaps text-[8px] text-muted-foreground">
                      First matching rule
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-medium text-foreground">{label.name}</h4>
                  <code className="mt-2 block rounded-sm bg-muted/60 p-2 font-mono text-[10px] text-[color:var(--color-ink-deep)]">
                    {rule.condition}
                  </code>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    {rule.interpretation}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-sm border border-border bg-card p-5">
            <p className="smallcaps text-[9px] text-muted-foreground">
              Uncertainty attached after the label
            </p>
            <dl className="mt-4 space-y-3">
              {CONFIDENCE_FIELDS.map((item) => (
                <div
                  key={item.field}
                  className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[170px_1fr]"
                >
                  <dt className="font-mono text-[10px] text-foreground">{item.field}</dt>
                  <dd className="text-[11px] leading-relaxed text-muted-foreground">
                    {item.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <aside className="border-l-4 border-[#d59e71] bg-[#fffaf0] p-5 text-xs leading-relaxed text-[#65421f]">
            <p className="font-medium">Proxy target, not survey ground truth</p>
            <p className="mt-2">
              The four classes are transparent policy proxies built from digital traces, census
              proxies, and fixed rules. Missing vendors, informal markets, stale listings, and wards
              close to 40 remain visible through confidence and missing-data fields.
            </p>
          </aside>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="leakage-firewall-title">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[color:var(--color-navy)]" aria-hidden="true" />
          <h3 id="leakage-firewall-title" className="text-base font-medium text-foreground">
            Leakage firewall: what the model may and may not see
          </h3>
        </div>
        <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted-foreground">
          Reusing a source is not automatically leakage. The safe distinction is whether the model
          receives independently computed local evidence or a field produced by the target rule.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <FeaturePolicyColumn
            title="Excluded from predictor matrix X"
            subtitle="Blocked by explicit feature-name guards and validation assertions."
            groups={EXCLUDED_FEATURE_GROUPS}
            tone="excluded"
          />
          <FeaturePolicyColumn
            title="Allowed raw-derived predictors"
            subtitle="Computed around road nodes or from graph structure without copying final ward scores."
            groups={ALLOWED_FEATURE_GROUPS}
            tone="allowed"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-[#d59e71]/50 bg-[#fffaf0] p-4 text-xs leading-relaxed text-[#65421f]">
            <p className="font-medium">Sample-weight exception</p>
            <p className="mt-1">
              <code className="font-mono text-[10px]">label_train_weight</code> can multiply the
              training loss or tabular sample weight, but it is never concatenated into X and
              evaluation remains unweighted.
            </p>
          </div>
          <div className="rounded-sm border border-[#8e9db1]/60 bg-[#eef3f8] p-4 text-xs leading-relaxed text-[#34465f]">
            <p className="font-medium">Boundary-feature exception</p>
            <p className="mt-1">
              Ward-target notebooks 03b/03c/03h intentionally include and ablate boundary conflict,
              entropy, and nearest-different-label distance. Notebook 08 removes them when the
              target changes to adaptive local units.
            </p>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function BulletList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-45" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PolicyBadge({ policy }: { policy: LineagePolicy }) {
  const style = POLICY_STYLE[policy];
  return (
    <span
      className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium"
      style={{ background: style.background, color: style.foreground, borderColor: style.border }}
    >
      {style.label}
    </span>
  );
}

function FeaturePolicyColumn({
  title,
  subtitle,
  groups,
  tone,
}: {
  title: string;
  subtitle: string;
  groups: FeaturePolicyGroup[];
  tone: "excluded" | "allowed";
}) {
  const Icon = tone === "excluded" ? XCircle : CheckCircle2;
  const iconColor = tone === "excluded" ? "text-[#a85f43]" : "text-[#66834f]";
  const borderColor = tone === "excluded" ? "border-[#d59e71]/50" : "border-[#b9ca9d]";
  const background = tone === "excluded" ? "bg-[#fffaf0]" : "bg-[#f7faf3]";

  return (
    <section className={`rounded-sm border ${borderColor} ${background} p-5`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden="true" />
        <div>
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {groups.map((group) => (
          <details key={group.title} className="rounded-sm border border-border/80 bg-card/80 p-3">
            <summary className="cursor-pointer select-none text-xs font-medium text-foreground marker:text-[color:var(--color-navy)]">
              {group.title}
            </summary>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{group.reason}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.fields.map((field) => (
                <code
                  key={field}
                  className="rounded-sm border border-border bg-background px-1.5 py-1 font-mono text-[9px] text-[color:var(--color-ink-deep)]"
                >
                  {field}
                </code>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
