import { MainHeader } from "@/components/layout/header/header"
import { Card, CardContent } from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"
import { LocaleMessage } from "@/components/locale/locale-message"

export default function Loading() {
	return <ExamDetailSkeleton />
}

function ExamDetailSkeleton() {
	return (
		<div className="flex min-h-svh flex-col bg-muted/30">
			<MainHeader />
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
				<Skeleton className="h-9 w-44" />
				<div className="mt-6 space-y-4">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-10 w-full max-w-2xl" />
					<Skeleton className="h-6 w-full max-w-3xl" />
				</div>
				<div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<div className="space-y-4">
						<Card>
							<CardContent className="space-y-3">
								<Skeleton className="h-6 w-36" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-5/6" />
							</CardContent>
						</Card>
						<Skeleton className="h-48 w-full" />
					</div>
					<Skeleton className="h-80 w-full" />
				</div>
				<p className="sr-only"><LocaleMessage messageId="accessibility.loadingExamDetails" /></p>
			</main>
		</div>
	)
}