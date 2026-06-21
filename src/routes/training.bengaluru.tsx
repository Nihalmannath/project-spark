import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Database, MapPinned, Network, ShieldCheck, Sigma } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { WardLabelConstruction } from "../components/WardLabelConstruction";
import { FoliumMapFrame } from "../components/FoliumMapFrame";
import { AdaptiveHexExplorer } from "../components/AdaptiveHexExplorer";
import { fetchMeta } from "../lib/inference";
import { useMotionPresets } from "../lib/motion";
import { NOTEBOOKS, type NotebookRecord } from "../data/notebooks";
import { EVIDENCE_VIEWS } from "../data/evidenceViews";

export const Route = createFileRoute("/training/bengaluru")({
  head: () => ({
    meta: [
      { title: "How the Bengaluru model was built — Food Spatial Intelligence" },
      {
        name: "description",
        content:
          "A guided account of the data, features, graph models, validation, and adaptive-target experiments behind the Bengaluru thesis.",
      },
    ],
  }),
  component: BengaluruTraining,
});

const PIPELINE = [
  {
    icon: Database,
    number: "01",
    title: "Raw data",
    body: "Roads, food outlets, prices, ratings, menus, access grids, and ward context.",
  },
  {
    icon: Sigma,
    number: "02",
    title: "Computed features",
    body: "Counts, distances, affordability, diversity, stability, and uncertainty around each location.",
  },
  {
    icon: Network,
    number: "03",
    title: "Road graph",
    body: "Street intersections become nodes; road segments let neighbouring places share context.",
  },
  {
    icon: ShieldCheck,
    number: "04",
    title: "Spatial validation",
    body: "Five geographic folds prevent nearby test locations leaking into model training.",
  },
  {
    icon: MapPinned,
    number: "05",
    title: "Evidence maps",
    body: "Predictions are compared with proxy labels and uncertainty remains visible.",
  },
] as const;

function BengaluruTraining() {
  const [selectedId, setSelectedId] = useState("03");
  const { reduce, stagger, fadeUp } = useMotionPresets();
  const transferMeta = useQuery({
    queryKey: ["meta", "mysuru"],
    queryFn: () => fetchMeta("mysuru"),
  });
  const selected = NOTEBOOKS.find((notebook) => notebook.id === selectedId) ?? NOTEBOOKS[0];

  return (
    <div className="pb-24">
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-12">
          <Link
            to="/results"
            search={{ city: "bengaluru", view: "road" }}
            className="smallcaps inline-flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to evidence map
          </Link>
          <p className="smallcaps mt-8 text-[10px] text-muted-foreground">
            Bengaluru training story
          </p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-light leading-tight text-foreground md:text-5xl">
            How raw city data became food-environment evidence.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[color:var(--color-ink-deep)]">
            The thesis did not produce one model in a single step. Nine experiments tested data
            quality, neighbourhood scale, road connections, feature engineering, and finally the
            geography of the prediction target itself.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6">
        <Reveal className="py-14">
          <p className="smallcaps text-[10px] text-muted-foreground">The complete pipeline</p>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-6 grid overflow-hidden rounded-sm border border-border md:grid-cols-5"
          >
            {PIPELINE.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.number}
                  variants={fadeUp}
                  className={`bg-card p-5 ${index < PIPELINE.length - 1 ? "border-b border-border md:border-b-0 md:border-r" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="size-4 text-[color:var(--color-navy)]" />
                    <span className="metric-num text-xs text-muted-foreground">{step.number}</span>
                  </div>
                  <h2 className="mt-5 text-sm font-medium text-foreground">{step.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </Reveal>

        <WardLabelConstruction />

        <Reveal className="border-t border-border py-14">
          <p className="smallcaps text-[10px] text-muted-foreground">Experiment progression</p>
          <h2 className="mt-2 font-serif text-3xl font-light text-foreground">
            Each version answered a different question.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Select an experiment to see its raw inputs, computed features, validation policy,
            result, and—where a real artifact exists—its interactive prediction map.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <nav aria-label="Training experiments" className="space-y-2">
              {NOTEBOOKS.map((notebook) => (
                <button
                  key={notebook.id}
                  type="button"
                  aria-pressed={selectedId === notebook.id}
                  onClick={() => setSelectedId(notebook.id)}
                  className={`w-full rounded-sm border p-3 text-left transition-colors ${
                    selectedId === notebook.id
                      ? "border-foreground bg-foreground text-background"
                      : notebook.targetType === "adaptive-local"
                        ? "border-[#d59e71] bg-[#fffaf0] text-foreground hover:border-foreground/50"
                        : "border-border bg-card text-foreground hover:border-foreground/50"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="metric-num text-xs">{notebook.number}</span>
                    <span
                      className={`text-[9px] ${selectedId === notebook.id ? "text-background/65" : "text-muted-foreground"}`}
                    >
                      {notebook.featureCount} features
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-medium leading-snug">
                    {notebook.title}
                  </span>
                  <span
                    className={`mt-1 block text-[10px] ${selectedId === notebook.id ? "text-background/70" : "text-muted-foreground"}`}
                  >
                    Macro-F1 {notebook.metrics.macroF1.toFixed(3)}
                  </span>
                </button>
              ))}
            </nav>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: reduce ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduce ? 0 : -12 }}
                transition={{ duration: reduce ? 0 : 0.25 }}
              >
                <ExperimentDetail notebook={selected} />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>

        <TransferSection meta={transferMeta.data} />
      </main>
    </div>
  );
}

function ExperimentDetail({ notebook }: { notebook: NotebookRecord }) {
  const mappedView = EVIDENCE_VIEWS.find((view) => view.id === notebook.id);
  const adaptive = notebook.targetType === "adaptive-local";

  return (
    <article
      className={`overflow-hidden rounded-sm border bg-card ${adaptive ? "border-[#d59e71]" : "border-border"}`}
    >
      <header className="border-b border-border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="smallcaps text-[9px] text-muted-foreground">{notebook.file}</p>
            <h3 className="mt-2 font-serif text-2xl font-light text-foreground">
              {notebook.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {notebook.tagline}
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-medium ${adaptive ? "border-[#d59e71] text-[#8a5428]" : "border-border text-muted-foreground"}`}
          >
            {adaptive ? "Adaptive local target" : "Ward-broadcast target"}
          </span>
        </div>
        {adaptive && (
          <div className="mt-5 border-l-4 border-[#d59e71] bg-[#fffaf0] px-4 py-3 text-xs leading-relaxed text-[#65421f]">
            Notebook 08 changes the target from administrative wards to local adaptive catchments.
            Its higher accuracy is a different task, not a direct replacement score for 03c.
          </div>
        )}
      </header>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <TextBlock title="What changed">{notebook.what}</TextBlock>
        <TextBlock title="Why it mattered">{notebook.whyItMatters}</TextBlock>
      </div>

      <section className="border-t border-border p-6">
        <h4 className="text-sm font-medium text-foreground">Raw input data</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {notebook.rawSources.map((source) => (
            <div key={source.name} className="rounded-sm border border-border bg-background p-3">
              <p className="font-mono text-[10px] text-foreground">{source.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {source.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-medium text-foreground">Computed features</h4>
          <span className="metric-num text-xs text-muted-foreground">
            {notebook.featureCount} total
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {notebook.featureGroups.map((group) => (
            <div key={group.group} className="rounded-sm bg-muted/50 p-3">
              <div className="flex justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">{group.group}</span>
                <span className="metric-num text-muted-foreground">{group.count}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.examples.map((example) => (
                  <code
                    key={example}
                    className="rounded bg-card px-1.5 py-1 font-mono text-[9px] text-[color:var(--color-ink-deep)]"
                  >
                    {example}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t border-border p-6 md:grid-cols-2">
        <TextBlock title="Preprocessing and leakage control">
          {notebook.correlationPolicy}
        </TextBlock>
        <TextBlock title="Model and validation">{notebook.model}</TextBlock>
      </section>

      <section className="border-t border-border p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Macro-F1" value={notebook.metrics.macroF1.toFixed(3)} />
          <Metric
            label="Accuracy"
            value={notebook.metrics.accuracy?.toFixed(3) ?? "Not reported"}
          />
          <Metric label="Road nodes" value={notebook.nodes.toLocaleString()} />
        </div>
        <ul className="mt-5 space-y-2 text-xs leading-relaxed text-[color:var(--color-ink-deep)]">
          {notebook.keyFindings.map((finding) => (
            <li key={finding}>— {finding}</li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border p-6">
        <h4 className="text-sm font-medium text-foreground">Interactive evidence artifact</h4>
        {notebook.id === "08" ? (
          <div className="mt-4">
            <AdaptiveHexExplorer />
          </div>
        ) : mappedView?.mapPath ? (
          <div className="mt-4">
            <FoliumMapFrame
              src={mappedView.mapPath}
              title={`${notebook.number} predicted versus true map`}
            />
          </div>
        ) : (
          <p className="mt-2 rounded-sm border border-dashed border-border p-4 text-xs text-muted-foreground">
            No standalone interactive map was exported for this experiment. Its verified metrics and
            feature record are shown without inventing a visual artifact.
          </p>
        )}
        <Link
          to="/notebooks/$id"
          params={{ id: notebook.id }}
          className="smallcaps mt-4 inline-block text-[9px] text-muted-foreground hover:text-foreground"
        >
          Open the full notebook record →
        </Link>
      </section>
    </article>
  );
}

function TransferSection({ meta }: { meta?: Awaited<ReturnType<typeof fetchMeta>> }) {
  const model = meta?.model;
  const training = model?.training;
  return (
    <Reveal className="border-t border-border py-14">
      <p className="smallcaps text-[10px] text-muted-foreground">Transfer application</p>
      <h2 className="mt-2 font-serif text-3xl font-light text-foreground">
        How the Bengaluru model is applied to Mysuru.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Mysuru does not have local food-environment labels or observed affordability. The
        application computes the same eight transferable OSM and road features, applies the frozen
        Bengaluru checkpoint, calibrates probabilities, and abstains when confidence or domain fit
        is inadequate.
      </p>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-sm border border-border bg-card p-5">
          <p className="smallcaps text-[9px] text-muted-foreground">Checkpoint</p>
          <dl className="mt-4 space-y-3 text-xs">
            <DetailRow label="Model version" value={model?.model_version ?? "Loading…"} />
            <DetailRow label="Feature schema" value={model?.schema_version ?? "Loading…"} />
            <DetailRow
              label="Training nodes"
              value={training?.labeled_nodes.toLocaleString() ?? "Loading…"}
            />
            <DetailRow label="Final epochs" value={training?.final_epochs ?? "Loading…"} />
            <DetailRow label="Random seed" value={training?.seed ?? "Loading…"} />
            <DetailRow
              label="Spatial-CV macro-F1"
              value={model?.metrics?.spatial_cv_macro_f1.toFixed(3) ?? "Loading…"}
            />
            <DetailRow
              label="Calibrated ECE"
              value={model?.metrics?.calibrated_ece.toFixed(3) ?? "Loading…"}
            />
            <DetailRow
              label="Mysuru abstention"
              value={
                model?.target_city_abstention_rate != null
                  ? `${(model.target_city_abstention_rate * 100).toFixed(1)}%`
                  : "Loading…"
              }
            />
          </dl>
        </section>

        <section className="rounded-sm border border-border bg-card p-5">
          <p className="smallcaps text-[9px] text-muted-foreground">Eight transferable features</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(model?.feature_names ?? meta?.training_schema ?? []).map((feature) => (
              <code
                key={feature}
                className="rounded-sm border border-border bg-background px-2 py-1.5 font-mono text-[10px] text-foreground"
              >
                {feature}
              </code>
            ))}
          </div>
          <div className="mt-6 space-y-4 text-xs leading-relaxed">
            <TextBlock title="Training target">
              {training?.target ?? "Loading training metadata…"}
            </TextBlock>
            <TextBlock title="Spatial split">
              {training?.split ?? "Loading training metadata…"}
            </TextBlock>
          </div>
        </section>
      </div>

      {model?.metrics?.folds && (
        <div className="mt-4 overflow-x-auto rounded-sm border border-border bg-card">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3">Fold</th>
                <th className="p-3">Train</th>
                <th className="p-3">Validation</th>
                <th className="p-3">Test</th>
                <th className="p-3">Best epoch</th>
                <th className="p-3">Test macro-F1</th>
              </tr>
            </thead>
            <tbody>
              {model.metrics.folds.map((fold) => (
                <tr key={fold.fold} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono">{fold.fold + 1}</td>
                  <td className="p-3 font-mono">{fold.train_nodes.toLocaleString()}</td>
                  <td className="p-3 font-mono">{fold.validation_nodes.toLocaleString()}</td>
                  <td className="p-3 font-mono">{fold.test_nodes.toLocaleString()}</td>
                  <td className="p-3 font-mono">{fold.best_epoch}</td>
                  <td className="p-3 font-mono">{fold.test_macro_f1.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 border-l-4 border-[#d59e71] bg-[#fffaf0] px-4 py-3 text-xs leading-relaxed text-[#65421f]">
        The Mysuru result is a transfer projection, not local ground truth. Affordability is not
        observed there, and uncertain or out-of-domain nodes remain unknown.
      </div>
      <Link
        to="/results"
        search={{ city: "mysuru", view: "road" }}
        className="mt-6 inline-flex rounded-sm bg-foreground px-4 py-2.5 text-[11px] font-medium text-background hover:bg-foreground/85"
      >
        Inspect the Mysuru projection →
      </Link>
    </Reveal>
  );
}

function TextBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="smallcaps text-[9px] text-muted-foreground">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-ink-deep)]">{children}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-muted/50 p-4">
      <p className="smallcaps text-[9px] text-muted-foreground">{label}</p>
      <p className="metric-num mt-2 text-xl text-foreground">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-mono text-foreground">{value}</dd>
    </div>
  );
}
