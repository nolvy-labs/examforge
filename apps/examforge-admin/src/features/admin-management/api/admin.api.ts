import { z } from "zod";
import { apiClient } from "@/lib/api/api.client";
import { parseApiResponse } from "@/lib/api/api.schema";
import {
  attemptDetailSchema,
  attemptListResponseSchema,
  userDetailSchema,
  userListResponseSchema,
} from "../types/admin.schema";
import {
  dateRangeToApi,
  type AttemptListState,
  type UserListState,
} from "../model/admin-query";
const uuid = z.uuid();
export function serializeUserRequest(s: UserListState) {
  const p = new URLSearchParams({
    sort: s.sort,
    page: String(s.page),
    pageSize: String(s.pageSize),
  });
  if (s.search.trim()) p.set("search", s.search.trim());
  if (s.role !== "all") p.set("role", s.role);
  if (s.active !== "all") p.set("isActive", String(s.active === "active"));
  return p;
}
export function serializeAttemptRequest(s: AttemptListState) {
  const p = new URLSearchParams({
    sort: s.sort,
    page: String(s.page),
    pageSize: String(s.pageSize),
  });
  if (s.search.trim()) p.set("search", s.search.trim());
  if (s.status !== "all") p.set("status", s.status);
  if (s.mode !== "all") p.set("mode", s.mode);
  const dates = dateRangeToApi(s.createdFrom, s.createdTo);
  if (dates.createdFrom) p.set("createdFrom", dates.createdFrom);
  if (dates.createdTo) p.set("createdTo", dates.createdTo);
  return p;
}
async function get<T>(
  path: string,
  schema: z.ZodType<T>,
  context: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<unknown>(path, { signal });
  return parseApiResponse(schema, response.data, context);
}
export const getUsers = (s: UserListState, signal?: AbortSignal) =>
  get(
    `/api/v1/admin/users?${serializeUserRequest(s)}`,
    userListResponseSchema,
    "admin users",
    signal,
  );
export const getUser = (id: string, signal?: AbortSignal) =>
  get(
    `/api/v1/admin/users/${uuid.parse(id)}`,
    userDetailSchema,
    "admin user",
    signal,
  );
export const getUserAttempts = (
  id: string,
  s: AttemptListState,
  signal?: AbortSignal,
) =>
  get(
    `/api/v1/admin/users/${uuid.parse(id)}/attempts?${serializeAttemptRequest(s)}`,
    attemptListResponseSchema,
    "user attempts",
    signal,
  );
export const getExamAttempts = (
  id: string,
  s: AttemptListState,
  signal?: AbortSignal,
) =>
  get(
    `/api/v1/admin/exams/${uuid.parse(id)}/attempts?${serializeAttemptRequest(s)}`,
    attemptListResponseSchema,
    "exam attempts",
    signal,
  );
export const getAttempt = (id: string, signal?: AbortSignal) =>
  get(
    `/api/v1/admin/attempts/${uuid.parse(id)}`,
    attemptDetailSchema,
    "admin attempt",
    signal,
  );
