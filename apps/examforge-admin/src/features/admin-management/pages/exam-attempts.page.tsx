"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { getAdminExam } from "@/features/exams/api/exam.api";
import { examQueryKeys } from "@/features/exams/api/exam.query-key";
import { useExamAttempts } from "../api/admin.query";
import { AttemptFilters } from "../components/list-controls";
import { AttemptTable, Pagination } from "../components/attempt-table";
import { useAttemptListNavigation } from "../hooks/use-admin-navigation";
export function ExamAttemptsPage({ examId }: { examId: string }) {
  const exam = useQuery({
      queryKey: examQueryKeys.detail(examId),
      queryFn: ({ signal }) => getAdminExam(examId, signal),
    }),
    nav = useAttemptListNavigation(),
    q = useExamAttempts(examId, nav.state);
  return (
    <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[96rem] space-y-5">
        <Link className="underline" href="/exams">
          ← Back to exams
        </Link>
        <header>
          <h1 className="text-2xl font-semibold">
            {exam.data ? `${exam.data.title} attempts` : "Exam attempts"}
          </h1>
          <p className="text-muted-foreground">
            Attempts across every historical version of this exam.
          </p>
        </header>
        <AttemptFilters
          scope="exam"
          state={nav.state}
          search={nav.searchDraft}
          setSearch={nav.setSearchDraft}
          update={nav.update}
          reset={nav.reset}
        />
        {exam.isError ? (
          <div role="alert" className="border p-6">
            {exam.error.message}
          </div>
        ) : q.isPending || exam.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : q.isError ? (
          <div role="alert" className="border p-6">
            <p>{q.error.message}</p>
            <Button variant="outline" onClick={() => void q.refetch()}>
              Retry
            </Button>
          </div>
        ) : q.data.items.length === 0 ? (
          <div className="border p-8 text-center text-muted-foreground">
            No attempts match this view.
          </div>
        ) : (
          <>
            <AttemptTable items={q.data.items} scope="exam" />
            <Pagination
              page={q.data.meta.page}
              totalPages={q.data.meta.totalPages}
              previous={q.data.meta.hasPreviousPage}
              next={q.data.meta.hasNextPage}
              onPage={(p) => nav.update({ page: p }, false)}
            />
          </>
        )}
      </div>
    </main>
  );
}
