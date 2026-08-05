import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"

import { Providers } from "@/app/providers"
import { cn } from "@/lib/utils"

import "./globals.css"

const inter = Inter({ variable: "--font-sans", subsets: ["latin", "vietnamese"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
	const translate = await getTranslations("metadata")
	return {
		title: { default: "ExamForge Study", template: "%s | ExamForge Study" },
		description: translate("appDescription"),
		icons: { icon: { url: "/icon.svg", type: "image/svg+xml" } },
	}
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const [locale, messages] = await Promise.all([getLocale(), getMessages()])

	return (
		<html lang={locale} className={cn("h-full font-sans antialiased", inter.variable, geistMono.variable)}>
			<body className="flex min-h-full flex-col">
				<NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
					<Providers>{children}</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
