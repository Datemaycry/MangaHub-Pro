import React, { useState, useEffect, memo } from 'react';
import { getCachedUrl } from '../utils';

const StackThumbnail = memo(({ file, contain = false, className = "" }) => {
    const [url, setUrl] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            setIsLoaded(false);
            return;
        }

        const newUrl = getCachedUrl(file);

        if (newUrl !== url) {
            setUrl(newUrl);
            setIsLoaded(false);
        }
    }, [file, url]);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    if (!url) {
        return <div className={`w-full h-full bg-theme-800/20 animate-pulse ${className}`}></div>;
    }

    return (
        <div className="w-full h-full relative bg-black/20 overflow-hidden">
            {/* Le pulse est affiché en fond tant que l'image n'est pas chargée */}
            {!isLoaded && <div className="absolute inset-0 w-full h-full bg-theme-800/20 animate-pulse"></div>}

            <img src={url} onLoad={handleLoad} loading="lazy" decoding="async"
                className={`absolute inset-0 w-full h-full gpu-accelerated ${contain ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`} />
        </div>
    );
});

StackThumbnail.displayName = 'StackThumbnail';

export default StackThumbnail;
