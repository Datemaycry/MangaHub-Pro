import { useState, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../utils';

export const useFullscreen = (setZenMode) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFsChange = () => {
            const isNativeFS = !!(
                document.fullscreenElement || 
                document.webkitFullscreenElement ||
                document.mozFullScreenElement || 
                document.msFullscreenElement
            );
            
            // On synchronise l'état local avec l'état réel du navigateur
            setIsFullscreen(isNativeFS);
            
            if (!isNativeFS) {
                document.documentElement.classList.remove('is-pseudo-fs');
            } else {
                document.documentElement.classList.add('is-native-fs');
            }
        };

        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(ev => document.addEventListener(ev, onFsChange));
        
        return () => {
            events.forEach(ev => document.removeEventListener(ev, onFsChange));
        };
    }, []);

    const toggleFullscreen = useCallback(() => {
        const doc = document;
        const target = doc.documentElement; // documentElement est le plus fiable pour Chrome/Safari global
        
        const isNativeFS = !!(
            doc.fullscreenElement || 
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement || 
            doc.msFullscreenElement
        );

        if (!isNativeFS) {
            // Entrée en plein écran
            const req = target.requestFullscreen || 
                        target.webkitRequestFullscreen ||
                        target.mozRequestFullScreen || 
                        target.msRequestFullscreen;

            if (setZenMode) setZenMode(true);
            
            if (req) {
                // Petit hack Safari/Chrome Mobile : on scrolle en haut pour aider à cacher les barres
                window.scrollTo(0, 0);
                
                req.call(target)
                    .then(() => {
                        setIsFullscreen(true);
                        doc.documentElement.classList.remove('is-pseudo-fs');
                    })
                    .catch(err => {
                        console.warn("Native FS failed, switching to Pseudo FS:", err);
                        setIsFullscreen(true);
                        doc.documentElement.classList.add('is-pseudo-fs');
                    });
            } else {
                // Pas d'API native (ex: iPhone), on passe en Pseudo-FS
                setIsFullscreen(true);
                doc.documentElement.classList.add('is-pseudo-fs');
            }
            triggerHaptic(30);
        } else {
            // Sortie du plein écran
            const exit = doc.exitFullscreen || 
                         doc.webkitExitFullscreen ||
                         doc.mozCancelFullScreen || 
                         doc.msExitFullscreen;
            
            setIsFullscreen(false);
            doc.documentElement.classList.remove('is-pseudo-fs', 'is-native-fs');
            
            if (exit) {
                exit.call(doc).catch(() => {});
            }
            triggerHaptic(20);
        }
    }, [setZenMode]);

    return { isFullscreen, toggleFullscreen };
};
