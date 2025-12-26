'use client';

import { useState, useEffect } from 'react';
import { getServerApiBaseUrl } from '@propad/config';
import { useSession } from 'next-auth/react';

export default function EarningsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      // Load agent earnings data
      setLoading(false);
    }
  }, [session]);

  if (loading) {
    return <div>Loading earnings...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-gray-600">View your agent earnings and revenue</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Earnings dashboard coming soon</p>
      </div>
    </div>
  );
}

