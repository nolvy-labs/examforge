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
	getSectionKindLabel,
} from "../model/exam-detail"
import ContentRenderer from "@/components/common/content-renderer"

interface Props {
	sections: StudentExamSection[]
}

export function ExamSectionList({ sections }: Props) {
	return (
		<section>
			<h2 id="exam-sections-heading" className="text-xl font-semibold">
				Sections summary
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
										{getSectionKindLabel(section.kind)}
									</Badge>
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{getSectionFacts(section)}
								</p>
							</div>
						</CardHeader>
						{section.instructions.trim() && (
							<CardContent>
								<h4 className="text-base font-semibold">Section Instructions</h4>
								<div className="whitespace-pre-line wrap-break-word text-sm leading-6 text-muted-foreground">
									<ContentRenderer content={section.instructions} />
								</div>
							</CardContent>
						)}
					</Card>
				))}
			</div>
		</section>
	)
}
