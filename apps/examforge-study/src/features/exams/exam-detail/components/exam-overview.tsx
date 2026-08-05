import { Clock3, FileQuestion, Layers3, Trophy, type LucideIcon } from "lucide-react"

import type { StudentExamDetail } from "../../types/exam.types"
import { formatNumber, getExamCounts } from "../model/exam-detail"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

interface Props {
	detail: StudentExamDetail
}

export function ExamOverview({ detail }: Props) {
	const locale = useLocale()
	const translate = useTranslations("exams")
	const counts = getExamCounts(detail)
	const version = detail.publishedVersion
	const facts: Array<{ icon: LucideIcon; label: string; value: string }> = [
		{
			icon: Clock3,
			label: translate("duration"),
			value:
				version.durationMinutes == null
					? translate("noTimeLimit")
					: translate("minutes", { count: version.durationMinutes }),
		},
		{
			icon: FileQuestion,
			label: translate("questions", { count: counts.questionCount }),
			value: new Intl.NumberFormat(locale).format(counts.questionCount),
		},
		{ icon: Layers3, label: translate("sections", { count: counts.sectionCount }), value: new Intl.NumberFormat(locale).format(counts.sectionCount) },
		{
			icon: Trophy,
			label: translate("totalScore"),
			value: formatNumber(version.totalScore, locale),
		}
	]

	return (
		<div>
			<h2 className="text-lg font-semibold"><LocaleMessage messageId="exams.details" /></h2>
			<dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
				{facts.map(({ icon: Icon, label, value }) => (
					<div key={label} className="min-w-0 rounded-md bg-neutral-100 p-3">
						<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Icon className="size-3.5" />
							{label}
						</dt>
						<dd className="mt-1 truncate font-medium">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	)
}
