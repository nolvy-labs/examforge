import type { Metadata } from "next"

import { AttemptResultPage } from "@/features/attempt/attempt-result/pages/attempt-result.page"

export const metadata: Metadata = { title: "Attempt Result" }

export default async function Page({
	params,
}: {
	params: Promise<{ attemptId: string }>
}) {
	const { attemptId } = await params
	return <AttemptResultPage attemptId={attemptId} />
}
