import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"

import { LOCALE_COOKIE_NAME } from "@/i18n/locale.constants"
import { resolveLocale } from "@/i18n/locale.utils"

export default getRequestConfig(async () => {
	const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
	const locale = resolveLocale(
		cookieStore.get(LOCALE_COOKIE_NAME)?.value,
		headerStore.get("accept-language")
	)

	return {
		locale,
		messages: (await import(`../../messages/${locale}.json`)).default,
		timeZone: "Asia/Ho_Chi_Minh",
	}
})

