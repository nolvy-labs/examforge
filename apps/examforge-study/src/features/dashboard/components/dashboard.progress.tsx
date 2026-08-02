import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { BarChart3, Clock3, FileCheck2 } from "lucide-react"

export function DashboardProgress() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="progress-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Progress overview
			</h2>
			<div className="grid gap-4 sm:grid-cols-3">
				<ExamCompleted />
				<AverageScore />
				<PracticeTime />
			</div>
		</section>
	)
}


function ExamCompleted() {
	return (
		<Card className="flex flex-col gap-0">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-semibold">Exams completed</CardTitle>
				<span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
					<FileCheck2 className="size-4" />
				</span>
			</CardHeader>
			<CardContent>
				<p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">0</p>
			</CardContent>
		</Card>
	)
}

function PracticeTime() {
	return (
		<Card className="flex flex-col gap-0">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-semibold">Practice time</CardTitle>
				<span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
					<Clock3 className="size-4" />
				</span>
			</CardHeader>
			<CardContent>
				<p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">0m</p>
			</CardContent>
		</Card>
	)
}

function AverageScore() {
	return (
		<Card className="flex flex-col gap-0">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-semibold">Average score</CardTitle>
				<span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
					<BarChart3 className="size-4" />
				</span>
			</CardHeader>
			<CardContent>
				<p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">__</p>
			</CardContent>
		</Card>
	)
}