"use client"

import { useMemo } from "react"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { ApiError } from "@/lib/api/api.error"
import { useAdminExamDetail, useCompleteAdminExamVersion } from "../api/exam-builder.query"
import { ExamBuilderShell } from "../components/exam-builder-shell"
import { useExamBuilderAutosave } from "../hooks/use-exam-builder-autosave"
import { useInitializeExamBuilder } from "../hooks/use-exam-builder-initialization"
import { useExamBuilderNavigationGuard } from "../hooks/use-exam-builder-navigation-guard"

const uuid = z.uuid()

export function ExamBuilderPage({ examId, versionId }: { examId: string; versionId: string }) {
	const valid = uuid.safeParse(examId).success && uuid.safeParse(versionId).success
	const exam = useAdminExamDetail(examId); const version = useCompleteAdminExamVersion(examId, versionId)
	const mismatch = Boolean(version.data && version.data.data.examId.toLowerCase() !== examId.toLowerCase())
	const initializationResponse = useMemo(() => valid && !mismatch && exam.data ? version.data : undefined, [exam.data, mismatch, valid, version.data])
	useInitializeExamBuilder(initializationResponse, exam.data?.isArchived ?? false)
	useExamBuilderAutosave(); useExamBuilderNavigationGuard()
	if (!valid) return <PageMessage title="Invalid builder address" text="The Exam or Version identifier is not valid." />
	if (exam.isPending || version.isPending) return <main className="flex flex-1 items-center justify-center" role="status">Loading complete Exam Version…</main>
	if (mismatch) return <PageMessage title="Version does not belong to this Exam" text="The direct URL was rejected and the builder was not initialized." />
	if (exam.isError || version.isError) { const error = (exam.error ?? version.error) as unknown; const message = error instanceof ApiError ? error.message : "The Exam Builder could not be loaded."; const title = error instanceof ApiError && error.code === "forbidden" ? "Access denied" : error instanceof ApiError && error.code === "not-found" ? "Exam or Version not found" : "Unable to load Exam Builder"; return <PageMessage title={title} text={message} retry={() => { void exam.refetch(); void version.refetch() }} /> }
	if (!exam.data || !version.data) return <PageMessage title="Exam Builder unavailable" text="Complete Exam data was not returned." />
	return <ExamBuilderShell exam={exam.data} />
}

function PageMessage({ title, text, retry }: { title: string; text: string; retry?: () => void }) { return <main className="flex flex-1 items-center justify-center p-6"><Alert className="max-w-xl"><AlertTitle>{title}</AlertTitle><AlertDescription>{text}{retry ? <div className="mt-4"><Button variant="outline" onClick={retry}>Retry</Button></div> : null}</AlertDescription></Alert></main> }
