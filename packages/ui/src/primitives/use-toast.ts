'use client';

import { toast } from 'react-hot-toast';

export function useToast() {
    return {
        toast: (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
            if (props.variant === 'destructive') {
                toast.error(`${props.title}${props.description ? `: ${props.description}` : ''}`);
            } else {
                toast.success(`${props.title}${props.description ? `: ${props.description}` : ''}`);
            }
        },
    };
}
