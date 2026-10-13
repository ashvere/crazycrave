"use client";

import { useLayoutEffect } from "react";

export default function MyOrdersBodyClass({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    document.body.classList.add("my-orders-layout");
    return () => document.body.classList.remove("my-orders-layout");
  }, []);
  return <>{children}</>;
}
