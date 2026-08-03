"use client"

import { AttemptFailure, AttemptLoading } from "../components/attempt-workspace-feedback"
import { AttemptWorkspaceContent } from "../components/attempt-workspace-content"
import { AttemptWorkspaceHeader } from "../components/attempt-workspace-header"
import { AttemptWorkspaceSidebar } from "../components/attempt-workspace-sidebar"
import { EndAttemptDialog } from "../components/end-attempt-dialog"
import { useAttemptWorkspace } from "../hooks/use-attempt-workspace"

interface AttemptPageProps {
	attemptId: string
}

export function AttemptPage({ attemptId }: AttemptPageProps) {
	const workspace = useAttemptWorkspace(attemptId)

	if (workspace.query.isLoading) return <AttemptLoading />
	if (workspace.query.isError || !workspace.detail) {
		return (
			<AttemptFailure
				error={workspace.query.error}
				onRetry={workspace.query.retry}
			/>
		)
	}

	return (
		<div className="min-h-svh bg-slate-50">
			<AttemptWorkspaceHeader
				title={workspace.detail.exam.title}
				remaining={workspace.remaining}
				locked={workspace.locked}
				onSubmit={() => workspace.endDialog.open("submit")}
			/>
			<div className="mx-auto grid max-w-384 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
				<AttemptWorkspaceSidebar
					sections={workspace.detail.sections}
					onSelect={workspace.navigate}
					onAbandon={() => workspace.endDialog.open("abandon")}
				/>
				<AttemptWorkspaceContent
					sections={workspace.detail.sections}
					selectedSection={workspace.selectedSection}
					selectedBlock={workspace.selectedBlock}
					displayMode={workspace.displayMode}
					locked={workspace.locked}
					answered={workspace.answered}
					total={workspace.total}
					hasPrevious={workspace.hasPrevious}
					hasNext={workspace.hasNext}
					onSelect={workspace.navigate}
					onDisplayModeChange={workspace.setDisplayMode}
					onPrevious={workspace.showPrevious}
					onNext={workspace.showNext}
				/>
			</div>
			<EndAttemptDialog
				mode={workspace.endDialog.mode}
				answered={workspace.answered}
				total={workspace.total}
				remaining={workspace.remaining}
				error={workspace.endDialog.error}
				pending={workspace.endDialog.isPending}
				onClose={workspace.endDialog.close}
				onConfirm={workspace.endDialog.confirm}
			/>
		</div>
	)
}
