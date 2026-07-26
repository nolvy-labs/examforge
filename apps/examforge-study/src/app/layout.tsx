import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import { Providers } from "@/app/providers"
import { cn } from "@/lib/utils"

import "./globals.css"

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: {
		default: "ExamForge Study",
		template: "%s | ExamForge Study",
	},
	description: "A focused place to prepare, practice, and track your progress.",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={cn(
				"h-full font-sans antialiased",
				inter.variable,
				geistMono.variable
			)}
		>
			<body className="flex min-h-full flex-col">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
