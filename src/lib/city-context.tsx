import { createContext, useContext, useState, type ReactNode } from "react";
import { CITIES, type City } from "../data/platform";

interface CityCtx {
  city: City;
  setCityId: (id: string) => void;
}

const Ctx = createContext<CityCtx | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState<string>("bengaluru");
  const city = CITIES.find((c) => c.id === cityId) || CITIES[0];
  return <Ctx.Provider value={{ city, setCityId }}>{children}</Ctx.Provider>;
}

export function useCity() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCity must be used inside CityProvider");
  return v;
}
