"use client"

import { useCallback, useEffect } from "react"

import { useShouldBlockBuilderNavigation } from "../store/exam-builder.store"

export function useExamBuilderNavigationGuard() {
	const shouldBlockNavigation = useShouldBlockBuilderNavigation()

	useEffect(() => {
		if (!shouldBlockNavigation) return
		const beforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault()
			event.returnValue = ""
		}
		window.addEventListener("beforeunload", beforeUnload)
		return () => window.removeEventListener("beforeunload", beforeUnload)
	}, [shouldBlockNavigation])

	const canNavigate = useCallback(
		(confirmDiscard: () => boolean) =>
			!shouldBlockNavigation || confirmDiscard(),
		[shouldBlockNavigation]
	)

	return { shouldBlockNavigation, canNavigate }
}
