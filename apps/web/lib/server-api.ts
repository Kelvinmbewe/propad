'use server';

import { auth } from '@/auth';
import { getServerApiBaseUrl } from '@propad/config';

/**
 * Server-side API Client for web app -> API communication.
 * 
 * The web app should NEVER access the database directly.
 * All data operations must go through the API.
 */

interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    revalidate?: number | false;
}

/**
 * Make an authenticated API request from server-side code.
 * Automatically attaches the user's access token from the session.
 */
export async function serverApiRequest<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const session = await auth();
    const apiUrl = getServerApiBaseUrl();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Attach access token if available
    if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
    }

    const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
    };

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    // Add cache control
    if (options.revalidate !== undefined) {
        (fetchOptions as any).next = { revalidate: options.revalidate };
    }

    const response = await fetch(`${apiUrl}${endpoint}`, fetchOptions);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ServerAPI] ${options.method || 'GET'} ${endpoint} failed:`, response.status, errorText);
        throw new Error(`API request failed: ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
        return undefined as T;
    }

    return JSON.parse(text) as T;
}

/**
 * Make a public API request (no auth required) from server-side code.
 */
export async function serverPublicApiRequest<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const apiUrl = getServerApiBaseUrl();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
    };

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    if (options.revalidate !== undefined) {
        (fetchOptions as any).next = { revalidate: options.revalidate };
    }

    const response = await fetch(`${apiUrl}${endpoint}`, fetchOptions);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ServerAPI] ${options.method || 'GET'} ${endpoint} failed:`, response.status, errorText);
        throw new Error(`API request failed: ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
        return undefined as T;
    }

    return JSON.parse(text) as T;
}
