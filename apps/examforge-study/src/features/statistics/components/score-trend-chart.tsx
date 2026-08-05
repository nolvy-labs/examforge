"use client"

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { ChartContainer, type ChartConfig } from "@/components/shadcn/chart"

import type { ScoreTrendPoint } from "../types/statistics.type"
import { formatPercentage } from "../utils/statistics.format"

const chartConfig = {
	scorePercentage: { label: "Score", color: "var(--color-primary)" },
} satisfies ChartConfig

export function ScoreTrendChart({ points }: { points: ScoreTrendPoint[] }) {
	const data = [...points].sort((left, right) =>
		left.submittedAtUtc.localeCompare(right.submittedAtUtc) || left.attemptId.localeCompare(right.attemptId)
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Score trend</CardTitle>
				<p className="text-sm text-neutral-600">Your latest 20 scored attempts, oldest to newest.</p>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<EmptyMessage>No scored attempts match these filters yet.</EmptyMessage>
				) : (
					<>
						<ChartContainer config={chartConfig} className="h-64 w-full sm:h-72" aria-label="Score trend chart">
							<LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 8 }} accessibilityLayer>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="submittedAtUtc" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={formatShortDate} />
								<YAxis domain={[0, 100]} width={38} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
								<Tooltip content={({ active, payload }) => {
									const point = payload?.[0]?.payload as ScoreTrendPoint | undefined
									if (!active || !point) return null
									return (
										<div className="max-w-64 rounded-lg border bg-white p-3 text-sm shadow-md">
											<p className="truncate font-medium" title={point.examTitle}>{point.examTitle}</p>
											<p className="mt-1 text-neutral-600">{formatLongDate(point.submittedAtUtc)} · {point.mode === "practice" ? "Practice" : "Exam"}</p>
											<p className="mt-1 font-semibold text-primary">{formatPercentage(point.scorePercentage)}</p>
										</div>
									)
								}} />
								<Line dataKey="scorePercentage" type="monotone" stroke="var(--color-scorePercentage)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
							</LineChart>
						</ChartContainer>
						<ul className="sr-only">{data.map((point) => (
							<li key={point.attemptId}>
								{formatLongDate(point.submittedAtUtc)}, {point.examTitle}, {point.mode}, {formatPercentage(point.scorePercentage)}
							</li>))}
						</ul>
					</>
				)}
			</CardContent>
		</Card>
	)
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
	return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-neutral-600">{children}</div>
}

function formatShortDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value))
}

function formatLongDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}
