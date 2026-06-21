'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getAuthUser();
    router.replace(user ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
