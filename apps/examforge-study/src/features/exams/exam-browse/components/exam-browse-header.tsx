import { ExamBrowseSearch } from "./exam-browse-search"

interface Props {
	search: {
		value: string
		setValue: (value: string) => void
		submit: () => void
	}
}

export function ExamBrowseHeader({ search }: Props) {
	return (
		<section className="border-b bg-background">
			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
				<div className="max-w-3xl">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Browse Exams
					</h1>
					<p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
						Find a published exam by title, category, or learning topic.
					</p>
				</div>
				<ExamBrowseSearch
					value={search.value}
					onChange={search.setValue}
					onSubmit={search.submit}
				/>
			</div>
		</section>
	)
}
