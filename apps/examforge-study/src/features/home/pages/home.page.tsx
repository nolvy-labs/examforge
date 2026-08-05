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
	FileCheck2,
	LineChart,
	ListChecks,
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
import { useAuthSession } from "@/features/auth/stores/auth.store"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/shadcn/card"
import { PublicFooter } from "@/components/layout/public-footer"
import { LocaleMessage } from "@/components/locale/locale-message"

const benefits = [
	{
		title: "home.benefitPracticeTitle" as const,
		description: "home.benefitPracticeDescription" as const,
		icon: ClipboardCheck,
	},
	{
		title: "home.benefitFeedbackTitle" as const,
		description: "home.benefitFeedbackDescription" as const,
		icon: MessageSquareText,
	},
	{
		title: "home.benefitProgressTitle" as const,
		description: "home.benefitProgressDescription" as const,
		icon: LineChart,
	},
]

const steps = [
	["01", "home.stepChooseTitle", "home.stepChooseDescription"],
	["02", "home.stepCompleteTitle", "home.stepCompleteDescription"],
	["03", "home.stepReviewTitle", "home.stepReviewDescription"],
] as const

function DashboardPreview() {
	const metrics = [
		{ label: "home.previewCompleted" as const, value: "12", icon: FileCheck2 },
		{ label: "home.previewAverage" as const, value: "84%", icon: BarChart3 },
		{ label: "home.previewQuestions" as const, value: "240", icon: ListChecks },
	]

	return (
		<div className="relative mx-auto w-full max-w-xl rounded-3xl border border-primary/15 bg-white p-4 shadow-2xl shadow-primary/10 sm:p-6">
			<div className="mb-5">
				<p className="text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl"><LocaleMessage messageId="home.previewWelcome" /></p>
				<p className="mt-1 text-xs leading-5 text-neutral-500 sm:text-sm"><LocaleMessage messageId="home.previewDescription" /></p>
			</div>
			<p className="mb-3 text-sm font-semibold text-neutral-900"><LocaleMessage messageId="home.previewProgress" /></p>
			<div className="grid grid-cols-3 gap-2 sm:gap-3">
				{metrics.map(({ label, value, icon: Icon }) => (
					<div key={label} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs sm:p-4">
						<div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-3.5" /></div>
						<p className="mt-3 text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl">{value}</p>
						<p className="mt-0.5 text-[9px] leading-tight text-neutral-500 sm:text-[11px]"><LocaleMessage messageId={label} /></p>
					</div>
				))}
			</div>
			<div className="mt-5 flex items-center justify-between">
				<p className="text-sm font-semibold text-neutral-900"><LocaleMessage messageId="home.previewContinue" /></p>
				<span className="text-[11px] font-medium text-primary"><LocaleMessage messageId="home.previewStatus" /></span>
			</div>
			<div className="mt-3 rounded-2xl border border-neutral-200 p-4">
				<div className="flex items-start gap-3">
					<div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
						<BookOpen className="size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-neutral-950"><LocaleMessage messageId="home.previewExam" /></p>
						<p className="mt-1 text-xs text-neutral-500"><LocaleMessage messageId="home.previewAnswered" /></p>
					</div>
					<span className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white"><LocaleMessage messageId="common.continue" /></span>
				</div>
				<div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
					<div className="h-full w-2/5 rounded-full bg-primary" />
				</div>
			</div>
			<div className="pointer-events-none absolute -right-3 -top-3 grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 sm:-right-5 sm:-top-5">
				<BarChart3 className="size-6" />
			</div>
		</div>
	)
}

export function HomePage() {
	const router = useRouter()
	const session = useAuthSession()

	useEffect(() => {
		if (session.status === "authenticated") {
			router.replace(STUDENT_LANDING_ROUTE)
		}
	}, [router, session.status])

	if (session.status !== "guest") {
		return <AuthLoading variant="home" />
	}

	return (
		<div className="min-h-svh overflow-x-hidden bg-neutral-50 text-neutral-950">
			<MainHeader />
			<main>
				<section className="relative isolate overflow-hidden">
					<div className="absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-primary/10 to-transparent" />
					<div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-28">
						<div className="max-w-2xl">
							<p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-sm font-medium text-primary">
								<Target className="size-4" />
								<LocaleMessage messageId="home.eyebrow" />
							</p>
							<h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
								<LocaleMessage messageId="home.title" />
							</h1>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<Link
									href={AUTH_ROUTES.signup}
									className={cn(
										buttonVariants({ size: "lg" }),
										"h-12 bg-primary px-6 text-white hover:bg-primary"
									)}
								>
									<LocaleMessage messageId="home.start" />
									<ArrowRight />
								</Link>
								<Link
									href={AUTH_ROUTES.signin}
									className={cn(
										buttonVariants({ variant: "outline", size: "lg" }),
										"h-12 border-neutral-300 bg-white px-6"
									)}
								>
									<LocaleMessage messageId="auth.signIn" />
								</Link>
							</div>
						</div>
						<DashboardPreview />
					</div>
				</section>

				<section id="benefits" className="scroll-mt-20 border-y border-neutral-200 bg-white py-16 sm:py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="max-w-2xl">
							<p className="text-sm font-semibold uppercase tracking-wider text-primary"><LocaleMessage messageId="home.benefitsEyebrow" /></p>
							<h2 id="benefits-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
								<LocaleMessage messageId="home.benefitsTitle" />
							</h2>
						</div>
						<div className="mt-10 grid gap-5 md:grid-cols-3">
							{benefits.map(({ title, description, icon: Icon }) => (
								<Card key={title}>
									<CardContent>
										<div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
											<Icon className="size-5" />
										</div>
										<h3 className="text-lg mt-4 font-semibold"><LocaleMessage messageId={title} /></h3>
										<p className="leading-6 text-neutral-600"><LocaleMessage messageId={description} /></p>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>

				<section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="text-center">
							<p className="text-sm font-semibold uppercase tracking-wider text-primary"><LocaleMessage messageId="home.stepsEyebrow" /></p>
							<h2 id="steps-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
								<LocaleMessage messageId="home.stepsTitle" />
							</h2>
						</div>
						<ol className="mt-12 grid gap-5 md:grid-cols-3">
							{steps.map(([number, title, description]) => (
								<Card key={number}>
									<CardContent>
									<span className="text-lg font-semibold text-primary"><LocaleMessage messageId="home.stepLabel" values={{ number }} /></span>
									<h3 className="mt-4 text-xl font-semibold"><LocaleMessage messageId={title} /></h3>
									<p className="leading-6 text-neutral-600"><LocaleMessage messageId={description} /></p>
									</CardContent>
								</Card>
							))}
						</ol>
					</div>
				</section>

				<section className="pb-16 sm:pb-24">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<Card className="bg-primary pb-12 text-center text-white">
							<CardContent>
								<CheckCircle2 className="mx-auto size-8 text-primary/20" />
								<h2 className="mt-5 text-3xl font-semibold tracking-tight"><LocaleMessage messageId="home.ctaTitle" /></h2>
								<p className="mx-auto mt-3 max-w-xl text-neutral-300"><LocaleMessage messageId="home.ctaDescription" /></p>
								<Link
									href={AUTH_ROUTES.signup}
									className={cn(
										buttonVariants({ size: "lg" }),
										"mt-7 h-12 bg-white px-6 text-neutral-950 hover:bg-neutral-100"
									)}
								>
									<LocaleMessage messageId="home.ctaButton" />
								</Link>
							</CardContent>
						</Card>
					</div>
				</section>
			</main>
			<PublicFooter />
		</div>
	)
}
