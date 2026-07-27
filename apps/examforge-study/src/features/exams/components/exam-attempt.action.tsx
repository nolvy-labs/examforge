"use client"

import Link from "next/link"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowRight, LoaderCircle, RotateCcw, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import type { AttemptActionController } from "../model/exam-attempt-action.model"
import { formatNumber, getExamCounts } from "../model/exam-detail.model"

export function ExamAttemptAction({
	controller,
}: {
	controller: AttemptActionController
}) {
	const content = renderAction(controller)

	return (
		<>
			{content}
			<StartAttemptDialog controller={controller} />
		</>
	)
}

function renderAction(controller: AttemptActionController) {
	switch (controller.state.kind) {
		case "initializing":
			return <ActionSkeleton />
		case "sign-in":
			return <PrimaryLink href={controller.state.href} label="Sign in to start" />
		case "continue":
			return <PrimaryLink href={controller.state.href} label="Continue Exam" />
		case "start":
			return (
				<Button
					type="button"
					size="lg"
					className="w-full bg-indigo-600 hover:bg-indigo-700"
					onClick={() => controller.openDialog("start")}
				>
					Start Exam
				</Button>
			)
		case "result":
			return (
				<div className="space-y-2">
					<Link
						href={controller.state.href}
						className={cn(
							buttonVariants({ size: "lg" }),
							"w-full bg-indigo-600 text-white hover:bg-indigo-700"
						)}
					>
						View Result
					</Link>
					<RetakeButton onClick={() => controller.openDialog("retake")} />
				</div>
			)
		case "retake":
			return <RetakeButton onClick={() => controller.openDialog("retake")} />
		case "unavailable":
			return (
				<div className="space-y-3">
					<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
						This exam is not currently available for a new attempt.
					</p>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={controller.state.retry}
					>
						Check availability again
					</Button>
				</div>
			)
		case "error":
			return (
				<ActionError
					message={controller.state.message}
					onRetry={controller.state.retry}
				/>
			)
		default:
			return assertNever(controller.state)
	}
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
	return (
		<Link
			href={href}
			className={cn(
				buttonVariants({ size: "lg" }),
				"w-full bg-indigo-600 text-white hover:bg-indigo-700"
			)}
		>
			{label}
			<ArrowRight aria-hidden="true" />
		</Link>
	)
}

function RetakeButton({ onClick }: { onClick: () => void }) {
	return (
		<Button
			type="button"
			variant="outline"
			size="lg"
			className="w-full"
			onClick={onClick}
		>
			<RotateCcw aria-hidden="true" />
			Retake
		</Button>
	)
}

function ActionSkeleton() {
	return (
		<div aria-hidden="true" className="space-y-2">
			<div className="h-10 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none" />
			<div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
		</div>
	)
}

function ActionError({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="space-y-3">
			<p className="text-sm leading-6 text-slate-600">{message}</p>
			<Button type="button" variant="outline" className="w-full" onClick={onRetry}>
				Retry attempt status
			</Button>
		</div>
	)
}

function StartAttemptDialog({
	controller,
}: {
	controller: AttemptActionController
}) {
	const dialog = controller.dialog
	const counts = getExamCounts(controller.detail)
	return (
		<Dialog.Root
			open={dialog !== null}
			onOpenChange={(open) => {
				if (!open) controller.closeDialog()
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/45" />
				<Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Dialog.Title className="text-xl font-semibold text-slate-950">
								{dialog?.mode === "retake" ? "Retake exam?" : "Start exam?"}
							</Dialog.Title>
							<Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
								A new attempt will be created for {controller.detail.exam.title}.
							</Dialog.Description>
						</div>
						<Dialog.Close
							aria-label="Close confirmation"
							disabled={dialog?.isPending}
							className={buttonVariants({ variant: "ghost", size: "icon" })}
						>
							<X aria-hidden="true" />
						</Dialog.Close>
					</div>

					<dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
						<Fact label="Questions" value={String(counts.questionCount)} />
						<Fact label="Sections" value={String(counts.sectionCount)} />
						<Fact
							label="Duration"
							value={
								controller.detail.publishedVersion.durationMinutes == null
									? "No time limit"
									: `${controller.detail.publishedVersion.durationMinutes} min`
							}
						/>
						<Fact
							label="Total points"
							value={formatNumber(controller.detail.publishedVersion.totalScore)}
						/>
					</dl>

					{controller.detail.publishedVersion.durationMinutes != null && (
						<p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
							The timed attempt begins immediately after it is created.
						</p>
					)}
					{dialog?.error && (
						<Alert variant="destructive" className="mt-4">
							<AlertDescription>{dialog.error}</AlertDescription>
						</Alert>
					)}

					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.Close
							disabled={dialog?.isPending}
							className={buttonVariants({ variant: "outline" })}
						>
							Cancel
						</Dialog.Close>
						<Button
							type="button"
							disabled={dialog?.isPending}
							onClick={controller.confirmDialog}
							className="bg-indigo-600 hover:bg-indigo-700"
						>
							{dialog?.isPending && (
								<LoaderCircle
									className="animate-spin motion-reduce:animate-none"
									aria-hidden="true"
								/>
							)}
							{dialog?.isPending
								? "Creating attempt…"
								: dialog?.mode === "retake"
									? "Create retake"
									: "Start now"}
						</Button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-xs text-slate-500">{label}</dt>
			<dd className="mt-1 font-medium text-slate-900">{value}</dd>
		</div>
	)
}

function assertNever(value: never): never {
	throw new Error(`Unexpected attempt action state: ${JSON.stringify(value)}`)
}
