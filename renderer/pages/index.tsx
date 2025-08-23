import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to simple test page for now
    router.push('/simple-test');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-green-600 mb-2">🎵 Loading...</h2>
        <p className="text-gray-600">Redirecting you to the app...</p>
      </div>
    </div>
  );
}
