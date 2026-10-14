import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchReceiptOrder } from "@/lib/receipt-fetch";
import { Receipt } from "@/components/receipt";

export default async function CustomerReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const orderId = parseInt((await params).id, 10);
  if (!Number.isFinite(orderId) || orderId < 1) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?login=required&next=/order-track/${orderId}/receipt`);

  const order = await fetchReceiptOrder(supabase, orderId, { customerId: user.id });
  if (!order) notFound();

  return (
    <main className="container py-4">
      <div className="mx-auto mb-3 kk-receipt-noprint" style={{ maxWidth: 480 }}>
        <Link href={`/order-track/${orderId}`} className="small text-decoration-none">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to order tracking
        </Link>
      </div>
      <Receipt order={order} />
    </main>
  );
}
