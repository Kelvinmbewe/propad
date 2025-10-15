'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'propad_ad_session';

function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function useAdSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      let current = window.localStorage.getItem(STORAGE_KEY);
      if (!current) {
        current = createSessionId();
        window.localStorage.setItem(STORAGE_KEY, current);
      }
      setSessionId(current);
    } catch (error) {
      setSessionId(createSessionId());
    }
  }, []);

  return sessionId;
}
