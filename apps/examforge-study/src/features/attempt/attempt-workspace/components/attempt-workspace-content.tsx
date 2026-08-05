import { ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { LocaleMessage } from "@/components/locale/locale-message"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"

import {
	AttemptNavigator,
	AttemptQuestionBlock,
	SaveError,
} from "./attempt-question"
import type { DisplayMode } from "../stores/attempt.store"
import type { AttemptQuestion, AttemptSection } from "../../types/attempt.type"
import { ButtonGroup } from "@/components/shadcn/button-group"

interface AttemptWorkspaceContentProps {
	sections: AttemptSection[]
	selectedSection?: AttemptSection
	selectedBlock?: AttemptQuestion
	displayMode: DisplayMode
	locked: boolean
	answered: number
	total: number
	hasPrevious: boolean
	hasNext: boolean
	onSelect: (sectionId: string, blockId: string) => void
	onDisplayModeChange: (mode: DisplayMode) => void
	onPrevious: () => void
	onNext: () => void
	onRetrySynchronization: () => void
}

export function AttemptWorkspaceContent({
	sections,
	selectedSection,
	selectedBlock,
	displayMode,
	locked,
	answered,
	total,
	hasPrevious,
	hasNext,
	onSelect,
	onDisplayModeChange,
	onPrevious,
	onNext,
	onRetrySynchronization,
}: AttemptWorkspaceContentProps) {
	return (
		<main className="min-w-0">
			<details className="mb-4 rounded-xl border bg-white p-3 lg:hidden">
				<summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
					<Menu className="size-4" /> <LocaleMessage messageId="attempt.sectionsAndQuestions" />
				</summary>
				<div className="mt-4">
					<AttemptNavigator sections={sections} onSelect={onSelect} />
				</div>
			</details>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-semibold text-neutral-950">
						{selectedSection?.title}
					</h2>
					{selectedSection?.instructions && (
						<p className="mt-1 text-sm text-neutral-600">
							{selectedSection.instructions}
						</p>
					)}
				</div>
				<DisplayModeToggle
					value={displayMode}
					onChange={onDisplayModeChange}
				/>
			</div>
			<SaveError onRetry={onRetrySynchronization} />
			{locked && (
				<Alert className="mb-4">
					<AlertDescription><LocaleMessage messageId="attempt.answersLocked" /></AlertDescription>
				</Alert>
			)}
			<div className="space-y-5">
				{displayMode === "section"
					? selectedSection?.questions.map((question, index) => (
							<AttemptQuestionBlock
								key={question.id}
								question={question}
								number={String(index + 1)}
							/>
						))
					: selectedBlock && (
							<AttemptQuestionBlock
								question={selectedBlock}
								number={String(
									(selectedSection?.questions.indexOf(selectedBlock) ?? 0) + 1
								)}
							/>
						)}
			</div>
			{displayMode === "one" && <AttemptWorkspaceNavigation
				answered={answered}
				total={total}
				hasPrevious={hasPrevious}
				hasNext={hasNext}
				onPrevious={onPrevious}
				onNext={onNext}
			/>}
		</main>
	)
}

interface DisplayModeToggleProps {
	value: DisplayMode
	onChange: (mode: DisplayMode) => void
}

export function DisplayModeToggle({ value, onChange }: DisplayModeToggleProps) {
	return (
		<ButtonGroup>
			<Button
				size={"sm"}
				variant={value === "one" ? "default" : "outline"}
				onClick={() => onChange("one")}
			>
				<LocaleMessage messageId="attempt.oneQuestion" />
			</Button>
			<Button
				size={"sm"}
				variant={value === "section" ? "default" : "outline"}
				onClick={() => onChange("section")}
			>
				<LocaleMessage messageId="attempt.wholeSection" />
			</Button>
		</ButtonGroup>
	)
}

interface AttemptWorkspaceNavigationProps {
	answered: number
	total: number
	hasPrevious: boolean
	hasNext: boolean
	onPrevious: () => void
	onNext: () => void
}

function AttemptWorkspaceNavigation({
	answered,
	total,
	hasPrevious,
	hasNext,
	onPrevious,
	onNext,
}: AttemptWorkspaceNavigationProps) {
	return (
		<div className="z-10 mt-5 flex items-center justify-between gap-3 bg-neutral-50/95 py-3 backdrop-blur">
			<Button
				type="button"
				variant="outline"
				disabled={!hasPrevious}
				onClick={onPrevious}
			>
				<ChevronLeft /> <LocaleMessage messageId="attempt.previous" />
			</Button>
			<span className="text-xs text-neutral-500">
				{answered} of {total} answered
			</span>
			<Button
				type="button"
				variant="outline"
				disabled={!hasNext}
				onClick={onNext}
			>
				<LocaleMessage messageId="attempt.next" /> <ChevronRight />
			</Button>
		</div>
	)
}
