'use client';

import { authClient } from "@/lib/auth-client";
import { useState } from "react";

export default function TestAuthPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<any>(null);

    const handleSignUp = async () => {
        try {
            setError(null);
            const res = await authClient.signUp.email({
                email,
                password,
                name: email.split('@')[0],
            });
            setResult(res);
        } catch (err) {
            setError(err);
            console.error('Sign up error:', err);
        }
    };

    const handleSignIn = async () => {
        try {
            setError(null);
            const res = await authClient.signIn.email({
                email,
                password,
            });
            setResult(res);
        } catch (err) {
            setError(err);
            console.error('Sign in error:', err);
        }
    };

    const handleGetSession = async () => {
        try {
            setError(null);
            const res = await authClient.getSession();
            setResult(res);
        } catch (err) {
            setError(err);
            console.error('Get session error:', err);
        }
    };

    return (
        <div className="p-8 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Test Auth</h1>
            
            <div className="space-y-4">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                
                <div className="flex gap-2">
                    <button
                        onClick={handleSignUp}
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Sign Up
                    </button>
                    <button
                        onClick={handleSignIn}
                        className="px-4 py-2 bg-green-500 text-white rounded"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={handleGetSession}
                        className="px-4 py-2 bg-purple-500 text-white rounded"
                    >
                        Get Session
                    </button>
                </div>
                
                {error && (
                    <div className="p-4 bg-red-100 text-red-700 rounded">
                        <pre>{JSON.stringify(error, null, 2)}</pre>
                    </div>
                )}
                
                {result && (
                    <div className="p-4 bg-green-100 text-green-700 rounded">
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}