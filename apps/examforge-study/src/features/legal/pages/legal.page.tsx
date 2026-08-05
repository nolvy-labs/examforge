import Link from "next/link"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, TriangleAlert } from "lucide-react"

import { loadLegalDocument } from "../legal-document.loader"
import { legalHref, legalUi } from "../legal.navigation"
import { LEGAL_DOCUMENTS, type LegalDocumentType, type LegalLocale } from "../legal.types"

export function legalMarkdownComponents(locale: LegalLocale): Components {
	return {
	h1: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-3xl font-semibold tracking-tight first:mt-0">{children}</h2>,
	h2: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight">{children}</h2>,
	h3: ({ children }) => <h3 className="mt-8 scroll-mt-24 text-xl font-semibold">{children}</h3>,
	p: ({ children }) => <p className="mt-4 leading-7 text-neutral-700 dark:text-neutral-300">{children}</p>,
	ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-neutral-700 marker:text-primary dark:text-neutral-300">{children}</ul>,
	ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-neutral-700 marker:font-semibold marker:text-primary dark:text-neutral-300">{children}</ol>,
	blockquote: ({ children }) => <blockquote className="mt-6 border-l-4 border-primary bg-primary/5 px-5 py-1">{children}</blockquote>,
	code: ({ children, className }) => <code className={className ?? "rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"}>{children}</code>,
	table: ({ children }) => <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800"><table className="w-full min-w-2xl border-collapse text-left text-sm">{children}</table></div>,
	th: ({ children }) => <th className="border-b bg-neutral-50 px-4 py-3 font-semibold dark:bg-neutral-900">{children}</th>,
	td: ({ children }) => <td className="border-b px-4 py-3 align-top text-neutral-700 last:border-b-0 dark:text-neutral-300">{children}</td>,
	a: ({ href = "", children }) => {
		const external = /^https?:\/\//i.test(href)
		const localizedHref = href.startsWith("/legal/") ? `${href}${href.includes("?") ? "&" : "?"}lang=${locale}` : href
		return <a href={localizedHref} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined} className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{children}</a>
	},
	}
}

export async function LegalPage({ document, locale }: { document: LegalDocumentType; locale: LegalLocale }) {
	const policy = await loadLegalDocument(document, locale)
	const ui = legalUi[locale]
	const dateFormatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "long", timeZone: "UTC" })
	const formatDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`))

	return (
		<main className="flex-1 bg-neutral-50 px-4 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-6 sm:py-14 lg:px-8">
			<div className="mx-auto max-w-5xl">
				<Link href="/" className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-neutral-600 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-neutral-400"><ArrowLeft className="size-4" />{ui.back}</Link>
				<div className="mt-7 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
					<aside className="space-y-6 lg:sticky lg:top-6">
						<nav aria-label={ui.navigation} className="rounded-xl border bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
							{LEGAL_DOCUMENTS.map((item) => <Link key={item} href={legalHref(item, locale)} aria-current={item === document ? "page" : undefined} className="block rounded-lg px-3 py-2 text-sm font-medium aria-[current=page]:bg-primary aria-[current=page]:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800">{ui.documents[item]}</Link>)}
						</nav>
						<nav aria-label={ui.language} className="grid grid-cols-2 gap-1 rounded-xl border bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
							{(["vi", "en"] as const).map((item) => <Link key={item} href={legalHref(document, item)} hrefLang={item} aria-current={item === locale ? "page" : undefined} className="rounded-lg px-3 py-2 text-center text-sm font-semibold uppercase aria-[current=page]:bg-primary aria-[current=page]:text-white">{item}</Link>)}
						</nav>
					</aside>
					<article lang={locale} className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8 lg:p-10">
						<header className="border-b pb-7 dark:border-neutral-800">
							<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{policy.frontMatter.title}</h1>
							<dl className="mt-5 grid gap-3 text-sm text-neutral-600 dark:text-neutral-400 sm:grid-cols-3">
								<div><dt className="font-medium text-neutral-950 dark:text-neutral-100">{ui.version}</dt><dd>{policy.frontMatter.version}</dd></div>
								<div><dt className="font-medium text-neutral-950 dark:text-neutral-100">{ui.effectiveDate}</dt><dd><time dateTime={policy.frontMatter.effectiveDate}>{formatDate(policy.frontMatter.effectiveDate)}</time></dd></div>
								<div><dt className="font-medium text-neutral-950 dark:text-neutral-100">{ui.lastUpdated}</dt><dd><time dateTime={policy.frontMatter.lastUpdated}>{formatDate(policy.frontMatter.lastUpdated)}</time></dd></div>
							</dl>
							{policy.placeholders.length > 0 && process.env.NODE_ENV !== "production" && <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"><TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" /><div><p className="font-semibold">{ui.draftTitle}</p><p className="mt-1 text-neutral-700 dark:text-neutral-300">{ui.draftDescription}</p></div></div>}
						</header>
						<div className="pt-2"><ReactMarkdown remarkPlugins={[remarkGfm]} components={legalMarkdownComponents(locale)} skipHtml>{policy.content}</ReactMarkdown></div>
					</article>
				</div>
			</div>
		</main>
	)
}
