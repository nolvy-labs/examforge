"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"

import type { LocaleMessageId } from "@/i18n/locale.type"

type MessageValues = Record<
	string,
	string | number | Date | ((chunks: ReactNode) => ReactNode)
>

interface LocaleMessageProps {
	messageId: LocaleMessageId
	values?: MessageValues
}

export function LocaleMessage({ messageId: id, values }: LocaleMessageProps) {
	const translate = useTranslations()
	let content: ReactNode

	try {
		content = translate.rich(id, values)
	} catch (error) {
		if (process.env.NODE_ENV !== "production") {
			console.error(`[i18n] Could not resolve message "${id}".`, error)
		}
		content = id
	}

	return <>{content}</>
}
