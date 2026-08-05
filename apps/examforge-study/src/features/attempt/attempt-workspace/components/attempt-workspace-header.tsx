import { Clock3 } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import { SaveStatus } from "./attempt-question"
import { useAttemptRemainingTime } from "./attempt-timer-provider"
import { formatRemaining } from "../hooks/attempt-timer.hook"
import type { ExamAttemptMode } from "../../types/attempt.type"
import { LocaleMessage } from "@/components/locale/locale-message"

interface AttemptWorkspaceHeaderProps {
	title: string
	mode: ExamAttemptMode
	locked: boolean
	onSubmit: () => void
}

function AttemptCountdown({ mode }: { mode: ExamAttemptMode }) {
	const remaining = useAttemptRemainingTime()

	if (remaining == null) return null

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold",
				mode === "exam"
					? remaining <= 60
						? "bg-red-50 text-red-700"
						: remaining <= 300
							? "bg-amber-50 text-amber-800"
							: "bg-neutral-100 text-neutral-800"
					: "bg-neutral-100 text-neutral-800"
			)}
		>
			<Clock3 className="size-4" />
			{formatRemaining(remaining)}
		</div>
	)
}

export function AttemptWorkspaceHeader({
	title,
	mode,
	locked,
	onSubmit,
}: AttemptWorkspaceHeaderProps) {
	return (
		<header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
			<div className="mx-auto flex min-h-16 max-w-384 items-center gap-3 px-4 sm:px-6">
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-semibold text-neutral-950 sm:text-base">
						{title}
					</h1>
					<SaveStatus />
				</div>

				<AttemptCountdown mode={mode} />

				<Button type="button" disabled={locked} onClick={onSubmit}>
					<LocaleMessage messageId="attempt.submit" />
				</Button>
			</div>
		</header>
	)
}
