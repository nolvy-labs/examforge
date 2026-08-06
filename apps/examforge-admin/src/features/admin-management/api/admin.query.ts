"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getAttempt,
  getExamAttempts,
  getUser,
  getUserAttempts,
  getUsers,
} from "./admin.api";
import type { AttemptListState, UserListState } from "../model/admin-query";
export const adminKeys = {
  users: ["admin-users"] as const,
  userList: (s: UserListState) => ["admin-users", "list", s] as const,
  user: (id: string) => ["admin-users", "detail", id] as const,
  userAttempts: (id: string, s: AttemptListState) =>
    ["admin-attempts", "user", id, s] as const,
  examAttempts: (id: string, s: AttemptListState) =>
    ["admin-attempts", "exam", id, s] as const,
  attempt: (id: string) => ["admin-attempts", "detail", id] as const,
};
export const useUsers = (s: UserListState) =>
  useQuery({
    queryKey: adminKeys.userList(s),
    queryFn: ({ signal }) => getUsers(s, signal),
    placeholderData: keepPreviousData,
  });
export const useUser = (id: string) =>
  useQuery({
    queryKey: adminKeys.user(id),
    queryFn: ({ signal }) => getUser(id, signal),
    enabled: zUuid(id),
  });
export const useUserAttempts = (id: string, s: AttemptListState) =>
  useQuery({
    queryKey: adminKeys.userAttempts(id, s),
    queryFn: ({ signal }) => getUserAttempts(id, s, signal),
    enabled: zUuid(id),
    placeholderData: keepPreviousData,
  });
export const useExamAttempts = (id: string, s: AttemptListState) =>
  useQuery({
    queryKey: adminKeys.examAttempts(id, s),
    queryFn: ({ signal }) => getExamAttempts(id, s, signal),
    enabled: zUuid(id),
    placeholderData: keepPreviousData,
  });
export const useAttempt = (id: string) =>
  useQuery({
    queryKey: adminKeys.attempt(id),
    queryFn: ({ signal }) => getAttempt(id, signal),
    enabled: zUuid(id),
  });
function zUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
