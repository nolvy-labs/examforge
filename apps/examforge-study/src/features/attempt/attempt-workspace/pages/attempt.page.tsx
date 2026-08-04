"use client"

import { ArrowUp } from "lucide-react"

import { Button } from "@/components/shadcn/button"

import {
	AttemptFailure,
	AttemptLoading,
} from "../components/attempt-workspace-feedback"
import { AttemptWorkspaceContent } from "../components/attempt-workspace-content"
import { AttemptWorkspaceHeader } from "../components/attempt-workspace-header"
import { AttemptWorkspaceSidebar } from "../components/attempt-workspace-sidebar"
import { AttemptTimerProvider } from "../components/attempt-timer-provider"
import { EndAttemptDialog } from "../components/end-attempt-dialog"
import { useAttemptWorkspace } from "../hooks/use-attempt-workspace"

interface AttemptPageProps {
	attemptId: string
}

export function AttemptPage({ attemptId }: AttemptPageProps) {
	const workspace = useAttemptWorkspace(attemptId)

	if (workspace.query.isLoading) {
		return <AttemptLoading />
	}

	if (workspace.query.isError || !workspace.detail) {
		return (
			<AttemptFailure
				error={workspace.query.error}
				onRetry={workspace.query.retry}
			/>
		)
	}

	return (
		<AttemptTimerProvider
			timerKey={workspace.timer.key}
			mode={workspace.detail.mode}
			practiceActive={workspace.active && !workspace.locked}
			initialRemainingTimeSeconds={
				workspace.timer.initialRemainingTimeSeconds
			}
			onExpired={workspace.timer.onExpired}
		>
			<div className="min-h-svh bg-slate-50">
				<AttemptWorkspaceHeader
					title={workspace.detail.exam.title}
					mode={workspace.detail.mode}
					locked={workspace.locked}
					onSubmit={() =>
						workspace.endDialog.open("submit")
					}
				/>

				<div className="mx-auto grid max-w-384 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
					<AttemptWorkspaceSidebar
						sections={workspace.detail.sections}
						onSelect={workspace.navigate}
						onAbandon={() =>
							workspace.endDialog.open("abandon")
						}
					/>

					<AttemptWorkspaceContent
						sections={workspace.detail.sections}
						selectedSection={
							workspace.selectedSection
						}
						selectedBlock={workspace.selectedBlock}
						displayMode={workspace.displayMode}
						locked={workspace.locked}
						onRetrySynchronization={workspace.synchronization.retry}
						answered={workspace.answered}
						total={workspace.total}
						hasPrevious={workspace.hasPrevious}
						hasNext={workspace.hasNext}
						onSelect={workspace.navigate}
						onDisplayModeChange={
							workspace.setDisplayMode
						}
						onPrevious={workspace.showPrevious}
						onNext={workspace.showNext}
					/>
				</div>

				<EndAttemptDialog
					mode={workspace.endDialog.mode}
					attemptMode={workspace.detail.mode}
					answered={workspace.answered}
					total={workspace.total}
					expired={workspace.endDialog.expired}
					error={workspace.endDialog.error}
					pending={workspace.endDialog.isPending}
					onClose={workspace.endDialog.close}
					onConfirm={workspace.endDialog.confirm}
				/>

				<Button
					type="button"
					variant="outline"
					size="icon-lg"
					className="fixed right-4 bottom-4 z-20 rounded-full bg-white shadow-md sm:right-6 sm:bottom-6"
					aria-label="Scroll to top"
					title="Scroll to top"
					onClick={() =>
						window.scrollTo({
							top: 0,
							behavior: window.matchMedia(
								"(prefers-reduced-motion: reduce)"
							).matches
								? "auto"
								: "smooth",
						})
					}
				>
					<ArrowUp />
				</Button>
			</div>
		</AttemptTimerProvider>
	)
}
