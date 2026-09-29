"use client";

import { useEffect, useState } from "react";
import { currentSeason, type Season } from "@/lib/seasons";

/**
 * The current seasonal theme for client components. Worked out after the
 * page loads so the server and browser never disagree near midnight.
 */
export function useSeason(): Season | null {
  const [season, setSeason] = useState<Season | null>(null);
  useEffect(() => {
    setSeason(currentSeason());
  }, []);
  return season;
}
