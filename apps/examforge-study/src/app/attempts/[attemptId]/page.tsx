import type { Metadata } from "next"

import { AttemptPage } from "@/features/attempt/pages/attempt.page"

export const metadata: Metadata = { title: "Exam Attempt" }

export default async function Page({
	params,
}: {
	params: Promise<{ attemptId: string }>
}) {
	const { attemptId } = await params
	return <AttemptPage attemptId={attemptId} />
}
