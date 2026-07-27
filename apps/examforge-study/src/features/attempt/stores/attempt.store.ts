"use client"

import { create } from "zustand"

import type {
	AttemptDetail,
	DraftAnswer,
} from "../types/attempt.type"
import {
	answerFromQuestion,
	flattenAnswerableQuestions,
} from "../types/attempt.type"
import type { DirtyFields, SaveSnapshot } from "../utils/attempt-patch"
import { answersEqual } from "../utils/attempt-patch"

export type SaveState = "saved" | "waiting" | "saving" | "failed" | "offline"
export type DisplayMode = "one" | "section"

interface AttemptWorkspace {
	attemptId: string | null
	drafts: Record<string, DraftAnswer>
	saved: Record<string, DraftAnswer>
	dirty: DirtyFields
	etag: string
	revision: number
	selectedSectionId: string | null
	selectedBlockId: string | null
	displayMode: DisplayMode
	saveState: SaveState
	saveMessage: string
	locked: boolean
	initialize: (detail: AttemptDetail, etag: string) => void
	rebase: (detail: AttemptDetail, etag: string) => void
	setText: (questionId: string, value: string | null) => void
	setOptions: (questionId: string, value: string[]) => void
	setLocation: (sectionId: string, blockId: string) => void
	setDisplayMode: (mode: DisplayMode) => void
	setSaveState: (state: SaveState, message?: string) => void
	setConcurrency: (etag: string, revision: number) => void
	setLocked: (locked: boolean) => void
	snapshot: () => SaveSnapshot
	acknowledge: (snapshot: SaveSnapshot, etag: string, revision: number) => void
	reset: () => void
}

function serverAnswers(detail: AttemptDetail) {
	return Object.fromEntries(
		flattenAnswerableQuestions(detail.sections).map((question) => [
			question.id,
			answerFromQuestion(question),
		])
	)
}

const initialMode = (): DisplayMode =>
	typeof window !== "undefined" &&
	window.localStorage.getItem("examforge-attempt-display") === "section"
		? "section"
		: "one"

export const useAttemptStore = create<AttemptWorkspace>((set, get) => ({
	attemptId: null,
	drafts: {},
	saved: {},
	dirty: {},
	etag: "",
	revision: 0,
	selectedSectionId: null,
	selectedBlockId: null,
	displayMode: "one",
	saveState: "saved",
	saveMessage: "",
	locked: false,
	initialize: (detail, etag) =>
		set((state) => {
			if (state.attemptId === detail.attemptId) return state
			const answers = serverAnswers(detail)
			return {
				attemptId: detail.attemptId,
				drafts: answers,
				saved: answers,
				dirty: {},
				etag,
				revision: detail.revision,
				selectedSectionId: detail.sections[0]?.id ?? null,
				selectedBlockId: detail.sections[0]?.questions[0]?.id ?? null,
				displayMode: initialMode(),
				saveState: "saved",
				saveMessage: "",
				locked: false,
			}
		}),
	rebase: (detail, etag) =>
		set((state) => {
			const incoming = serverAnswers(detail)
			const drafts = { ...incoming, ...state.drafts }
			for (const id of Object.keys(incoming)) {
				if (!state.dirty[id]) drafts[id] = incoming[id]
			}
			return { drafts, saved: incoming, etag, revision: detail.revision }
		}),
	setText: (id, value) =>
		set((state) =>
			state.locked
				? state
				: {
						drafts: {
							...state.drafts,
							[id]: {
								...(state.drafts[id] ?? {
									textAnswer: null,
									selectedOptionIds: [],
								}),
								textAnswer: value,
							},
						},
						dirty: {
							...state.dirty,
							[id]: { ...state.dirty[id], textAnswer: true },
						},
						saveState: "waiting",
					}
		),
	setOptions: (id, value) =>
		set((state) =>
			state.locked
				? state
				: {
						drafts: {
							...state.drafts,
							[id]: {
								...(state.drafts[id] ?? {
									textAnswer: null,
									selectedOptionIds: [],
								}),
								selectedOptionIds: [...new Set(value)],
							},
						},
						dirty: {
							...state.dirty,
							[id]: { ...state.dirty[id], selectedOptionIds: true },
						},
						saveState: "waiting",
					}
		),
	setLocation: (selectedSectionId, selectedBlockId) =>
		set({ selectedSectionId, selectedBlockId }),
	setDisplayMode: (displayMode) => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("examforge-attempt-display", displayMode)
		}
		set({ displayMode })
	},
	setSaveState: (saveState, saveMessage = "") => set({ saveState, saveMessage }),
	setConcurrency: (etag, revision) => set({ etag, revision }),
	setLocked: (locked) => set({ locked }),
	snapshot: () => {
		const state = get()
		return {
			answers: Object.fromEntries(
				Object.keys(state.dirty).map((id) => [
					id,
					{
						textAnswer: state.drafts[id]?.textAnswer ?? null,
						selectedOptionIds: [...(state.drafts[id]?.selectedOptionIds ?? [])],
					},
				])
			),
			fields: structuredClone(state.dirty),
		}
	},
	acknowledge: (snapshot, etag, revision) =>
		set((state) => {
			const saved = { ...state.saved }
			const dirty = { ...state.dirty }
			for (const [id, captured] of Object.entries(snapshot.answers)) {
				saved[id] = captured
				if (answersEqual(state.drafts[id], captured)) delete dirty[id]
			}
			return {
				saved,
				dirty,
				etag,
				revision,
				saveState: Object.keys(dirty).length ? "waiting" : "saved",
				saveMessage: "",
			}
		}),
	reset: () =>
		set({
			attemptId: null,
			drafts: {},
			saved: {},
			dirty: {},
			etag: "",
			revision: 0,
			selectedSectionId: null,
			selectedBlockId: null,
			saveState: "saved",
			saveMessage: "",
			locked: false,
		}),
}))
