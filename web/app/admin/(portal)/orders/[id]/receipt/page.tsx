import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { fetchReceiptOrder } from "@/lib/receipt-fetch";
import { Receipt } from "@/components/receipt";

export default async function StaffReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const orderId = parseInt((await params).id, 10);
  if (!Number.isFinite(orderId) || orderId < 1) notFound();

  const supabase = await createClient();
  const order = await fetchReceiptOrder(supabase, orderId, { shopId: staffShopId(staff) });
  if (!order) notFound();

  return (
    <>
      <div className="mx-auto mb-3 kk-receipt-noprint" style={{ maxWidth: 480 }}>
        <Link href={`/admin/orders/${orderId}`} className="small text-decoration-none">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to order #{orderId}
        </Link>
      </div>
      <Receipt order={order} />
    </>
  );
}
