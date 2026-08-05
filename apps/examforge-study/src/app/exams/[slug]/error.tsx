"use client"

import { MainHeader } from "@/components/layout/header/header"
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import Link from "next/link"
import { LocaleMessage } from "@/components/locale/locale-message"

export default function ErrorPage({ reset }: { reset: () => void }) {
	return <ExamDetailError onRetry={reset} />
}

interface Props {
	onRetry: () => void
}

function ExamDetailError({ onRetry }: Props) {
	return (
		<div className="flex min-h-svh flex-col bg-muted/30">
			<MainHeader />
			<main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
				<Alert>
					<AlertTitle><LocaleMessage messageId="exams.unavailableTitle" /></AlertTitle>
					<AlertDescription>
						<p><LocaleMessage messageId="exams.unavailableDescription" /></p>
						<div className="mt-4 flex flex-wrap gap-2">
							<Button type="button" onClick={onRetry}>
								<LocaleMessage messageId="common.retry" />
							</Button>
							<Link
								href="/exams"
								className={buttonVariants({ variant: "outline" })}
							>
								<LocaleMessage messageId="exams.backToBrowse" />
							</Link>
						</div>
					</AlertDescription>
				</Alert>
			</main>
		</div>
	)
}