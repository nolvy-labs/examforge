"use client";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import type { AttemptListState, UserListState } from "../model/admin-query";

const Select = ({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) => (
  <label className="grid gap-1 text-xs">
    <span className="font-medium">{label}</span>
    <select
      className="h-8 border bg-background px-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  </label>
);
export function UserFilters({
  state,
  search,
  setSearch,
  update,
  reset,
}: {
  state: UserListState;
  search: string;
  setSearch: (s: string) => void;
  update: (p: Partial<UserListState>) => void;
  reset: () => void;
}) {
  const filtered = Boolean(
    state.search ||
      state.role !== "all" ||
      state.active !== "all" ||
      state.sort !== "created-at-desc",
  );
  return (
    <div className="grid gap-3 border bg-card p-3 md:grid-cols-5">
      <div className="grid gap-1 md:col-span-2">
        <Label htmlFor="user-search">Search users</Label>
        <Input
          id="user-search"
          placeholder="Display name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Select
        label="Role"
        value={state.role}
        onChange={(v) => update({ role: v as UserListState["role"] })}
      >
        <option value="all">All roles</option>
        <option value="student">Student</option>
        <option value="admin">Admin</option>
      </Select>
      <Select
        label="Status"
        value={state.active}
        onChange={(v) => update({ active: v as UserListState["active"] })}
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>
      <div className="flex items-end gap-2">
        <Select
          label="Created"
          value={state.sort}
          onChange={(v) => update({ sort: v as UserListState["sort"] })}
        >
          <option value="created-at-desc">Newest first</option>
          <option value="created-at-asc">Oldest first</option>
        </Select>
        {filtered && (
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
export function AttemptFilters({
  state,
  search,
  setSearch,
  update,
  reset,
  scope,
}: {
  state: AttemptListState;
  search: string;
  setSearch: (s: string) => void;
  update: (p: Partial<AttemptListState>) => void;
  reset: () => void;
  scope: "user" | "exam";
}) {
  return (
    <div className="grid gap-3 border bg-card p-3 lg:grid-cols-4 xl:grid-cols-7">
      <div className="grid gap-1 lg:col-span-2">
        <Label htmlFor={`${scope}-attempt-search`}>Search attempts</Label>
        <Input
          id={`${scope}-attempt-search`}
          placeholder={
            scope === "user" ? "Exam title or slug" : "User name or email"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Select
        label="Status"
        value={state.status}
        onChange={(v) => update({ status: v as AttemptListState["status"] })}
      >
        <option value="all">All statuses</option>
        <option value="in-progress">In progress</option>
        <option value="submitted">Submitted</option>
        <option value="abandoned">Abandoned</option>
      </Select>
      <Select
        label="Mode"
        value={state.mode}
        onChange={(v) => update({ mode: v as AttemptListState["mode"] })}
      >
        <option value="all">All modes</option>
        <option value="practice">Practice</option>
        <option value="exam">Exam</option>
      </Select>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">Created from</span>
        <Input
          type="date"
          value={state.createdFrom}
          onChange={(e) => update({ createdFrom: e.target.value })}
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="font-medium">Created to (inclusive)</span>
        <Input
          type="date"
          value={state.createdTo}
          min={state.createdFrom || undefined}
          onChange={(e) => update({ createdTo: e.target.value })}
        />
      </label>
      <div className="flex items-end gap-2">
        <Select
          label="Created"
          value={state.sort}
          onChange={(v) => update({ sort: v as AttemptListState["sort"] })}
        >
          <option value="created-at-desc">Newest first</option>
          <option value="created-at-asc">Oldest first</option>
        </Select>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
