"use client"

import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import { HeroUIProvider } from "@heroui/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { authClient } from "@/lib/auth-client"

export function Providers({ children }: { children: ReactNode }) {
    const router = useRouter()

    return (
        <HeroUIProvider>
          <AuthUIProvider
            authClient={authClient}
            navigate={router.push}
            replace={router.replace}
            onSessionChange={() => router.refresh()}
            // Removed Spotify social provider - using email/password auth only
            // social={{
            //   providers: ["spotify"]
            // }}
            Link={Link}
          >
            {children}
          </AuthUIProvider>
        </HeroUIProvider>
    )
}