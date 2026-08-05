"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { useTranslations } from "next-intl"

export function PasswordInput({
	visibilityLabel = "password",
	...props
}: React.ComponentProps<"input"> & { visibilityLabel?: string }) {
	const [isVisible, setIsVisible] = useState(false)
	const translate = useTranslations("accessibility")

	return (
		<div className="relative">
			<Input
				type={isVisible ? "text" : "password"}
				className="pr-10"
				{...props}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="absolute top-0.5 right-0.5 text-muted-foreground hover:text-foreground"
				onClick={() => setIsVisible((visible) => !visible)}
				aria-label={translate(isVisible ? "hidePassword" : "showPassword", { field: visibilityLabel })}
			>
				{isVisible ? (
					<EyeOff />
				) : (
					<Eye />
				)}
			</Button>
		</div>
	)
}
