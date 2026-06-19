import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CITIES } from "../data/platform";
import { useTransfer } from "../lib/transfer-context";

export const Route = createFileRoute("/")({
  component: CityPicker,
});

function CityPicker() {
  const { setTargetId } = useTransfer();
  const navigate = useNavigate();

  function handleCity(cityId: string) {
    if (cityId === "mysuru") {
      setTargetId("mysuru");
      navigate({ to: "/audit" });
    } else {
      navigate({ to: "/results" });
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-12 pb-16">
      <header className="mb-10">
        <h1 className="font-serif text-[32px] leading-tight tracking-tight text-foreground">
          Which city would you like to analyze?
        </h1>
        <p className="mt-3 max-w-[580px] text-sm text-[color:var(--color-ink-deep)]">
          Select a city to see its food access map. Bengaluru has full data. Mysuru has an estimated projection.
        </p>
      </header>

      <div className="space-y-3">
        {CITIES.map((city) => {
          const available =
            city.evidence_state === "AVAILABLE" || city.evidence_state === "SCENARIO";
          const badge =
            city.evidence_state === "AVAILABLE"
              ? "Available"
              : city.evidence_state === "SCENARIO"
                ? "Preview available"
                : "Coming soon";
          const badgeColor =
            city.evidence_state === "AVAILABLE"
              ? "#7a9461"
              : city.evidence_state === "SCENARIO"
                ? "#d59e71"
                : "#aab3bf";

          return (
            <div
              key={city.id}
              className="flex items-center justify-between border border-border bg-[color:var(--color-paper)] px-6 py-5"
            >
              <div>
                <h2 className="font-serif text-xl text-foreground">{city.display_name}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {city.region}, {city.country}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <span className="smallcaps text-[10px]" style={{ color: badgeColor }}>
                  ● {badge}
                </span>
                {available ? (
                  <button
                    onClick={() => handleCity(city.id)}
                    className="smallcaps text-[10px] rounded-sm bg-foreground px-4 py-2.5 text-background hover:bg-foreground/85"
                  >
                    Analyze {city.display_name} →
                  </button>
                ) : (
                  <span className="smallcaps text-[10px] rounded-sm border border-border px-4 py-2.5 text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-[11px] italic text-muted-foreground">
        Maps show estimated food access patterns to support planning discussions. They are not a
        substitute for local research or ground-truth surveys.
      </p>
    </div>
  );
}
