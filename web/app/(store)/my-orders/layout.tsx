import type { Metadata } from "next";
import MyOrdersBodyClass from "./my-orders-body-class";

export const metadata: Metadata = {
  title: "My orders",
};

export default function MyOrdersLayout({ children }: { children: React.ReactNode }) {
  return <MyOrdersBodyClass>{children}</MyOrdersBodyClass>;
}
