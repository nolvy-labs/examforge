import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"

interface Props {
	onRetry: () => void
}

export function ExamResultsError({ onRetry }: Props) {
	return (
		<Alert>
			<AlertTitle>We couldn&apos;t load the exams</AlertTitle>
			<AlertDescription>
				<p>
					The exam service is unavailable right now. Your filters have been
					preserved.
				</p>
				<Button type="button" className="mt-4" onClick={onRetry}>
					Try again
				</Button>
			</AlertDescription>
		</Alert>
	)
}
