import { z } from "zod";

export const userListStateSchema = z.object({
  search: z.string().max(200),
  role: z.enum(["all", "student", "admin"]),
  active: z.enum(["all", "active", "inactive"]),
  sort: z.enum(["created-at-desc", "created-at-asc"]),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
});
export const attemptListStateSchema = z.object({
  search: z.string().max(200),
  status: z.enum(["all", "in-progress", "submitted", "abandoned"]),
  mode: z.enum(["all", "practice", "exam"]),
  createdFrom: z.string(),
  createdTo: z.string(),
  sort: z.enum(["created-at-desc", "created-at-asc"]),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
});
export type UserListState = z.infer<typeof userListStateSchema>;
export type AttemptListState = z.infer<typeof attemptListStateSchema>;
const positive = (
  v: string | null,
  fallback = 1,
  maximum = Number.MAX_SAFE_INTEGER,
) =>
  v && /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= maximum
    ? Number(v)
    : fallback;
export function parseUserListState(p: URLSearchParams): UserListState {
  return userListStateSchema.parse({
    search: (p.get("search") ?? "").trim().slice(0, 200),
    role: ["student", "admin"].includes(p.get("role") ?? "")
      ? p.get("role")
      : "all",
    active: ["active", "inactive"].includes(p.get("isActive") ?? "")
      ? p.get("isActive")
      : "all",
    sort:
      p.get("sort") === "created-at-asc" ? "created-at-asc" : "created-at-desc",
    page: positive(p.get("page")),
    pageSize: positive(p.get("pageSize"), 20, 100),
  });
}
export function parseAttemptListState(p: URLSearchParams): AttemptListState {
  return attemptListStateSchema.parse({
    search: (p.get("search") ?? "").trim().slice(0, 200),
    status: ["in-progress", "submitted", "abandoned"].includes(
      p.get("status") ?? "",
    )
      ? p.get("status")
      : "all",
    mode: ["practice", "exam"].includes(p.get("mode") ?? "")
      ? p.get("mode")
      : "all",
    createdFrom: p.get("createdFrom") ?? "",
    createdTo: p.get("createdTo") ?? "",
    sort:
      p.get("sort") === "created-at-asc" ? "created-at-asc" : "created-at-desc",
    page: positive(p.get("page")),
    pageSize: positive(p.get("pageSize"), 20, 100),
  });
}
export function dateRangeToApi(from: string, to: string) {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T00:00:00`) : null;
  // The UI end date is inclusive; advancing by a local calendar day preserves the API's exclusive boundary across DST.
  if (end) end.setDate(end.getDate() + 1);
  if (
    (start && Number.isNaN(start.valueOf())) ||
    (end && Number.isNaN(end.valueOf())) ||
    (start && end && start >= end)
  )
    throw new Error("Choose a valid date range.");
  return { createdFrom: start?.toISOString(), createdTo: end?.toISOString() };
}
function baseParams(state: {
  search: string;
  sort: string;
  page: number;
  pageSize: number;
}) {
  const p = new URLSearchParams();
  if (state.search.trim()) p.set("search", state.search.trim());
  if (state.sort !== "created-at-desc") p.set("sort", state.sort);
  if (state.page !== 1) p.set("page", String(state.page));
  if (state.pageSize !== 20) p.set("pageSize", String(state.pageSize));
  return p;
}
export function serializeUserState(s: UserListState) {
  const p = baseParams(s);
  if (s.role !== "all") p.set("role", s.role);
  if (s.active !== "all") p.set("isActive", s.active);
  return p;
}
export function serializeAttemptState(s: AttemptListState) {
  const p = baseParams(s);
  if (s.status !== "all") p.set("status", s.status);
  if (s.mode !== "all") p.set("mode", s.mode);
  if (s.createdFrom) p.set("createdFrom", s.createdFrom);
  if (s.createdTo) p.set("createdTo", s.createdTo);
  return p;
}
