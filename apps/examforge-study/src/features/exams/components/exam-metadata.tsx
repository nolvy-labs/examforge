"use client"

import { BookOpen, Clock3, FileQuestion, Trophy } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { StudentExam } from "../types/exam.types"

export function ExamMetadata({ exam }: { exam: StudentExam }) {
	const locale = useLocale()
	const translate = useTranslations("exams")
	const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
	const items = [
		{ icon: Clock3, label: exam.publishedVersion.durationMinutes == null ? translate("noTimeLimit") : translate("minutes", { count: number(exam.publishedVersion.durationMinutes) }) },
		{ icon: FileQuestion, label: translate("questions", { count: exam.publishedVersion.questionCount }) },
		{ icon: Trophy, label: translate("points", { count: number(exam.publishedVersion.totalScore) }) },
		{ icon: BookOpen, label: translate("sections", { count: exam.publishedVersion.sectionCount }) },
	]

	return <div className="mt-auto grid grid-cols-2 gap-2 text-xs text-muted-foreground">{items.map(({ icon: Icon, label }) => <div key={label} className="flex min-w-0 items-center gap-1.5"><Icon className="size-3.5 shrink-0" /><span className="truncate">{label}</span></div>)}</div>
}
