"use client";

import { useEffect, useState } from "react";

/**
 * The current ?query string, read after mount so server and client render
 * the same thing first. Used to carry ?next and ?ref between Log in and
 * Create account.
 */
export function useCarrySearch(): string {
  const [search, setSearch] = useState("");
  useEffect(() => {
    setSearch(window.location.search);
  }, []);
  return search;
}
