"use client"

import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"

import type { AttemptDetail, DraftAnswer, ExamAttemptMode } from "../../types/attempt.type"
import { answerFromQuestion, flattenAnswerableQuestions } from "../../types/attempt.type"
import type { AttemptLocalDraft } from "../persistence/attempt-draft.storage"
import { writeAttemptDraft } from "../persistence/attempt-draft.storage"
import type { AnswerFieldKind, DirtyAnswers, SaveSnapshot } from "../utils/attempt-patch"

export type SaveState = "saved" | "waiting" | "saving" | "failed" | "offline"
export type DisplayMode = "one" | "section"

interface AttemptActions {
	initialize: (detail: AttemptDetail, etag: string, studentId: string, localDraft: AttemptLocalDraft | null) => void
	rebase: (detail: AttemptDetail, etag: string) => void
	setText: (questionId: string, value: string | null) => void
	setOptions: (questionId: string, value: string[]) => void
	setLocation: (sectionId: string, blockId: string) => void
	setDisplayMode: (mode: DisplayMode) => void
	setSaveState: (state: SaveState, message?: string) => void
	setConcurrency: (etag: string, revision: number) => void
	setLocked: (locked: boolean) => void
	setPracticeElapsed: (elapsedMs: number) => void
	getPracticeElapsed: () => number
	getAttemptId: () => string | null
	getSnapshot: () => SaveSnapshot
	getConcurrency: () => { etag: string; revision: number }
	hasDirtyChanges: () => boolean
	acknowledge: (snapshot: SaveSnapshot, etag: string, revision: number) => void
	persist: () => boolean
	reset: () => void
}

interface AttemptState {
	attemptId: string | null
	examVersionId: string
	studentId: string
	mode: ExamAttemptMode
	drafts: Record<string, DraftAnswer>
	saved: Record<string, DraftAnswer>
	dirty: DirtyAnswers
	answerFields: Record<string, AnswerFieldKind>
	changeSequence: number
	etag: string
	revision: number
	practiceElapsedMs: number
	selectedSectionId: string | null
	selectedBlockId: string | null
	displayMode: DisplayMode
	saveState: SaveState
	saveMessage: string
	hardLocked: boolean
	actions: AttemptActions
}

function serverAnswers(detail: AttemptDetail) {
	return Object.fromEntries(flattenAnswerableQuestions(detail.sections).map((question) => [question.id, answerFromQuestion(question)]))
}

function answerFields(detail: AttemptDetail) {
	return Object.fromEntries(
		flattenAnswerableQuestions(detail.sections).map((question) => [
			question.id,
			question.type === "fill-blank" ? "text" : "options",
		])
	) as Record<string, AnswerFieldKind>
}

const initialMode = (): DisplayMode =>
	typeof window !== "undefined" && window.localStorage.getItem("examforge-attempt-display") === "section"
		? "section"
		: "one"

function toLocalDraft(state: AttemptState): AttemptLocalDraft | null {
	if (!state.attemptId || !state.studentId || !state.examVersionId) return null
	return {
		schemaVersion: 1,
		attemptId: state.attemptId,
		examVersionId: state.examVersionId,
		studentId: state.studentId,
		mode: state.mode,
		serverRevision: state.revision,
		answers: state.drafts,
		dirtyAnswers: state.dirty,
		practiceElapsedMs: state.practiceElapsedMs,
		updatedAtUtc: new Date().toISOString(),
	}
}

const useAttemptStore = create<AttemptState>((set, get) => {
	const persist = () => {
		const draft = toLocalDraft(get())
		if (!draft) return true
		const available = writeAttemptDraft(draft)
		if (!available) set({ saveMessage: "Local storage is unavailable. Keep this tab open until answers synchronize." })
		return available
	}
	const markChanged = (questionId: string) => {
		const state = get()
		return {
			dirty: { ...state.dirty, [questionId]: (state.dirty[questionId] ?? 0) + 1 },
			changeSequence: state.changeSequence + 1,
			saveState: "waiting" as const,
		}
	}

	return {
		attemptId: null,
		examVersionId: "",
		studentId: "",
		mode: "practice",
		drafts: {},
		saved: {},
		dirty: {},
		answerFields: {},
		changeSequence: 0,
		etag: "",
		revision: 0,
		practiceElapsedMs: 0,
		selectedSectionId: null,
		selectedBlockId: null,
		displayMode: "one",
		saveState: "saved",
		saveMessage: "",
		hardLocked: false,
			actions: {
			initialize: (detail, etag, studentId, localDraft) => set((state) => {
				const fields = answerFields(detail)
				if (state.attemptId === detail.attemptId) {
					return { answerFields: fields }
				}
				const incoming = serverAnswers(detail)
				const dirty = Object.fromEntries(
					Object.entries(localDraft?.dirtyAnswers ?? {}).filter(([id]) => Boolean(incoming[id]))
				)
				const drafts = { ...incoming }
				for (const id of Object.keys(dirty)) {
					if (localDraft?.answers[id] && incoming[id]) drafts[id] = localDraft.answers[id]
				}
				return {
					attemptId: detail.attemptId,
					examVersionId: detail.examVersionId,
					studentId,
					mode: detail.mode,
					drafts,
					saved: incoming,
					dirty,
					answerFields: fields,
					changeSequence: Object.keys(dirty).length ? 1 : 0,
					etag,
					revision: detail.revision,
					practiceElapsedMs: localDraft?.mode === "practice" && detail.mode === "practice" ? localDraft.practiceElapsedMs : 0,
					selectedSectionId: detail.sections[0]?.id ?? null,
					selectedBlockId: detail.sections[0]?.questions[0]?.id ?? null,
					displayMode: initialMode(),
					saveState: Object.keys(dirty).length ? "waiting" : "saved",
					saveMessage: "",
					hardLocked: false,
				}
			}),
			rebase: (detail, etag) => {
				set((state) => {
					const incoming = serverAnswers(detail)
					const drafts = { ...incoming }
					for (const id of Object.keys(state.dirty)) {
						if (state.drafts[id] && incoming[id]) drafts[id] = state.drafts[id]
					}
					return { drafts, saved: incoming, etag, revision: detail.revision }
				})
				persist()
			},
			setText: (id, value) => {
				if (get().hardLocked) return
				set((state) => ({
					drafts: { ...state.drafts, [id]: { ...(state.drafts[id] ?? { textAnswer: null, selectedOptionIds: [] }), textAnswer: value } },
					...markChanged(id),
				}))
				persist()
			},
			setOptions: (id, value) => {
				if (get().hardLocked) return
				set((state) => ({
					drafts: { ...state.drafts, [id]: { ...(state.drafts[id] ?? { textAnswer: null, selectedOptionIds: [] }), selectedOptionIds: [...new Set(value)] } },
					...markChanged(id),
				}))
				persist()
			},
			setLocation: (selectedSectionId, selectedBlockId) => set({ selectedSectionId, selectedBlockId }),
			setDisplayMode: (displayMode) => {
				try { window.localStorage.setItem("examforge-attempt-display", displayMode) } catch { /* non-critical preference */ }
				set({ displayMode })
			},
			setSaveState: (saveState, saveMessage = "") => set({ saveState, saveMessage }),
			setConcurrency: (etag, revision) => { set({ etag, revision }); persist() },
			setLocked: (hardLocked) => set({ hardLocked }),
			setPracticeElapsed: (practiceElapsedMs) => { set({ practiceElapsedMs }); persist() },
			getPracticeElapsed: () => get().practiceElapsedMs,
			getAttemptId: () => get().attemptId,
			getSnapshot: () => {
				const state = get()
				return {
					answers: Object.fromEntries(Object.keys(state.dirty).map((id) => [id, { textAnswer: state.drafts[id]?.textAnswer ?? null, selectedOptionIds: [...(state.drafts[id]?.selectedOptionIds ?? [])] }])),
					generations: { ...state.dirty },
					fields: Object.fromEntries(
						Object.keys(state.dirty).map((id) => [id, state.answerFields[id]])
					) as Record<string, AnswerFieldKind>,
				}
			},
			getConcurrency: () => ({ etag: get().etag, revision: get().revision }),
			hasDirtyChanges: () => Object.keys(get().dirty).length > 0,
			acknowledge: (snapshot, etag, revision) => {
				set((state) => {
					const saved = { ...state.saved }
					const dirty = { ...state.dirty }
					for (const [id, sentGeneration] of Object.entries(snapshot.generations)) {
						saved[id] = snapshot.answers[id]
						if (dirty[id] === sentGeneration) delete dirty[id]
					}
					return { saved, dirty, etag, revision, saveState: Object.keys(dirty).length ? "waiting" : "saved", saveMessage: "" }
				})
				persist()
			},
			persist,
			reset: () => set({
				attemptId: null, examVersionId: "", studentId: "", mode: "practice", drafts: {}, saved: {}, dirty: {}, answerFields: {}, changeSequence: 0,
				etag: "", revision: 0, practiceElapsedMs: 0, selectedSectionId: null, selectedBlockId: null,
				saveState: "saved", saveMessage: "", hardLocked: false,
			}),
		},
	}
})

export const useAttemptIdentity = () => useAttemptStore((state) => state.attemptId)
export const useAttemptAnswers = () => useAttemptStore(useShallow((state) => ({ drafts: state.drafts, dirty: state.dirty })))
export const useAttemptAnswer = (questionId: string) => useAttemptStore((state) => state.drafts[questionId])
export const useAttemptNavigation = () => useAttemptStore(useShallow((state) => ({ selectedSectionId: state.selectedSectionId, selectedBlockId: state.selectedBlockId, displayMode: state.displayMode })))
export const useAttemptSaveStatus = () => useAttemptStore(useShallow((state) => ({ saveState: state.saveState, saveMessage: state.saveMessage })))
export const useAttemptLocked = () => useAttemptStore((state) => state.hardLocked)
export const useAttemptDirtyCount = () => useAttemptStore((state) => Object.keys(state.dirty).length)
export const useAttemptChangeSequence = () => useAttemptStore((state) => state.changeSequence)
export const useAttemptPracticeElapsed = () => useAttemptStore((state) => state.practiceElapsedMs)
export const useAttemptActions = () => useAttemptStore((state) => state.actions)
