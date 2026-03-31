import { useState, useEffect, useCallback } from 'react';
import { getSafeStorage, setSafeStorage } from '../utils';

export const useSettings = () => {
    const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
    const [displayMode, setDisplayMode] = useState(() => getSafeStorage('mangaHubDisplayMode', 'auto'));
    const effectiveLandscape = displayMode === 'auto' ? isLandscape : displayMode === 'double';

    const toggleDisplayMode = useCallback((e) => {
        if (e) e.stopPropagation();
        setDisplayMode(prev => {
            const currentlyLandscape = prev === 'auto' ? isLandscape : prev === 'double';
            const next = currentlyLandscape ? 'single' : 'double';
            setSafeStorage('mangaHubDisplayMode', next);
            return next;
        });
    }, [isLandscape]);

    const [appTheme, setAppTheme] = useState(() => getSafeStorage('mangaHubTheme', 'blue'));
    const [isNightMode, setIsNightMode] = useState(() => getSafeStorage('mangaHubNightMode', 'false') === 'true');
    const [showSpine, setShowSpine] = useState(() => getSafeStorage('mangaHubShowSpine', 'true') === 'true');
    const [shelfTheme, setShelfTheme] = useState(() => getSafeStorage('mangaHubShelfTheme', 'mahogany'));
    const [shelfEngraving, setShelfEngraving] = useState(() => getSafeStorage('mangaHubShelfEngraving', 'none'));
    const [pageAnimationsEnabled, setPageAnimationsEnabled] = useState(() => getSafeStorage('mangaHubPageAnims', 'true') === 'true');
    const [soundVolume, setSoundVolume] = useState(() => Number(getSafeStorage('mangaHubSoundVolume', '0.4')));
    const [animationSpeed, setAnimationSpeed] = useState(() => Number(getSafeStorage('mangaHubAnimSpeed', '1.0')));

    useEffect(() => {
        document.body.setAttribute('data-theme', appTheme);
        setSafeStorage('mangaHubTheme', appTheme);
    }, [appTheme]);

    useEffect(() => {
        if (pageAnimationsEnabled) {
            document.documentElement.style.setProperty('--page-turn-duration', `${0.6 * animationSpeed}s`);
            document.documentElement.style.setProperty('--page-snap-duration', `${0.4 * animationSpeed}s`);
        } else {
            document.documentElement.style.setProperty('--page-turn-duration', '0s');
            document.documentElement.style.setProperty('--page-snap-duration', '0s');
        }
        setSafeStorage('mangaHubPageAnims', String(pageAnimationsEnabled));
        setSafeStorage('mangaHubAnimSpeed', String(animationSpeed));
    }, [pageAnimationsEnabled, animationSpeed]);

    useEffect(() => { setSafeStorage('mangaHubNightMode', isNightMode.toString()); }, [isNightMode]);
    useEffect(() => { setSafeStorage('mangaHubShowSpine', showSpine.toString()); }, [showSpine]);
    useEffect(() => { setSafeStorage('mangaHubShelfTheme', shelfTheme); }, [shelfTheme]);
    useEffect(() => { setSafeStorage('mangaHubShelfEngraving', shelfEngraving); }, [shelfEngraving]);
    useEffect(() => { setSafeStorage('mangaHubSoundVolume', String(soundVolume)); }, [soundVolume]);

    useEffect(() => {
        const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    return {
        isLandscape, displayMode, effectiveLandscape, toggleDisplayMode,
        appTheme, setAppTheme,
        isNightMode, setIsNightMode,
        showSpine, setShowSpine,
        shelfTheme, setShelfTheme,
        shelfEngraving, setShelfEngraving,
        pageAnimationsEnabled, setPageAnimationsEnabled,
        soundVolume, setSoundVolume,
        animationSpeed, setAnimationSpeed,
    };
};
