import { Skeleton } from "@/components/shadcn/skeleton"

export function ExamAttemptHistorySkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-20 w-full" />
		</div>
	)
}
