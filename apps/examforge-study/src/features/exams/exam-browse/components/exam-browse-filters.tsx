import type { ExamBrowseFiltersViewModel } from "../hooks/use-exam-browse-query"
import { Card, CardContent } from "@/components/shadcn/card"
import { ExamFilterPanel } from "./exam-filter-panel"

interface Prosp {
	filters: ExamBrowseFiltersViewModel
}

export function ExamBrowseFilters({ filters }: Prosp) {
	return (
		<aside className="hidden lg:block">
			<Card className="sticky top-6" size="sm">
				<CardContent>
					<ExamFilterPanel
						data={filters.data}
						category={filters.category}
						tagIds={filters.tagIds}
						onCategoryChange={filters.onCategoryChange}
						onTagChange={filters.onTagChange}
						onClear={filters.onClearFilters}
					/>
				</CardContent>
			</Card>
		</aside>
	)
}
