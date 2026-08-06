import { Badge } from "@/components/shadcn/badge";
export const formatDate = (value: string | null) => {
  if (!value) return "Not available";
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? "Not available"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
};
export const formatNumber = (value: number | null) =>
  value === null ? "Not available" : new Intl.NumberFormat().format(value);
export const formatPercent = (value: number | null) =>
  value === null
    ? "Not available"
    : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}%`;
export function RoleBadge({ role }: { role: 1 | 5 }) {
  return <Badge variant="outline">{role === 5 ? "Admin" : "Student"}</Badge>;
}
export function StatusBadge({ status }: { status: 0 | 1 | 2 }) {
  return (
    <Badge
      variant={
        status === 1 ? "secondary" : status === 2 ? "destructive" : "outline"
      }
    >
      {status === 0 ? "In progress" : status === 1 ? "Submitted" : "Abandoned"}
    </Badge>
  );
}
export function ModeBadge({ mode }: { mode: "practice" | "exam" }) {
  return (
    <Badge variant="outline">{mode === "practice" ? "Practice" : "Exam"}</Badge>
  );
}
export function Score({
  status,
  score,
}: {
  status: 0 | 1 | 2;
  score: {
    score: number | null;
    maximumScore: number | null;
    percentage: number | null;
  };
}) {
  if (status !== 1 || score.score === null || score.maximumScore === null)
    return <span className="text-muted-foreground">Not graded</span>;
  return (
    <span>
      {formatNumber(score.score)} / {formatNumber(score.maximumScore)}
      {score.percentage === null ? "" : ` (${formatPercent(score.percentage)})`}
    </span>
  );
}
