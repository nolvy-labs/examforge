import { Brand } from "@/components/layout/brand"

export function AuthLoading({ variant = "auth" }: { variant?: "auth" | "home" | "dashboard" }) {
	if (variant === "dashboard") {
		return (
			<div className="min-h-svh bg-slate-50">
				<header className="border-b bg-white">
					<div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
						<Brand />
					</div>
				</header>
				<main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
					<p className="sr-only">Loading your dashboard</p>
					<div className="h-24 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />
					<div className="grid gap-4 sm:grid-cols-3">
						{[0, 1, 2].map((item) => (
							<div key={item} className="h-28 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
						))}
					</div>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-svh bg-slate-50">
			<header className="border-b bg-white">
				<div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
					<Brand />
				</div>
			</header>
			<main className="mx-auto flex max-w-7xl items-center px-4 py-16 sm:min-h-[calc(100svh-4rem)] sm:px-6 lg:px-8">
				<p className="sr-only">Loading ExamForge</p>
				<div className={`w-full animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none ${variant === "home" ? "h-80" : "mx-auto h-96 max-w-md"}`} />
			</main>
		</div>
	)
}
