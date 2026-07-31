"use client"

import { useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"

import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"

export function PasswordInput({
	visibilityLabel = "password",
	...props
}: React.ComponentProps<"input"> & { visibilityLabel?: string }) {
	const [isVisible, setIsVisible] = useState(false)

	return (
		<div className="relative">
			<Input type={isVisible ? "text" : "password"} className="h-10 pr-10" {...props} />
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground"
				aria-label={`${isVisible ? "Hide" : "Show"} ${visibilityLabel}`}
				aria-pressed={isVisible}
				onClick={() => setIsVisible((visible) => !visible)}
			>
				{isVisible ? <EyeSlashIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
			</Button>
		</div>
	)
}
