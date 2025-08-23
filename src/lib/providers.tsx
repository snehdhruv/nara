"use client"

import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import { HeroUIProvider } from "@heroui/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { authClient } from "@/lib/auth-client"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: ReactNode }) {
    const router = useRouter()

    return (
        <ThemeProvider>
          <HeroUIProvider>
            <AuthUIProvider
              authClient={authClient}
              navigate={router.push}
              replace={router.replace}
              onSessionChange={() => router.refresh()}
              social={{
                providers: ["spotify"]
              }}
              Link={Link}
            >
              {children}
            </AuthUIProvider>
          </HeroUIProvider>
        </ThemeProvider>
    )
}