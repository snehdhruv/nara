import { AuthView } from "@daveyplate/better-auth-ui"
import { authViewPaths } from "@daveyplate/better-auth-ui/server"

export const dynamicParams = false

export function generateStaticParams() {
    return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
    const { path } = await params
    
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
            <div className="w-full max-w-md auth-container">
                <AuthView path={path} redirectTo="/nara"/>
            </div>
        </main>
    )
}