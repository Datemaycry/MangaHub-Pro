import { useState, useEffect, useCallback } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = 'info') => {
        setToast({ msg, type, id: Date.now() });
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    return { toast, showToast };
};
