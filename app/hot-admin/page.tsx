import type { Metadata } from "next";
import { AdminGate } from "@/components/AdminGate";

export const dynamic = "force-dynamic";

// Hidden route: nothing links here, and crawlers are told to stay away. The
// URL is not the protection — every admin action is verified server-side.
export const metadata: Metadata = {
  title: "Admin · Party Tab",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminGate />;
}
