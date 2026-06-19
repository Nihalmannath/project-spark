import { createFileRoute } from "@tanstack/react-router";
import { FeatureInspector } from "../components/FeatureInspector";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Feature Inspector — Food Spatial Intelligence" },
      { name: "description", content: "Explore the model's input features grouped by domain." },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10 max-w-3xl">
        <p className="smallcaps text-[10px] text-muted-foreground">Feature Inspector</p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-foreground">
          What the model looks at
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Features are grouped by domain. Select any feature to see what it measures, why it
          matters for food access, and how to interpret high or low values.
        </p>
      </header>
      <FeatureInspector />
    </div>
  );
}
