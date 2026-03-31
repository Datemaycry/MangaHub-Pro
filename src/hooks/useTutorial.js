import { useState, useCallback } from 'react';
import { getSafeStorage, setSafeStorage } from '../utils';

export const useTutorial = () => {
    const [isTutorialActive, setIsTutorialActive] = useState(() => {
        // Le tutoriel est actif s'il n'a jamais été complété.
        return getSafeStorage('mangaHubTutorialCompleted', 'false') === 'false';
    });
    const [currentStep, setCurrentStep] = useState(0);

    const startTutorial = useCallback(() => {
        setIsTutorialActive(true);
        setCurrentStep(1);
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep(prev => prev + 1);
    }, []);

    const endTutorial = useCallback(() => {
        setIsTutorialActive(false);
        setCurrentStep(0);
        setSafeStorage('mangaHubTutorialCompleted', 'true');
    }, []);

    return { isTutorialActive, currentStep, startTutorial, nextStep, endTutorial, setCurrentStep };
};