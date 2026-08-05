import Link from "next/link"

import { Button, buttonVariants } from "@/components/shadcn/button"
import { ApiError } from "@/lib/api/api.error"
import { LocaleMessage } from "@/components/locale/locale-message"

interface AttemptFailureProps {
	error: unknown
	onRetry: () => void
}

export function AttemptFailure({ error, onRetry }: AttemptFailureProps) {
	const missing = error instanceof ApiError && error.status === 404

	return (
		<main className="grid min-h-svh place-items-center bg-neutral-50 p-4">
			<div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
				<h1 className="text-xl font-semibold">
					<LocaleMessage messageId={missing ? "attempt.notFoundTitle" : "attempt.loadErrorTitle"} />
				</h1>
				<p className="mt-2 text-sm text-neutral-600">
					<LocaleMessage messageId={missing ? "attempt.notFoundDescription" : "attempt.loadErrorDescription"} />
				</p>
				<div className="mt-5 flex justify-center gap-2">
					{!missing && <Button onClick={onRetry}><LocaleMessage messageId="common.retry" /></Button>}
					<Link
						href="/exams"
						className={buttonVariants({ variant: "outline" })}
					>
						<LocaleMessage messageId="dashboard.browseExams" />
					</Link>
				</div>
			</div>
		</main>
	)
}

export function AttemptLoading() {
	return (
		<div className="min-h-svh bg-neutral-50 p-4">
			<div className="mx-auto max-w-5xl animate-pulse space-y-5">
				<div className="h-16 rounded-xl bg-neutral-200" />
				<div className="h-80 rounded-2xl bg-white" />
			</div>
			<p className="sr-only"><LocaleMessage messageId="accessibility.loadingAttempt" /></p>
		</div>
	)
}
