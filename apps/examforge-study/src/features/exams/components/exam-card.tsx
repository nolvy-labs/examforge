import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { Separator } from "@/components/shadcn/separator"
import { cn } from "@/lib/utils"

import { ExamMetadata } from "./exam-metadata"
import type { StudentExam } from "../types/exam.types"
import { LocaleMessage } from "@/components/locale/locale-message"

interface ExamCardProps {
	exam: StudentExam
}

export default function ExamCard({ exam }: ExamCardProps) {
	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="line-clamp-1 min-h-fit font-bold">
					<h3 title={exam.title}>{exam.title}</h3>
				</CardTitle>
				<CardDescription
					className="line-clamp-3 min-h-16"
					title={exam.description}
				>
					{exam.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex h-full w-full flex-col gap-4">
				<div className="flex flex-wrap gap-2 min-h-6">
					{exam.tags.map((tag) => (
						<Badge key={tag.id + tag.slug} variant="secondary">
							{tag.name}
						</Badge>
					))}
				</div>
				<ExamMetadata exam={exam} />
				<Separator className="mt-auto" />
			</CardContent>
			<CardFooter>
				<Link
					href={`/exams/${encodeURIComponent(exam.slug)}`}
					className={cn(buttonVariants({ variant: "outline" }), "w-full")}
				>
					<LocaleMessage messageId="exams.viewExam" />
					<ArrowRight />
				</Link>
			</CardFooter>
		</Card>
	)
}