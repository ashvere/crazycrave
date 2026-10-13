"use client";

import { useLayoutEffect } from "react";

export default function ProfileBodyClassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    document.body.classList.add("profile-layout");
    return () => document.body.classList.remove("profile-layout");
  }, []);
  return <>{children}</>;
}
