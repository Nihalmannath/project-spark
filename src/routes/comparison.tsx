import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NOTEBOOKS } from "@/data/notebooks";
import { LABEL_ORDER, LABELS } from "@/data/labels";
import { PageHero, SectionHeader } from "@/components/primitives";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Model comparison — GraphSAGE Food Desert Identification" },
      {
        name: "description",
        content:
          "Macro-F1, accuracy and per-class F1 across all nine notebook experiments — from the OSM baseline to the adaptive-hex target.",
      },
    ],
  }),
  component: ComparisonPage,
});

const wardSeries = NOTEBOOKS
  .filter((n) => n.targetType === "ward-broadcast")
  .map((n) => ({
    id: n.number,
    label: `${n.number} · ${shortTitle(n.title)}`,
    macroF1: n.metrics.macroF1,
    accuracy: n.metrics.accuracy ?? null,
    isHeadline: !!n.isHeadline,
  }));

const adaptiveSeries = NOTEBOOKS
  .filter((n) => n.targetType === "adaptive-local")
  .map((n) => ({
    id: n.number,
    label: `${n.number} · ${shortTitle(n.title)}`,
    macroF1: n.metrics.macroF1,
    accuracy: n.metrics.accuracy ?? null,
    isHeadline: !!n.isHeadline,
  }));

const perClassNotebooks = NOTEBOOKS.filter((n) => n.metrics.perClassF1);
const perClassData = perClassNotebooks.map((n) => {
  const row: Record<string, string | number> = { id: n.number };
  LABEL_ORDER.forEach((k) => {
    row[k] = n.metrics.perClassF1?.[k] ?? 0;
  });
  return row;
});

const featureTimeline = NOTEBOOKS.map((n) => ({
  id: n.number,
  features: n.featureCount,
}));

function shortTitle(t: string) {
  return t.split("—")[0].trim().replace(/\.$/, "");
}

function ComparisonPage() {
  return (
    <div>
      <PageHero
        eyebrow="Comparison"
        title="The progression, at a glance."
        lede="Macro-F1 is the headline metric. Per-class F1 reveals where each model wins or loses — especially on the rare food-swamp class."
      />

      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Ward-broadcast leaderboard */}
        <SectionHeader
          eyebrow="Ward-broadcast target"
          title="Macro-F1 across 03 → 03h"
          description="All eight notebooks predict the BBMP ward label broadcast to every road intersection inside the ward. 03c remains the simple-architecture headline; 03g's control re-run topped the architecture audit."
        />
        <ChartCard height={420}>
          <BarChart
            data={wardSeries}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 30, bottom: 10 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis
              type="number"
              domain={[0, 0.6]}
              tick={chartTick}
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              dataKey="label"
              type="category"
              width={200}
              tick={chartTick}
              stroke="var(--color-muted-foreground)"
            />
            <Tooltip content={<F1Tip />} cursor={{ fill: "var(--color-muted)" }} />
            <Bar dataKey="macroF1" radius={[0, 3, 3, 0]}>
              {wardSeries.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isHeadline ? "var(--color-accent)" : "var(--color-foreground)"}
                  fillOpacity={d.isHeadline ? 1 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Adaptive target */}
        <div className="mt-20">
          <SectionHeader
            eyebrow="Adaptive local target"
            title="A different task, reported separately"
            description="Notebook 08 redefines the target as a local adaptive catchment label rather than a ward label. Accuracy rises to 0.939 — but this is not directly comparable to the 03-series."
          />
          <ChartCard height={180}>
            <BarChart
              data={adaptiveSeries}
              layout="vertical"
              margin={{ top: 10, right: 40, left: 30, bottom: 10 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--color-border)" />
              <XAxis type="number" domain={[0, 1]} tick={chartTick} stroke="var(--color-muted-foreground)" />
              <YAxis dataKey="label" type="category" width={200} tick={chartTick} stroke="var(--color-muted-foreground)" />
              <Tooltip content={<F1Tip />} cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="macroF1" radius={[0, 3, 3, 0]} fill="var(--color-accent)" />
            </BarChart>
          </ChartCard>
        </div>

        {/* Accuracy vs Macro-F1 */}
        <div className="mt-20">
          <SectionHeader
            eyebrow="Accuracy vs Macro-F1"
            title="Where they agree, and where they diverge"
            description="A large gap between accuracy and macro-F1 reveals class imbalance issues — the model is fluent on the majority oasis class but weaker on swamp."
          />
          <ChartCard height={380}>
            <BarChart
              data={[...wardSeries, ...adaptiveSeries].filter((d) => d.accuracy != null)}
              margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
            >
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="id"
                tick={chartTick}
                stroke="var(--color-muted-foreground)"
                interval={0}
              />
              <YAxis domain={[0, 1]} tick={chartTick} stroke="var(--color-muted-foreground)" />
              <Tooltip content={<MultiTip />} cursor={{ fill: "var(--color-muted)" }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="square"
              />
              <Bar dataKey="accuracy" name="Accuracy" fill="var(--color-foreground)" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
              <Bar dataKey="macroF1" name="Macro-F1" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>

        {/* Per-class */}
        <div className="mt-20">
          <SectionHeader
            eyebrow="Per-class F1"
            title="Where the rare classes are won or lost"
            description="Food swamp is the rarest class (~7% of nodes). 03f collapses on swamp at the 200 m radius; 03h and 08 are the only models that materially improve it."
          />
          <ChartCard height={380}>
            <BarChart
              data={perClassData}
              margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
            >
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="id" tick={chartTick} stroke="var(--color-muted-foreground)" />
              <YAxis domain={[0, 1]} tick={chartTick} stroke="var(--color-muted-foreground)" />
              <Tooltip content={<MultiTip />} cursor={{ fill: "var(--color-muted)" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="square" />
              {LABEL_ORDER.map((k) => (
                <Bar
                  key={k}
                  dataKey={k}
                  name={LABELS[k].name}
                  fill={LABELS[k].color}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartCard>
        </div>

        {/* Feature timeline */}
        <div className="mt-20">
          <SectionHeader
            eyebrow="Feature count over the progression"
            title="From 8 features to 109 — but more isn't always better"
            description="Notebook 03h's 109 engineered features beat 03c's 36 on macro-F1 and swamp F1, but 03d shows that 18 well-chosen features in a tabular model is already strong. Quantity isn't quality."
          />
          <ChartCard height={300}>
            <BarChart data={featureTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="id" tick={chartTick} stroke="var(--color-muted-foreground)" />
              <YAxis tick={chartTick} stroke="var(--color-muted-foreground)" />
              <Tooltip content={<MultiTip />} cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="features" fill="var(--color-mirage)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

const chartTick = {
  fontFamily: "Inter, sans-serif",
  fontSize: 11,
  fill: "var(--color-muted-foreground)",
};

function ChartCard({ children, height }: { children: React.ReactElement; height: number }) {
  return (
    <div className="rounded-md border bg-card p-6">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function F1Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="smallcaps text-[10px] text-muted-foreground">{p.payload.label ?? p.payload.id}</p>
      <p className="metric-num mt-1 text-base text-foreground">
        {Number(p.value).toFixed(3)}
      </p>
    </div>
  );
}

function MultiTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="smallcaps text-[10px] text-muted-foreground">Notebook {label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.fill }} />
            <span className="text-foreground">{p.name}:</span>
            <span className="metric-num text-foreground">
              {typeof p.value === "number" ? p.value.toFixed(3) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
