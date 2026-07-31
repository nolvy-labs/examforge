import { Skeleton } from "@/components/shadcn/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"

export function ExamTableSkeleton() {
	return (
		<div className="border bg-card" aria-busy="true" aria-label="Loading exams">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[38%]">Exam</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Tags</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 6 }, (_, index) => (
						<TableRow key={index}>
							<TableCell><Skeleton className="h-10 w-full max-w-72" /></TableCell>
							<TableCell><Skeleton className="h-5 w-14" /></TableCell>
							<TableCell><Skeleton className="h-5 w-32" /></TableCell>
							<TableCell><Skeleton className="h-5 w-16" /></TableCell>
							<TableCell><Skeleton className="size-7" /></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<p className="sr-only" role="status">Loading exams…</p>
		</div>
	)
}
