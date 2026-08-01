"use client"

import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"

import {
	archiveAdminExamCategory,
	archiveAdminExamTag,
	createAdminExamCategory,
	createAdminExamTag,
	restoreAdminExamCategory,
	restoreAdminExamTag,
	updateAdminExamCategory,
	updateAdminExamTag,
} from "@/features/exam-classifications/api/exam-classification.api"
import {
	examClassificationMutationKeys,
	examClassificationQueryKeys,
} from "@/features/exam-classifications/queries/exam-classification.query-key"
import {
	adminExamCategoryDetailQueryOptions,
	adminExamCategoryListQueryOptions,
	adminExamTagDetailQueryOptions,
	adminExamTagListQueryOptions,
} from "@/features/exam-classifications/queries/exam-classification.query"
import type {
	AdminExamCategoryListFilter,
	AdminExamTagListFilter,
	CreateExamCategoryRequest,
	CreateExamTagRequest,
	UpdateExamCategoryRequest,
	UpdateExamTagRequest,
} from "@/features/exam-classifications/types/exam-classification.types"

export interface UpdateAdminExamTagMutationInput {
	id: string
	request: UpdateExamTagRequest
}

export interface UpdateAdminExamCategoryMutationInput {
	id: string
	request: UpdateExamCategoryRequest
}

export function invalidateAdminExamTagLists(queryClient: QueryClient) {
	return queryClient.invalidateQueries({
		queryKey: examClassificationQueryKeys.tags.lists(),
	})
}

export function invalidateAdminExamTagDetail(
	queryClient: QueryClient,
	id: string
) {
	return queryClient.invalidateQueries({
		queryKey: examClassificationQueryKeys.tags.detail(id.toLowerCase()),
	})
}

export function invalidateAdminExamCategoryLists(queryClient: QueryClient) {
	return queryClient.invalidateQueries({
		queryKey: examClassificationQueryKeys.categories.lists(),
	})
}

export function invalidateAdminExamCategoryDetails(queryClient: QueryClient) {
	return queryClient.invalidateQueries({
		queryKey: examClassificationQueryKeys.categories.details(),
	})
}

export function invalidateAdminExamCategoryDetail(
	queryClient: QueryClient,
	id: string
) {
	return queryClient.invalidateQueries({
		queryKey: examClassificationQueryKeys.categories.detail(id.toLowerCase()),
	})
}

export async function invalidateAfterAdminExamTagChange(
	queryClient: QueryClient,
	id: string
) {
	await Promise.all([
		invalidateAdminExamTagLists(queryClient),
		invalidateAdminExamTagDetail(queryClient, id),
		invalidateAdminExamCategoryLists(queryClient),
		invalidateAdminExamCategoryDetails(queryClient),
	])
}

export async function invalidateAfterAdminExamCategoryChange(
	queryClient: QueryClient,
	id: string
) {
	await Promise.all([
		invalidateAdminExamCategoryLists(queryClient),
		invalidateAdminExamCategoryDetail(queryClient, id),
	])
}

export function useAdminExamTags(filters: AdminExamTagListFilter = {}) {
	return useQuery(adminExamTagListQueryOptions(filters))
}

export function useAdminExamTag(id?: string | null) {
	return useQuery(adminExamTagDetailQueryOptions(id))
}

export function useAdminExamCategories(
	filters: AdminExamCategoryListFilter = {}
) {
	return useQuery(adminExamCategoryListQueryOptions(filters))
}

export function useAdminExamCategory(id?: string | null) {
	return useQuery(adminExamCategoryDetailQueryOptions(id))
}

export function useCreateAdminExamTagMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.tags.create,
		mutationFn: (request: CreateExamTagRequest) => createAdminExamTag(request),
		onSuccess: () => invalidateAdminExamTagLists(queryClient),
	})
}

export function useUpdateAdminExamTagMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.tags.update,
		mutationFn: ({ id, request }: UpdateAdminExamTagMutationInput) =>
			updateAdminExamTag(id, request),
		onSuccess: (_, { id }) =>
			invalidateAfterAdminExamTagChange(queryClient, id),
	})
}

export function useArchiveAdminExamTagMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.tags.archive,
		mutationFn: (id: string) => archiveAdminExamTag(id),
		onSuccess: (_, id) => invalidateAfterAdminExamTagChange(queryClient, id),
	})
}

export function useRestoreAdminExamTagMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.tags.restore,
		mutationFn: (id: string) => restoreAdminExamTag(id),
		onSuccess: (_, id) => invalidateAfterAdminExamTagChange(queryClient, id),
	})
}

export function useCreateAdminExamCategoryMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.categories.create,
		mutationFn: (request: CreateExamCategoryRequest) =>
			createAdminExamCategory(request),
		onSuccess: () => invalidateAdminExamCategoryLists(queryClient),
	})
}

export function useUpdateAdminExamCategoryMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.categories.update,
		mutationFn: ({ id, request }: UpdateAdminExamCategoryMutationInput) =>
			updateAdminExamCategory(id, request),
		onSuccess: (_, { id }) =>
			invalidateAfterAdminExamCategoryChange(queryClient, id),
	})
}

export function useArchiveAdminExamCategoryMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.categories.archive,
		mutationFn: (id: string) => archiveAdminExamCategory(id),
		onSuccess: (_, id) =>
			invalidateAfterAdminExamCategoryChange(queryClient, id),
	})
}

export function useRestoreAdminExamCategoryMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examClassificationMutationKeys.categories.restore,
		mutationFn: (id: string) => restoreAdminExamCategory(id),
		onSuccess: (_, id) =>
			invalidateAfterAdminExamCategoryChange(queryClient, id),
	})
}
