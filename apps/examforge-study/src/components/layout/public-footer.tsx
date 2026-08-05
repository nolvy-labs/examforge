"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { Brand } from "@/components/layout/brand"
import { LocaleMessage } from "@/components/locale/locale-message"
import type { LocaleMessageId } from "@/i18n/locale.type"

const legalLinks: Array<{ href: string; label: LocaleMessageId }> = [
	{ href: "/legal/terms", label: "legal.terms" },
	{ href: "/legal/privacy", label: "legal.privacy" },
	{ href: "/legal/cookies", label: "legal.cookies" },
]

export function PublicFooter() {
	const accessibility = useTranslations("accessibility")
	return (
		<footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<div className="grid gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
					<div className="max-w-sm"><Brand /><p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400"><LocaleMessage messageId="legal.footerDescription" /></p></div>
					<nav aria-label={accessibility("accountLinks")}><p className="text-sm font-semibold"><LocaleMessage messageId="legal.account" /></p><div className="mt-4 flex flex-col items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400"><FooterLink href="/signin"><LocaleMessage messageId="navigation.signIn" /></FooterLink><FooterLink href="/signup"><LocaleMessage messageId="navigation.createAccount" /></FooterLink></div></nav>
					<nav aria-label={accessibility("legalLinks")}><p className="text-sm font-semibold"><LocaleMessage messageId="legal.legal" /></p><div className="mt-4 flex flex-col items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">{legalLinks.map((link) => <FooterLink key={link.href} href={link.href}><LocaleMessage messageId={link.label} /></FooterLink>)}</div></nav>
				</div>
				<p className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800"><LocaleMessage messageId="legal.copyright" values={{ year: new Date().getFullYear() }} /></p>
			</div>
		</footer>
	)
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
	return <Link href={href} className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{children}</Link>
}
