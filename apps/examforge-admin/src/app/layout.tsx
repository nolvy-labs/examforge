import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/shadcn/tooltip";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "ExamForge Admin",
		template: "%s | ExamForge Admin",
	},
	description: "A focused place to prepare, practice, and track your progress.",
	icons: {
		icon: {
			url: '/icon.svg',
			type: 'image/svg+xml',
		},
	}
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable)}
		>
			<body className="min-h-full flex flex-col">
				<TooltipProvider>
					{children}
				</TooltipProvider>
			</body>
		</html>
	);
}
