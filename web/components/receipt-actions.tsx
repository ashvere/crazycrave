"use client";

import { useState } from "react";

/** Copy-reference and print buttons for a receipt (hidden when printing). */
export function ReceiptActions({ reference, print = true }: { reference: string; print?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="d-flex flex-wrap gap-2 kk-receipt-noprint">
      <button
        type="button"
        className="btn btn-sm btn-outline-dark"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(reference);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Copy reference number:", reference);
          }
        }}
      >
        <i className={`bi ${copied ? "bi-check2" : "bi-clipboard"} me-1`} aria-hidden="true" />
        {copied ? "Copied" : "Copy reference"}
      </button>
      {print ? (
        <button type="button" className="btn btn-sm btn-dark" onClick={() => window.print()}>
          <i className="bi bi-printer me-1" aria-hidden="true" />
          Print receipt
        </button>
      ) : null}
    </div>
  );
}
