import type { ReactNode } from "react"
import Link from "next/link"

import { Brand } from "@/components/layout/brand"

const legalLinks = [
	{ href: "/legal/terms", label: "Terms" },
	{ href: "/legal/privacy", label: "Privacy" },
	{ href: "/legal/cookies", label: "Cookies" },
]

export function PublicFooter() {
	return (
		<footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<div className="grid gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
					<div className="max-w-sm">
						<Brand />
						<p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400">Focused exam practice, useful feedback, and clear progress tracking for every study session.</p>
					</div>
					<nav aria-label="Account links">
						<p className="text-sm font-semibold">Account</p>
						<div className="mt-4 flex flex-col items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
							<FooterLink href="/signin">Sign in</FooterLink>
							<FooterLink href="/signup">Create account</FooterLink>
						</div>
					</nav>
					<nav aria-label="Legal links">
						<p className="text-sm font-semibold">Legal</p>
						<div className="mt-4 flex flex-col items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
							{legalLinks.map((link) => <FooterLink key={link.href} href={link.href}>{link.label}</FooterLink>)}
						</div>
					</nav>
				</div>
				<p className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">&copy; {new Date().getFullYear()} ExamForge. All rights reserved.</p>
			</div>
		</footer>
	)
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
	return <Link href={href} className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{children}</Link>
}
