"use client";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { useUsers } from "../api/admin.query";
import { UserFilters } from "../components/list-controls";
import { Pagination } from "../components/attempt-table";
import { formatDate, RoleBadge } from "../components/presentation";
import { useUserListNavigation } from "../hooks/use-admin-navigation";
export function UsersPage() {
  const nav = useUserListNavigation(),
    q = useUsers(nav.state),
    filtered = Boolean(
      nav.state.search ||
        nav.state.role !== "all" ||
        nav.state.active !== "all",
    );
  return (
    <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[96rem] space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">
            Browse user accounts and review their attempt activity.
          </p>
          {q.data && (
            <p className="mt-1 text-sm">
              {q.data.meta.totalItems.toLocaleString()} results
            </p>
          )}
        </header>
        <UserFilters
          state={nav.state}
          search={nav.searchDraft}
          setSearch={nav.setSearchDraft}
          update={nav.update}
          reset={nav.reset}
        />
        {q.isPending ? (
          <Skeleton className="h-80 w-full" />
        ) : q.isError ? (
          <State
            title="Could not load users"
            detail={q.error.message}
            action="Retry"
            onAction={() => void q.refetch()}
          />
        ) : q.data.items.length === 0 ? (
          <State
            title={filtered ? "No users match these filters" : "No users found"}
            detail={
              filtered
                ? "Try clearing or changing the filters."
                : "There are no user accounts to display."
            }
            action={filtered ? "Reset filters" : undefined}
            onAction={nav.reset}
          />
        ) : (
          <div aria-busy={q.isFetching}>
            <div className="overflow-x-auto border bg-card">
              <Table className="min-w-3xl">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Updated
                    </TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.items.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell>
                        <Link
                          className="font-medium underline"
                          href={`/users/${u.userId}`}
                        >
                          {u.displayName || "Unnamed user"}
                        </Link>
                        <div className="text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex border px-2 py-0.5 ${u.isActive ? "" : "text-muted-foreground"}`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(u.createdAtUtc)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(u.updatedAtUtc)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          render={<Link href={`/users/${u.userId}`} />}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={q.data.meta.page}
              totalPages={q.data.meta.totalPages}
              previous={q.data.meta.hasPreviousPage}
              next={q.data.meta.hasNextPage}
              onPage={(p) => nav.update({ page: p }, false)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
function State({
  title,
  detail,
  action,
  onAction,
}: {
  title: string;
  detail: string;
  action?: string;
  onAction: () => void;
}) {
  return (
    <div
      role="status"
      className="grid min-h-48 place-content-center gap-3 border p-8 text-center"
    >
      <h2 className="font-medium">{title}</h2>
      <p className="text-muted-foreground">{detail}</p>
      {action && (
        <Button variant="outline" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
