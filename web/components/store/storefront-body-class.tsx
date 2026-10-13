"use client";

import { useLayoutEffect } from "react";

/** Restores PHP storefront body styling (Outfit, cream bg) over globals.css. */
export function StorefrontBodyClass() {
  useLayoutEffect(() => {
    document.body.classList.add("kk-storefront");
    return () => document.body.classList.remove("kk-storefront");
  }, []);
  return null;
}
