import { Clock3 } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import { SaveStatus } from "./attempt-question"
import { formatRemaining } from "../hooks/attempt-timer.hook"

interface AttemptWorkspaceHeaderProps {
	title: string
	remaining: number | null
	locked: boolean
	onSubmit: () => void
}

export function AttemptWorkspaceHeader({
	title,
	remaining,
	locked,
	onSubmit,
}: AttemptWorkspaceHeaderProps) {
	return (
		<header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
			<div className="mx-auto flex min-h-16 max-w-384 items-center gap-3 px-4 sm:px-6">
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-semibold text-slate-950 sm:text-base">
						{title}
					</h1>
					<SaveStatus />
				</div>
				{remaining != null && (
					<div
						className={cn(
							"flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold",
							remaining <= 60
								? "bg-red-50 text-red-700"
								: remaining <= 300
									? "bg-amber-50 text-amber-800"
									: "bg-slate-100 text-slate-800"
						)}
					>
						<Clock3 className="size-4" />
						{formatRemaining(remaining)}
					</div>
				)}
				<Button type="button" disabled={locked} onClick={onSubmit}>
					Submit
				</Button>
			</div>
		</header>
	)
}
