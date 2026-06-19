interface ScenarioState {
  density: number;
  grocery: number;
  newOutlet: number;
  affordability: number;
  hideLowConf: boolean;
}

interface Props {
  state: ScenarioState;
  onChange: (s: ScenarioState) => void;
  onReset: () => void;
}

export type { ScenarioState };

export function ScenarioControls({ state, onChange, onReset }: Props) {
  const set = <K extends keyof ScenarioState>(k: K, v: ScenarioState[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="smallcaps text-[10px] text-muted-foreground">Scenario controls</p>
        <button
          onClick={onReset}
          className="smallcaps text-[10px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Reset
        </button>
      </div>

      <Slider label="Population density" value={state.density} onChange={(v) => set("density", v)} />
      <Slider label="Grocery access" value={state.grocery} onChange={(v) => set("grocery", v)} />
      <Slider label="New food outlets added" value={state.newOutlet} onChange={(v) => set("newOutlet", v)} />
      <Slider label="Affordability improvement" value={state.affordability} onChange={(v) => set("affordability", v)} />

      <label className="mt-5 flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={state.hideLowConf}
          onChange={(e) => set("hideLowConf", e.target.checked)}
          className="size-3.5 accent-foreground"
        />
        Hide low-confidence areas
      </label>

      <p className="mt-5 rounded-md bg-secondary/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Prototype simulation only. Final scenario logic requires the trained model in the loop —
        wire scenario deltas into the inference service to recompute predictions.
      </p>
    </div>
  );
}

function Slider({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-foreground">{label}</label>
        <span className="metric-num text-xs text-muted-foreground">{value > 0 ? "+" : ""}{value}</span>
      </div>
      <input
        type="range"
        min={-5}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-foreground"
      />
    </div>
  );
}
