export function formatPercentage(value: number | null, locale = "en", emptyLabel = "—") {
	return value == null
		? emptyLabel
		: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(value / 100)
}

export function formatPoints(value: number, locale = "en") {
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}
