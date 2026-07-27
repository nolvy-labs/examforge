"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
	ArrowRight,
	BarChart3,
	BookOpen,
	CheckCircle2,
	ClipboardCheck,
	LineChart,
	MessageSquareText,
	Target,
} from "lucide-react"

import { MainHeader } from "@/components/layout/header/header"
import { buttonVariants } from "@/components/shadcn/button"
import {
	AUTH_ROUTES,
	STUDENT_LANDING_ROUTE,
} from "@/features/auth/auth.constants"
import { AuthLoading } from "@/features/auth/components/auth.loading"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { cn } from "@/lib/utils"

const benefits = [
	{
		title: "Realistic practice",
		description: "Build confidence with focused exam-style questions across subjects.",
		icon: ClipboardCheck,
	},
	{
		title: "Clear review and feedback",
		description: "See what needs attention and turn every practice session into a useful next step.",
		icon: MessageSquareText,
	},
	{
		title: "Understandable progress tracking",
		description: "Follow your practice over time with calm, straightforward summaries.",
		icon: LineChart,
	},
]

const steps = [
	["01", "Choose an exam", "Pick the subject and practice set that fits your goal."],
	["02", "Complete your practice", "Work through realistic questions at your own pace."],
	["03", "Review and improve", "Use clear feedback to decide what to practise next."],
]

function DashboardPreview() {
	return (
		<div
			aria-hidden="true"
			className="relative mx-auto w-full max-w-xl rounded-3xl border border-indigo-100 bg-white p-4 shadow-2xl shadow-indigo-950/10 sm:p-6"
		>
			<div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
				<div>
					<div className="h-2.5 w-20 rounded-full bg-slate-200" />
					<div className="mt-2 h-4 w-36 rounded-full bg-slate-800" />
				</div>
				<div className="size-9 rounded-full bg-indigo-100" />
			</div>
			<div className="grid grid-cols-3 gap-2 sm:gap-3">
				{[
					["Sessions", "—"],
					["Average", "—"],
					["Practice", "—"],
				].map(([label, value]) => (
					<div key={label} className="rounded-xl bg-slate-50 p-3 sm:p-4">
						<p className="text-[10px] text-slate-500 sm:text-xs">{label}</p>
						<p className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">{value}</p>
					</div>
				))}
			</div>
			<div className="mt-4 rounded-2xl border border-slate-100 p-4">
				<div className="flex items-center gap-3">
					<div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
						<BookOpen className="size-5" />
					</div>
					<div className="flex-1">
						<div className="h-3 w-2/3 rounded-full bg-slate-800" />
						<div className="mt-2 h-2 w-1/2 rounded-full bg-slate-200" />
					</div>
				</div>
				<div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
					<div className="h-full w-2/5 rounded-full bg-indigo-500" />
				</div>
			</div>
			<div className="pointer-events-none absolute -right-3 -top-3 grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg sm:-right-5 sm:-top-5">
				<BarChart3 className="size-6" />
			</div>
		</div>
	)
}

export function HomePage() {
	const router = useRouter()
	const isInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

	useEffect(() => {
		if (isInitialized && isAuthenticated) {
			router.replace(STUDENT_LANDING_ROUTE)
		}
	}, [isAuthenticated, isInitialized, router])

	if (!isInitialized || isAuthenticated) {
		return <AuthLoading variant="home" />
	}

	return (
		<div className="min-h-svh overflow-x-hidden bg-slate-50 text-slate-950">
			<MainHeader />
			<main>
				<section className="relative isolate overflow-hidden">
					<div className="absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-indigo-50 to-transparent" />
					<div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-28">
						<div className="max-w-2xl">
							<p className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700">
								<Target className="size-4" aria-hidden="true" />
								Focused practice for meaningful progress
							</p>
							<h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
								Practice with purpose. Improve with every exam.
							</h1>
							<p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600">
								Prepare across subjects with realistic practice exams, clear feedback, and progress you can understand.
							</p>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<Link
									href={AUTH_ROUTES.signup}
									className={cn(
										buttonVariants({ size: "lg" }),
										"h-12 bg-indigo-600 px-6 text-white hover:bg-indigo-700"
									)}
								>
									Start practising
									<ArrowRight aria-hidden="true" />
								</Link>
								<Link
									href={AUTH_ROUTES.signin}
									className={cn(
										buttonVariants({ variant: "outline", size: "lg" }),
										"h-12 border-slate-300 bg-white px-6"
									)}
								>
									Sign in
								</Link>
							</div>
						</div>
						<DashboardPreview />
					</div>
				</section>

				<section aria-labelledby="benefits-title" className="border-y border-slate-200 bg-white py-16 sm:py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="max-w-2xl">
							<p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Built for better practice</p>
							<h2 id="benefits-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
								Everything you need to study with direction
							</h2>
						</div>
						<div className="mt-10 grid gap-5 md:grid-cols-3">
							{benefits.map(({ title, description, icon: Icon }) => (
								<article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
									<div className="grid size-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
										<Icon className="size-5" aria-hidden="true" />
									</div>
									<h3 className="mt-5 text-lg font-semibold">{title}</h3>
									<p className="mt-2 leading-6 text-slate-600">{description}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section aria-labelledby="steps-title" className="py-16 sm:py-24">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="text-center">
							<p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">How it works</p>
							<h2 id="steps-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
								A clear path from practice to progress
							</h2>
						</div>
						<ol className="mt-12 grid gap-5 md:grid-cols-3">
							{steps.map(([number, title, description]) => (
								<li key={number} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
									<span className="text-sm font-semibold text-indigo-600">{number}</span>
									<h3 className="mt-4 text-xl font-semibold">{title}</h3>
									<p className="mt-2 leading-6 text-slate-600">{description}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
					<div className="mx-auto max-w-7xl rounded-3xl bg-slate-950 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
						<CheckCircle2 className="mx-auto size-8 text-indigo-300" aria-hidden="true" />
						<h2 className="mt-5 text-3xl font-semibold tracking-tight">Make your next practice session count.</h2>
						<p className="mx-auto mt-3 max-w-xl text-slate-300">Create your account and start building a more focused study routine.</p>
						<Link
							href={AUTH_ROUTES.signup}
							className={cn(
								buttonVariants({ size: "lg" }),
								"mt-7 h-12 bg-white px-6 text-slate-950 hover:bg-slate-100"
							)}
						>
							Create account
						</Link>
					</div>
				</section>
			</main>
			<footer className="border-t border-slate-200 bg-white">
				<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:px-6 lg:px-8">
					<p>© {new Date().getFullYear()} ExamForge</p>
					<nav aria-label="Footer" className="flex items-center gap-5">
						<Link className="rounded-sm hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" href={AUTH_ROUTES.signin}>Sign in</Link>
						<Link className="rounded-sm hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" href={AUTH_ROUTES.signup}>Create account</Link>
					</nav>
				</div>
			</footer>
		</div>
	)
}
