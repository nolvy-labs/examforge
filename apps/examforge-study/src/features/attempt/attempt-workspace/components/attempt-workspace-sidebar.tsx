import { Button } from "@/components/shadcn/button"

import { AttemptNavigator } from "./attempt-question"
import type { AttemptSection } from "../../types/attempt.type"

interface AttemptWorkspaceSidebarProps {
	sections: AttemptSection[]
	onSelect: (sectionId: string, blockId: string) => void
	onAbandon: () => void
}

export function AttemptWorkspaceSidebar({
	sections,
	onSelect,
	onAbandon,
}: AttemptWorkspaceSidebarProps) {
	return (
		<aside className="hidden lg:block">
			<div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4">
				<AttemptNavigator sections={sections} onSelect={onSelect} />
				<Button
					type="button"
					variant="ghost"
					className="mt-5 w-full text-red-700 hover:bg-red-50 hover:text-red-800"
					onClick={onAbandon}
				>
					Abandon attempt
				</Button>
			</div>
		</aside>
	)
}
