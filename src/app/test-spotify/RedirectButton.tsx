"use client"
import { useRouter } from "next/navigation"

export function RedirectButton() {

    const router = useRouter()

    return (
        <button
        onClick={() => router.push("/auth/sign-in")}
        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600">
            Connect Spotify
        </button>
    )

}