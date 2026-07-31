import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"

interface Props {
	onRetry: () => void
}

export function ExamManagementError({ onRetry }: Props) {
	return (
		<Alert variant="destructive">
			<WarningCircleIcon />
			<AlertTitle>Exams could not be loaded</AlertTitle>
			<AlertDescription>
				<p>Your filters are preserved. Check the connection and retry.</p>
				<Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
					<ArrowClockwiseIcon />
					Retry exam list
				</Button>
			</AlertDescription>
		</Alert>
	)
}
