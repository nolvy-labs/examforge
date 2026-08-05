"use client"

import { useEffect, useTransition } from "react"
import { LoaderCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import { setLocale } from "@/i18n/actions/set-locale.action"
import {
	LOCALE_STORAGE_KEY,
	SUPPORTED_LOCALES,
} from "@/i18n/locale.constants"
import type { Locale } from "@/i18n/locale.type"
import { isLocale } from "@/i18n/locale.utils"
import { cn } from "@/lib/utils"

const LOCALE_OPTIONS = {
	en: { flag: "🇺🇸", label: "english" },
	vi: { flag: "🇻🇳", label: "vietnamese" },
} as const

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
	const activeLocale = useLocale() as Locale
	const translate = useTranslations("locale")
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	useEffect(() => {
		function synchronize(event: StorageEvent) {
			if (
				event.key === LOCALE_STORAGE_KEY &&
				event.newValue &&
				event.newValue !== activeLocale
			) {
				router.refresh()
			}
		}

		window.addEventListener("storage", synchronize)
		return () => window.removeEventListener("storage", synchronize)
	}, [activeLocale, router])

	function selectLocale(locale: Locale) {
		if (locale === activeLocale || isPending) return

		startTransition(async () => {
			try {
				await setLocale(locale)
				window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
				router.refresh()
			} catch {
				toast.error(translate("updateError"))
			}
		})
	}

	return (
		<Select
			value={activeLocale}
			disabled={isPending}
			onValueChange={(value) => {
				if (isLocale(value)) {
					selectLocale(value)
				}
			}}
		>
			<SelectTrigger
				size="sm"
				aria-label={translate("switcherLabel")}
				className={cn("min-w-32", compact && "w-full")}
			>
				<SelectValue>
					<span className="flex min-w-0 items-center gap-2">
						{/* <span aria-hidden="true" className="text-base leading-none">
							{LOCALE_OPTIONS[activeLocale].flag}
						</span> */}
						<span className="truncate text-xs font-medium">
							{translate(LOCALE_OPTIONS[activeLocale].label)}
						</span>
						{isPending && <LoaderCircle aria-hidden="true" className="ml-auto animate-spin" />}
					</span>
				</SelectValue>
			</SelectTrigger>
			<SelectContent align={compact ? "start" : "end"}>
				<SelectGroup>
					<SelectLabel>{translate("switcherLabel")}</SelectLabel>
					{SUPPORTED_LOCALES.map((locale) => (
						<SelectItem key={locale} value={locale}>
							{/* <span aria-hidden="true" className="text-base leading-none">
								{LOCALE_OPTIONS[locale].flag}
							</span> */}
							<span>{translate(LOCALE_OPTIONS[locale].label)}</span>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	)
}
