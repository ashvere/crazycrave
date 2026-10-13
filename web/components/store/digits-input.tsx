"use client";

import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "onInput"> & {
  type?: "text" | "tel";
};

/**
 * Text input that only keeps digits: letters, spaces and symbols are dropped as
 * they are typed or pasted (and cut to maxLength). Pair it with `pattern` + `title`
 * for the browser's own "wrong format" message; the server validates again.
 */
export function DigitsInput({ type = "text", maxLength, defaultValue, ...rest }: Props) {
  // Older saved values may hold spaces or "+63"; show them as plain digits.
  let initial = defaultValue;
  if (typeof defaultValue === "string") {
    const d = defaultValue.replace(/\D/g, "");
    initial = /^639\d{9}$/.test(d) ? `0${d.slice(2)}` : d;
  }
  return (
    <input
      {...rest}
      defaultValue={initial}
      type={type}
      inputMode="numeric"
      maxLength={maxLength}
      onInput={(e) => {
        const el = e.currentTarget;
        let digits = el.value.replace(/\D/g, "");
        if (maxLength !== undefined) digits = digits.slice(0, maxLength);
        if (digits !== el.value) el.value = digits;
      }}
    />
  );
}
