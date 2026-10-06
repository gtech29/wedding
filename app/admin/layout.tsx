import type { Metadata } from "next";
import "../../components/admin/admin.css";

export const metadata: Metadata = {
  title: "Wedding management | Sarah and Juan",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div lang="en">{children}</div>;
}
