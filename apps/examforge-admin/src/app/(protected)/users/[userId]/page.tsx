import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserDetailPage } from "@/features/admin-management/pages/user-detail.page";
export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success) notFound();
  return (
    <Suspense>
      <UserDetailPage userId={userId} />
    </Suspense>
  );
}
