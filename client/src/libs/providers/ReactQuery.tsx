import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

type Props = {
    children: React.ReactNode
}

export default function ReactQueryProvider({ children }: Props) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    })

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>)
}