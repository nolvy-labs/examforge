import Link from "next/link"

import { Brand } from "@/components/layout/brand"
import { buttonVariants } from "@/components/shadcn/button"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { cn } from "@/lib/utils"

export function PublicHeader() {
	return (
		<header className="border-b border-slate-200 bg-white/95">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<Brand className="[&>span:last-child]:hidden min-[390px]:[&>span:last-child]:inline" />
				<nav className="flex items-center gap-2 sm:gap-3">
					<Link
						href={AUTH_ROUTES.signin}
						className={cn(
							buttonVariants({ variant: "ghost" }),
							"px-3 text-slate-700"
						)}
					>
						Sign in
					</Link>
					<Link
						href={AUTH_ROUTES.signup}
						className={cn(buttonVariants(), "bg-indigo-600 px-3 text-white hover:bg-indigo-700 sm:px-4")}
					>
						Create account
					</Link>
				</nav>
			</div>
		</header>
	)
}