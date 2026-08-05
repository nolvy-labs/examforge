import Link from "next/link"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, TriangleAlert } from "lucide-react"

import { loadLegalDocument } from "../legal-document.loader"
import { legalUi } from "../legal.navigation"
import type { LegalDocumentType, LegalLocale } from "../legal.types"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/shadcn/button"

export function legalMarkdownComponents(): Components {
	return {
		h1: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-3xl font-semibold tracking-tight first:mt-0">{children}</h2>,
		h2: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight">{children}</h2>,
		h3: ({ children }) => <h3 className="mt-8 scroll-mt-24 text-xl font-semibold">{children}</h3>,
		p: ({ children }) => <p className="mt-4 leading-7 text-neutral-700 dark:text-neutral-300">{children}</p>,
		ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-neutral-700 marker:text-primary">{children}</ul>,
		ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-neutral-700 marker:font-semibold marker:text-primary">{children}</ol>,
		blockquote: ({ children }) => <blockquote className="mt-6 border-l-4 border-primary bg-primary/5 px-5 py-1">{children}</blockquote>,
		code: ({ children, className }) => <code className={className ?? "rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"}>{children}</code>,
		table: ({ children }) => <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200"><table className="w-full min-w-2xl border-collapse text-left text-sm">{children}</table></div>,
		th: ({ children }) => <th className="border-b bg-neutral-50 px-4 py-3 font-semibold">{children}</th>,
		td: ({ children }) => <td className="border-b px-4 py-3 align-top text-neutral-700 last:border-b-0">{children}</td>,
		a: ({ href = "", children }) => {
			const external = /^https?:\/\//i.test(href)
			return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined} className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{children}</a>
		},
	}
}

export async function LegalPage({ document, locale }: { document: LegalDocumentType; locale: LegalLocale }) {
	const policy = await loadLegalDocument(document, locale)
	const ui = legalUi[locale]
	const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" })
	const formatDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`))

	return (
		<main className="flex-1 bg-neutral-50 px-4 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-6 sm:py-14 lg:px-8">
			<div className="mx-auto max-w-4xl">
				<Link href="/" className={cn(buttonVariants({ variant: "link" }), "p-0")}>
					<ArrowLeft />
					{ui.back}
				</Link>
				<div className="mt-7">
					<article lang={locale} className="min-w-0">
						<header className="border-b pb-7">
							<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{policy.frontMatter.title}</h1>
							<dl className="mt-5 grid gap-3 text-sm text-neutral-600 sm:grid-cols-3">
								<div><dt className="font-medium text-neutral-950">{ui.version}</dt><dd>{policy.frontMatter.version}</dd></div>
								<div><dt className="font-medium text-neutral-950">{ui.effectiveDate}</dt><dd><time dateTime={policy.frontMatter.effectiveDate}>{formatDate(policy.frontMatter.effectiveDate)}</time></dd></div>
								<div><dt className="font-medium text-neutral-950">{ui.lastUpdated}</dt><dd><time dateTime={policy.frontMatter.lastUpdated}>{formatDate(policy.frontMatter.lastUpdated)}</time></dd></div>
							</dl>
							{policy.placeholders.length > 0 && process.env.NODE_ENV !== "production" && <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"><TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" /><div><p className="font-semibold">{ui.draftTitle}</p><p className="mt-1 text-neutral-700">{ui.draftDescription}</p></div></div>}
						</header>
						<div className="pt-2"><ReactMarkdown remarkPlugins={[remarkGfm]} components={legalMarkdownComponents()} skipHtml>{policy.content}</ReactMarkdown></div>
					</article>
				</div>
			</div>
		</main>
	)
}
