"use client"

import Link from "next/link"

import { MainHeader } from "@/components/layout/header/header"
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"

interface Props {
	onRetry: () => void
}

export function ExamDetailError({ onRetry }: Props) {
	return (
		<div className="flex min-h-svh flex-col bg-muted/30">
			<MainHeader />
			<main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
				<Alert>
					<AlertTitle>We couldn&apos;t load this exam</AlertTitle>
					<AlertDescription>
						<p>The exam service is unavailable right now.</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<Button type="button" onClick={onRetry}>
								Try again
							</Button>
							<Link
								href="/exams"
								className={buttonVariants({ variant: "outline" })}
							>
								Back to exams
							</Link>
						</div>
					</AlertDescription>
				</Alert>
			</main>
		</div>
	)
}
