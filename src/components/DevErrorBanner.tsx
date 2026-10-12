import React, { useEffect, useState } from 'react';

/**
 * Genesis-grade W4 Guardrail:
 * Shows a DEV-only banner when API endpoints return non-200.
 * Gating: import.meta.env.DEV and ?ui=devtools URL param.
 */
export function DevErrorBanner() {
    const [error, setError] = useState<{ status: number; url: string; message: string } | null>(null);

    useEffect(() => {
        // Only mount listener in DEV memory (but ensure it complies with env logic)
        const handleApiError = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                setError(customEvent.detail);
            }
        };

        window.addEventListener('ecc-api-error', handleApiError);
        return () => window.removeEventListener('ecc-api-error', handleApiError);
    }, []);

    // Gating requirements: DEV env AND ?ui=devtools requested
    const isDevProcess = import.meta.env.DEV;
    const isDevToolsRequested = typeof window !== 'undefined' && window.location.search.includes('ui=devtools');

    if (!isDevProcess || !isDevToolsRequested || !error) {
        return null;
    }

    return (
        <div className="bg-red-900 border-b border-red-500 text-white p-3 text-sm flex items-center justify-between z-50 fixed top-0 left-0 right-0 w-full shadow-lg">
            <div className="flex items-center gap-3">
                <span className="font-bold bg-red-800 px-2 py-1 rounded text-xs select-all">HTTP {error.status}</span>
                <span className="font-mono text-red-200 truncate max-w-[300px] select-all">{error.url}</span>
                <span className="font-medium text-red-50">{error.message}</span>
            </div>
            <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-white px-2 rounded hover:bg-red-800 transition-colors"
            >
                Dismiss
            </button>
        </div>
    );
}
