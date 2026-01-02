'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// This page acts as a redirect to the default user admin view (history)
export default function UserAdminRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const { userId } = params;

  useEffect(() => {
    if (userId) {
      router.replace(`/admin/users/${userId}/history`);
    }
  }, [router, userId]);

  // You can show a loading state here if you want
  return <div>Loading user details...</div>;
}
