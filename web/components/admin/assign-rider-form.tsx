"use client";

import { useRef } from "react";
import { adminAssignRider } from "@/app/admin/actions";

type RiderOpt = {
  id: string;
  display_name: string | null;
  /** Missing = treat as available (e.g. a rider shown only because they hold the order). */
  fleet_status?: "available" | "busy" | "offline";
  active?: number;
};

const STATUS_LABEL = { busy: "Busy", offline: "Offline" } as const;

export function AssignRiderForm({
  orderId,
  riders,
  currentRiderId,
  currentRiderName,
}: {
  orderId: number;
  riders: RiderOpt[];
  currentRiderId: string | null;
  currentRiderName?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const name = (r: RiderOpt) => r.display_name?.trim() || r.id.slice(0, 8);
  const isAvailable = (r: RiderOpt) => (r.fleet_status ?? "available") === "available";
  // The rider already on the order stays selectable even if they've since gone busy/offline.
  const available = riders.filter((r) => isAvailable(r) || r.id === currentRiderId);
  if (currentRiderId && !riders.some((r) => r.id === currentRiderId)) {
    available.unshift({ id: currentRiderId, display_name: currentRiderName ?? "Current rider" });
  }
  const unavailable = riders.filter((r) => !isAvailable(r) && r.id !== currentRiderId);

  return (
    <form ref={formRef} action={adminAssignRider} className="d-inline-flex align-items-center gap-1">
      <input type="hidden" name="order_id" value={orderId} />
      <select
        name="rider_id"
        className="form-select form-select-sm"
        style={{ minWidth: "9rem" }}
        defaultValue={currentRiderId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Assign rider"
      >
        <option value="">{available.length === 0 && !currentRiderId ? "No rider available" : "Rider…"}</option>
        {available.length > 0 ? (
          <optgroup label="Available">
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {name(r)}
                {r.active ? ` · ${r.active} on delivery` : ""}
              </option>
            ))}
          </optgroup>
        ) : null}
        {unavailable.length > 0 ? (
          <optgroup label="Not available">
            {unavailable.map((r) => (
              <option key={r.id} value={r.id} disabled>
                {name(r)} · {STATUS_LABEL[r.fleet_status as "busy" | "offline"]}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </form>
  );
}
