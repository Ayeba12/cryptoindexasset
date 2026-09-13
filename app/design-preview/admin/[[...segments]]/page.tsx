import { notFound } from "next/navigation";
import { ADMIN_SECTIONS } from "@/lib/admin/model";
import { AdminScreen } from "@/components/admin/screen";
import { ACCOUNT_PAGES } from "@/lib/admin/account";

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { segments = [] } = await params;
  if (
    segments.length > 2 ||
    !ADMIN_SECTIONS.some(([slug]) => slug === (segments[0] ?? "")) ||
    (segments.length === 2 &&
      !["users", "traders", "account"].includes(segments[0])) ||
    (segments[0] === "account" &&
      segments[1] &&
      !ACCOUNT_PAGES.some(([slug]) => slug === segments[1]))
  )
    notFound();
  return <AdminScreen />;
}
