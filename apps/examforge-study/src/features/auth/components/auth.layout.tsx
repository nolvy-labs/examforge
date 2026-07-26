"use client"

import Link from "next/link"
import { BookOpenCheck, CheckCircle2 } from "lucide-react"

import { useAuthInitialization } from "@/features/auth/hooks/auth.hook"

const benefits = [
	"Pick up where you left off",
	"Keep your practice history together",
	"Study securely across your devices",
]

export function AuthLayout({ children }: { children: React.ReactNode }) {
	useAuthInitialization()

	return (
		<main className="relative flex min-h-svh flex-1 overflow-hidden bg-muted/35">
			<div className="flex items-center justify-center mx-auto w-full">
				<section className="flex min-h-svh w-100 flex-col">
					<header className="flex items-center px-5 py-5 sm:px-8 lg:hidden">
						<Link
							href="/"
							className="flex items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
								<BookOpenCheck className="size-5" />
							</span>
							ExamForge
						</Link>
					</header>
					<div className="flex flex-1 items-center justify-center px-5 py-8">
						<div className="w-full max-w-md">{children}</div>
					</div>
				</section>
			</div>
		</main>
	)
}