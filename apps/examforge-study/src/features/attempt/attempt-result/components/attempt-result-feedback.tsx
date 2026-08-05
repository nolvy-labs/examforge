import { MainHeader } from "@/components/layout/header/header"
import { Button } from "@/components/shadcn/button"
import { ApiError } from "@/lib/api/api.error"

interface AttemptResultErrorProps {
	error: unknown
	onRetry: () => void
}

export function AttemptResultError({
	error,
	onRetry,
}: AttemptResultErrorProps) {
	return (
		<div className="min-h-svh bg-neutral-50">
			<MainHeader />
			<main className="mx-auto max-w-lg px-4 py-16 text-center">
				<h1 className="text-2xl font-semibold">Result unavailable</h1>
				<p className="mt-2 text-sm text-neutral-600">
					{error instanceof ApiError && error.status === 404
						? "This attempt does not exist or is inaccessible."
						: "We couldn't load the result. Try again."}
				</p>
				<Button className="mt-5" onClick={onRetry}>
					Retry
				</Button>
			</main>
		</div>
	)
}

export function AttemptResultLoading() {
	return (
		<div className="min-h-svh bg-neutral-50">
			<MainHeader />
			<div className="mx-auto max-w-5xl animate-pulse space-y-5 px-4 py-10">
				<div className="h-64 rounded-2xl bg-neutral-200" />
				<div className="h-20 rounded-2xl bg-white" />
			</div>
		</div>
	)
}
