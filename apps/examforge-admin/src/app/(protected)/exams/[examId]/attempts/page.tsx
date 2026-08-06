import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ExamAttemptsPage } from "@/features/admin-management/pages/exam-attempts.page";
export default async function Page({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  return (
    <Suspense>
      <ExamAttemptsPage examId={examId} />
    </Suspense>
  );
}
