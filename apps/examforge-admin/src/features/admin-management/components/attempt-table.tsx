"use client";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import type { AttemptSummary } from "../types/admin.schema";
import { formatDate, ModeBadge, Score, StatusBadge } from "./presentation";
export function Pagination({
  page,
  totalPages,
  previous,
  next,
  onPage,
}: {
  page: number;
  totalPages: number;
  previous: boolean;
  next: boolean;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Result pages"
      className="flex items-center justify-between border-t p-3"
    >
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={!previous}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!next}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
export function AttemptTable({
  items,
  scope,
}: {
  items: AttemptSummary[];
  scope: "user" | "exam";
}) {
  return (
    <div className="overflow-x-auto border bg-card">
      <Table className="min-w-4xl">
        <TableHeader>
          <TableRow>
            <TableHead>{scope === "user" ? "Exam" : "User"}</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Finished</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.attemptId}>
              <TableCell>
                {scope === "user" ? (
                  <>
                    <div className="font-medium">{a.exam.title}</div>
                    <div className="text-muted-foreground">/{a.exam.slug}</div>
                  </>
                ) : (
                  <Link
                    className="font-medium underline"
                    href={`/users/${a.user.userId}`}
                  >
                    {a.user.displayName || "Unnamed user"}
                    <span className="block font-normal text-muted-foreground">
                      {a.user.email}
                    </span>
                  </Link>
                )}
              </TableCell>
              <TableCell>
                v{a.examVersion.versionNumber}: {a.examVersion.title}
              </TableCell>
              <TableCell>
                <StatusBadge status={a.status} />
              </TableCell>
              <TableCell>
                <ModeBadge mode={a.mode} />
              </TableCell>
              <TableCell>
                <Score status={a.status} score={a.score} />
              </TableCell>
              <TableCell>{formatDate(a.startedAtUtc)}</TableCell>
              <TableCell>
                {formatDate(a.submittedAtUtc ?? a.abandonedAtUtc)}
              </TableCell>
              <TableCell>
                <Button
                  render={<Link href={`/attempt-results/${a.attemptId}`} />}
                  variant="outline"
                >
                  View result
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
