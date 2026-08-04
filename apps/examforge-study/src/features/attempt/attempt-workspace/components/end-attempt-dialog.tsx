import { Dialog } from "@base-ui/react/dialog"
import { LoaderCircle, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"

import { useAttemptRemainingTime } from "./attempt-timer-provider"
import { formatRemaining } from "../hooks/attempt-timer.hook"
import type { EndAttemptMode } from "../model/attempt-workspace"

interface EndAttemptDialogProps {
	mode: EndAttemptMode | null
	answered: number
	total: number
	expired: boolean
	error: string
	pending: boolean
	onClose: () => void
	onConfirm: () => void
}

function AttemptTimeLeft() {
	const remaining = useAttemptRemainingTime()

	if (remaining == null) return null

	return (
		<div>
			<dt className="text-slate-500">Time left</dt>
			<dd className="font-semibold">
				{formatRemaining(remaining)}
			</dd>
		</div>
	)
}

export function EndAttemptDialog({
	mode,
	answered,
	total,
	expired,
	error,
	pending,
	onClose,
	onConfirm,
}: EndAttemptDialogProps) {
	return (
		<Dialog.Root
			open={mode !== null}
			onOpenChange={(open) => {
				if (!open && !pending && !expired) {
					onClose()
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/50" />

				<Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Dialog.Title className="text-xl font-semibold">
								{expired
									? "Time expired"
									: mode === "submit"
										? "Submit attempt?"
										: "Abandon attempt?"}
							</Dialog.Title>

							<Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
								{expired
									? "The attempt is locked. We will save pending answers before submitting it."
									: mode === "submit"
										? "Submission is final. We will save pending answers first."
										: "Abandonment ends this attempt and cannot be undone."}
							</Dialog.Description>
						</div>

						{!expired && (
							<Dialog.Close
								className={buttonVariants({
									variant: "ghost",
									size: "icon",
								})}
							>
								<X />
							</Dialog.Close>
						)}
					</div>

					<dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
						<div>
							<dt className="text-slate-500">Answered</dt>
							<dd className="font-semibold">{answered}</dd>
						</div>

						<div>
							<dt className="text-slate-500">Unanswered</dt>
							<dd className="font-semibold">
								{total - answered}
							</dd>
						</div>

						<AttemptTimeLeft />
					</dl>

					{error && (
						<Alert variant="destructive" className="mt-4">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="mt-6 flex justify-end gap-2">
						{!expired && (
							<Dialog.Close
								disabled={pending}
								className={buttonVariants({
									variant: "outline",
								})}
							>
								Cancel
							</Dialog.Close>
						)}

						<Button
							type="button"
							disabled={pending}
							variant={
								mode === "abandon"
									? "destructive"
									: "default"
							}
							onClick={onConfirm}
						>
							{pending && (
								<LoaderCircle className="animate-spin" />
							)}

							{pending
								? "Finishing…"
								: expired
									? "Retry submission"
									: mode === "submit"
										? "Submit now"
										: "Abandon"}
						</Button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}