import type { PropsWithChildren, ReactElement } from "react"
import {
	QueryClient,
	QueryClientProvider,
	type QueryClientConfig,
} from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import messages from "../../messages/en.json"

export function createTestQueryClient(config: QueryClientConfig = {}) {
	return new QueryClient({
		...config,
		defaultOptions: {
			...config.defaultOptions,
			queries: {
				retry: false,
				gcTime: Infinity,
				...config.defaultOptions?.queries,
			},
			mutations: {
				retry: false,
				...config.defaultOptions?.mutations,
			},
		},
	})
}

interface ProviderOptions {
	queryClient?: QueryClient
}

export function createTestWrapper({
	queryClient = createTestQueryClient(),
}: ProviderOptions = {}) {
	return function TestProviders({ children }: PropsWithChildren) {
		return (
			<NextIntlClientProvider locale="en" messages={messages}>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</NextIntlClientProvider>
		)
	}
}

export function renderWithProviders(
	ui: ReactElement,
	{
		queryClient = createTestQueryClient(),
		...options
	}: RenderOptions & ProviderOptions = {}
) {
	return {
		queryClient,
		...render(ui, {
			wrapper: createTestWrapper({ queryClient }),
			...options,
		}),
	}
}
