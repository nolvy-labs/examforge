import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"

interface Props {
	hasDiscoveryFilters: boolean
	onClear: () => void
}

export function ExamResultsEmpty({
	hasDiscoveryFilters,
	onClear,
}: Props) {
	return (
		<Card>
			<CardContent className="px-6 py-16 text-center">
				<h3 className="text-lg font-semibold">
					{hasDiscoveryFilters
						? "No exams match these filters"
						: "No exams are available yet"}
				</h3>
				<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
					{hasDiscoveryFilters
						? "Try a different title or remove some filters."
						: "Published exams will appear here when they become available."}
				</p>
				{hasDiscoveryFilters && (
					<Button type="button" className="mt-5" onClick={onClear}>
						Clear filters
					</Button>
				)}
			</CardContent>
		</Card>
	)
}
