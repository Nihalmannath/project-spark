import { createFileRoute, Link } from "@tanstack/react-router";
import { CITIES, api } from "../data/platform";
import { CityProfile } from "../components/CityProfile";
import { ComingSoonView } from "../components/ComingSoonView";
import { findWorldCity } from "../data/world-cities";

export const Route = createFileRoute("/city/$id")({ component: CityPage });

function CityPage() {
  const { id } = Route.useParams();
  const city = CITIES.find((c) => c.id === id);

  // Live, evidence-backed city → full diagnosis.
  if (city && city.evidence_state === "AVAILABLE") {
    return <CityProfile />;
  }

  // Known platform city without a live model → readiness checklist.
  if (city) {
    return (
      <div className="mx-auto max-w-[1100px] px-6 pt-10 pb-16">
        <ComingSoonView city={city} datasets={api.getReadiness(city.id)} />
        <BackToMap />
      </div>
    );
  }

  // A world-picker city that isn't in the platform registry yet.
  const wc = findWorldCity(id);
  return (
    <div className="mx-auto max-w-[760px] px-6 pt-24 pb-24 text-center">
      <p className="smallcaps text-[10px] text-muted-foreground">Coming soon</p>
      <h1 className="mt-2 font-serif text-3xl font-light text-foreground">
        {wc ? `${wc.name} isn't mapped yet` : "This city isn't mapped yet"}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        We&apos;re rolling out city by city. Bengaluru is the first fully-mapped build — explore it to see
        what your city&apos;s diagnosis will look like.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/city/$id"
          params={{ id: "bengaluru" }}
          className="smallcaps rounded-sm bg-foreground px-5 py-3 text-[10px] text-background transition-colors hover:bg-foreground/85"
        >
          Explore Bengaluru →
        </Link>
        <Link
          to="/cities"
          className="smallcaps rounded-sm border border-foreground px-5 py-3 text-[10px] text-foreground transition-colors hover:bg-muted/40"
        >
          Back to the map
        </Link>
      </div>
    </div>
  );
}

function BackToMap() {
  return (
    <div className="mt-6">
      <Link
        to="/cities"
        className="smallcaps text-[10px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        ← Back to the map
      </Link>
    </div>
  );
}
