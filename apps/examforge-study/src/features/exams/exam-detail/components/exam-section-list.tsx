import { Badge } from "@/components/shadcn/badge"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"

import type { StudentExamSection } from "../../types/exam.types"
import {
	getSectionFacts,
} from "../model/exam-detail"
import { RichTextRenderer } from "@/components/common/rich-text-renderer"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

interface Props {
	sections: StudentExamSection[]
}

export function ExamSectionList({ sections }: Props) {
	const locale = useLocale()
	const translate = useTranslations("exams")
	return (
		<section>
			<h2 id="exam-sections-heading" className="text-xl font-semibold">
				<LocaleMessage messageId="exams.sectionsSummary" />
			</h2>
			<div className="mt-4 space-y-3">
				{sections.map((section, index) => (
					<Card key={section.id} size="sm">
						<CardHeader className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
							<Badge
								variant="secondary"
								className="size-9 text-sm"
							>
								{index + 1}
							</Badge>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<CardTitle>
										<h3 className="wrap-break-word">{section.title}</h3>
									</CardTitle>
									<Badge variant="outline">
										{translate(section.kind === "default" ? "general" : section.kind)}
									</Badge>
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{getSectionFacts(section, locale, translate)}
								</p>
							</div>
						</CardHeader>
						{(section.instructions || section.stimulusText) && (
							<CardContent>
								<RichTextRenderer
									content={section.stimulusText}
									className="mb-4 text-sm"
								/>
								{section.instructions && (
									<>
										<h4 className="text-base font-semibold"><LocaleMessage messageId="exams.sectionInstructions" /></h4>
										<RichTextRenderer content={section.instructions} className="mt-2 text-sm text-muted-foreground" />
									</>
								)}
							</CardContent>
						)}
					</Card>
				))}
			</div>
		</section>
	)
}
