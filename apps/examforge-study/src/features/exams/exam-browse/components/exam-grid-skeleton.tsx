import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"

export function ExamGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }, (_, index) => (
				<Card key={index}>
					<CardHeader>
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-6 w-4/5" />
						<Skeleton className="h-6 w-2/3" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
					</CardContent>
					<CardFooter>
						<Skeleton className="h-9 w-full" />
					</CardFooter>
				</Card>
			))}
		</div>
	)
}
