"use client"

import Link from "next/link"
import { BookOpenCheck } from "lucide-react"

import { GuestGuard } from "@/features/auth/components/guest.guard"

export function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<GuestGuard>
			<main className="relative flex min-h-svh flex-1 overflow-hidden bg-muted/35">
				<div className="mx-auto flex w-full items-center justify-center">
					<section className="flex min-h-svh w-full max-w-md flex-col">
						<header className="flex items-center px-5 py-5 sm:px-8">
							<Link
								href="/"
								className="flex items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
									<BookOpenCheck className="size-5" aria-hidden="true" />
								</span>
								ExamForge
							</Link>
						</header>
						<div className="flex flex-1 items-center justify-center px-5 py-8">
							<div className="w-full">{children}</div>
						</div>
					</section>
				</div>
			</main>
		</GuestGuard>
	)
}
