
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export const useSocket = () => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // @ts-ignore - accessToken valid in our session type
        const token = session?.accessToken;
        if (!token) return;

        const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        console.log('Connecting socket to', url);

        const socketInstance = io(url + '/messaging', { // Namespace
            auth: { token },
            transports: ['websocket']
        });

        socketInstance.on('connect', () => {
            console.log('Socket connected:', socketInstance.id);
        });

        socketInstance.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [session]);

    return socket;
};
