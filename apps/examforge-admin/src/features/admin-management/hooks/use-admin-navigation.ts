"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseAttemptListState,
  parseUserListState,
  serializeAttemptState,
  serializeUserState,
  type AttemptListState,
  type UserListState,
} from "../model/admin-query";

export function useUserListNavigation(delay = 400) {
  const nav = useNavigation(parseUserListState, serializeUserState);
  const [draft, setDraft] = useState(nav.state.search);
  useEffect(() => setDraft(nav.state.search), [nav.state.search]);
  useEffect(() => {
    const value = draft.trim();
    if (value === nav.state.search) return;
    const timer = setTimeout(() => nav.update({ search: value }), delay);
    return () => clearTimeout(timer);
  }, [delay, draft, nav]);
  return { ...nav, searchDraft: draft, setSearchDraft: setDraft };
}
export function useAttemptListNavigation(delay = 400) {
  const nav = useNavigation(parseAttemptListState, serializeAttemptState);
  const [draft, setDraft] = useState(nav.state.search);
  useEffect(() => setDraft(nav.state.search), [nav.state.search]);
  useEffect(() => {
    const value = draft.trim();
    if (value === nav.state.search) return;
    const timer = setTimeout(() => nav.update({ search: value }), delay);
    return () => clearTimeout(timer);
  }, [delay, draft, nav]);
  return { ...nav, searchDraft: draft, setSearchDraft: setDraft };
}
function useNavigation<T extends UserListState | AttemptListState>(
  parse: (p: URLSearchParams) => T,
  serialize: (s: T) => URLSearchParams,
) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams(),
    raw = params.toString();
  const state = useMemo(() => parse(new URLSearchParams(raw)), [parse, raw]);
  const navigate = useCallback(
    (next: T, replace = false) => {
      const query = serialize(next).toString(),
        href = query ? `${pathname}?${query}` : pathname;
      if (href !== `${pathname}${raw ? `?${raw}` : ""}`)
        (replace ? router.replace : router.push)(href, { scroll: false });
    },
    [pathname, raw, router, serialize],
  );
  const update = useCallback(
    (patch: Partial<T>, reset = true) =>
      navigate({
        ...state,
        ...patch,
        page: reset ? 1 : (patch.page ?? state.page),
      } as T),
    [navigate, state],
  );
  const reset = useCallback(
    () => navigate(parse(new URLSearchParams())),
    [navigate, parse],
  );
  return useMemo(
    () => ({ state, update, reset, navigate }),
    [navigate, reset, state, update],
  );
}
