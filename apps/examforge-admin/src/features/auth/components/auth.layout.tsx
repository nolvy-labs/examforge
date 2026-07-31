"use client"

import Link from "next/link"
import { ShieldCheckIcon } from "@phosphor-icons/react"

import { ADMIN_ROUTES } from "@/features/auth/auth.constants"
import { PublicAuthGuard } from "@/features/auth/components/public-auth.guard"

export function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<PublicAuthGuard>
			<main className="relative flex min-h-svh flex-1 overflow-hidden bg-muted/30">
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
				<section className="relative mx-auto flex min-h-svh w-full max-w-md flex-col px-5 sm:px-8">
					<header className="flex items-center justify-between py-6">
						<Link
							href={ADMIN_ROUTES.signin}
							className="flex items-center gap-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<span className="grid size-9 place-items-center bg-foreground text-background">
								<ShieldCheckIcon className="size-5" weight="duotone" aria-hidden="true" />
							</span>
							<span className="leading-tight">
								<span className="block text-sm">ExamForge</span>
								<span className="block text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">Admin Portal</span>
							</span>
						</Link>
					</header>
					<div className="flex flex-1 items-center justify-center py-10">
						<div className="w-full">{children}</div>
					</div>
				</section>
			</main>
		</PublicAuthGuard>
	)
}
