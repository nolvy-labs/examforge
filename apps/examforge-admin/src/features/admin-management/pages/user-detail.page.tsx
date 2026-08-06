"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { Skeleton } from "@/components/shadcn/skeleton";
import { ApiError } from "@/lib/api/api.error";
import { useUser, useUserAttempts } from "../api/admin.query";
import { AttemptFilters } from "../components/list-controls";
import { AttemptTable, Pagination } from "../components/attempt-table";
import {
  formatDate,
  formatNumber,
  formatPercent,
  RoleBadge,
} from "../components/presentation";
import { useAttemptListNavigation } from "../hooks/use-admin-navigation";
export function UserDetailPage({ userId }: { userId: string }) {
  const profile = useUser(userId),
    nav = useAttemptListNavigation(),
    attempts = useUserAttempts(userId, nav.state);
  if (profile.error instanceof ApiError && profile.error.status === 404)
    notFound();
  if (profile.isPending)
    return (
      <Main>
        <Skeleton className="h-96 w-full" />
      </Main>
    );
  if (profile.isError || !profile.data)
    return (
      <Main>
        <ErrorBox
          message={profile.error.message}
          retry={() => void profile.refetch()}
        />
      </Main>
    );
  const u = profile.data,
    s = u.statistics;
  return (
    <Main>
      <Link className="underline" href="/users">
        ← Back to users
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">
          {u.displayName || "Unnamed user"}
        </h1>
        <p className="text-muted-foreground">{u.email}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Account information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Role">
            <RoleBadge role={u.role} />
          </Field>
          <Field label="Status" value={u.isActive ? "Active" : "Inactive"} />
          <Field label="Created" value={formatDate(u.createdAtUtc)} />
          <Field label="Updated" value={formatDate(u.updatedAtUtc)} />
        </CardContent>
      </Card>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Attempt statistics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total attempts" value={formatNumber(s.totalAttempts)} />
          <Stat
            label="In progress"
            value={formatNumber(s.attemptsByStatus.inProgress)}
          />
          <Stat
            label="Submitted"
            value={formatNumber(s.attemptsByStatus.submitted)}
          />
          <Stat
            label="Abandoned"
            value={formatNumber(s.attemptsByStatus.abandoned)}
          />
          <Stat
            label="Practice"
            value={formatNumber(s.attemptsByMode.practice)}
          />
          <Stat label="Exam" value={formatNumber(s.attemptsByMode.exam)} />
          <Stat
            label="Average submitted"
            value={formatPercent(s.averageSubmittedPercentage)}
          />
          <Stat
            label="Best submitted"
            value={formatPercent(s.bestSubmittedPercentage)}
          />
          <Stat
            label="Answered questions"
            value={formatNumber(s.totalAnsweredQuestions)}
          />
          <Stat label="Last attempt" value={formatDate(s.lastAttemptAtUtc)} />
        </div>
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Attempt history</h2>
          <p className="text-muted-foreground">
            All attempts made by this user.
          </p>
        </div>
        <AttemptFilters
          scope="user"
          state={nav.state}
          search={nav.searchDraft}
          setSearch={nav.setSearchDraft}
          update={nav.update}
          reset={nav.reset}
        />
        {attempts.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : attempts.isError ? (
          <ErrorBox
            message={attempts.error.message}
            retry={() => void attempts.refetch()}
          />
        ) : attempts.data.items.length === 0 ? (
          <div className="border p-8 text-center text-muted-foreground">
            No attempts match this view.
          </div>
        ) : (
          <>
            <AttemptTable items={attempts.data.items} scope="user" />
            <Pagination
              page={attempts.data.meta.page}
              totalPages={attempts.data.meta.totalPages}
              previous={attempts.data.meta.hasPreviousPage}
              next={attempts.data.meta.hasNextPage}
              onPage={(p) => nav.update({ page: p }, false)}
            />
          </>
        )}
      </section>
    </Main>
  );
}
const Main = ({ children }: { children: React.ReactNode }) => (
  <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
    <div className="mx-auto max-w-[96rem] space-y-5">{children}</div>
  </main>
);
const Field = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) => (
  <div>
    <div className="text-muted-foreground">{label}</div>
    <div className="mt-1 font-medium">{children ?? value}</div>
  </div>
);
const Stat = ({ label, value }: { label: string; value: string }) => (
  <Card size="sm">
    <CardContent>
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </CardContent>
  </Card>
);
const ErrorBox = ({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) => (
  <div role="alert" className="border p-6">
    <p>{message}</p>
    <Button className="mt-3" variant="outline" onClick={retry}>
      Retry
    </Button>
  </div>
);
