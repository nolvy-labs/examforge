import { notFound } from "next/navigation";
import { z } from "zod";
import { AttemptDetailPage } from "@/features/admin-management/pages/attempt-detail.page";
export default async function Page({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  if (!z.uuid().safeParse(attemptId).success) notFound();
  return <AttemptDetailPage attemptId={attemptId} />;
}
