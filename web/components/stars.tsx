/**
 * Read-only star rating (supports halves), e.g. <Stars value={4.3} />. Styles: .kk-stars in each
 * portal's CSS. Pass label="" when the surrounding element already describes the rating.
 */
export function Stars({ value, size = "md", label }: { value: number; size?: "sm" | "md"; label?: string }) {
  const rounded = Math.round(value * 2) / 2;
  const a11y =
    label === ""
      ? { "aria-hidden": true as const }
      : { role: "img", "aria-label": label ?? `${value.toFixed(1)} out of 5 stars` };
  return (
    <span className={`kk-stars kk-stars--${size}`} {...a11y}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`bi ${rounded >= i ? "bi-star-fill" : rounded >= i - 0.5 ? "bi-star-half" : "bi-star"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
