import React, { useState, useLayoutEffect } from 'react';
import { IconChevronRight } from './Icons';

const TutorialStep = ({ title, content, targetId, onNext, position = 'bottom', isFinal = false }) => {
    const [targetRect, setTargetRect] = useState(null);

    useLayoutEffect(() => {
        if (!targetId) {
            setTargetRect({ top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0, isCentered: true });
            return;
        }

        const element = document.getElementById(targetId);
        if (element) {
            const check = () => {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0) setTargetRect(rect);
                else requestAnimationFrame(check);
            };
            check();
        }
    }, [targetId]);

    if (!targetRect) return null;

    const getPositionStyles = () => {
        if (targetRect.isCentered) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const commonX = targetRect.left + targetRect.width / 2;
        const commonY = targetRect.top + targetRect.height / 2;

        switch (position) {
            case 'bottom': return { top: `${targetRect.bottom + 15}px`, left: `${commonX}px`, transform: 'translateX(-50%)' };
            case 'top': return { bottom: `${window.innerHeight - targetRect.top + 15}px`, left: `${commonX}px`, transform: 'translateX(-50%)' };
            case 'left': return { top: `${commonY}px`, right: `${window.innerWidth - targetRect.left + 15}px`, transform: 'translateY(-50%)' };
            case 'right': return { top: `${commonY}px`, left: `${targetRect.right + 15}px`, transform: 'translateY(-50%)' };
            default: return { top: `${targetRect.bottom + 15}px`, left: `${commonX}px`, transform: 'translateX(-50%)' };
        }
    };

    return (
        <>
            {!targetRect.isCentered && (
                <div
                    className="fixed bg-theme-500/50 rounded-lg pointer-events-none animate-pulse ring-4 ring-theme-500"
                    style={{
                        top: `${targetRect.top - 5}px`, left: `${targetRect.left - 5}px`,
                        width: `${targetRect.width + 10}px`, height: `${targetRect.height + 10}px`,
                        transition: 'all 0.3s ease',
                    }}
                />
            )}
            <div
                className="fixed bg-slate-900/95 backdrop-blur-xl border border-theme-500/50 rounded-2xl p-6 w-80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in z-[3000]"
                style={getPositionStyles()}
            >
                <h3 className="text-lg font-black text-theme-400 mb-2">{title}</h3>
                <p className="text-sm text-white/80 mb-4">{content}</p>
                <button onClick={onNext} className="w-full py-3 bg-theme-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-theme-500 transition-colors shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)] flex items-center justify-center gap-2">
                    {isFinal ? "Terminer" : "Suivant"} {!isFinal && <IconChevronRight />}
                </button>
            </div>
        </>
    );
};

export const TutorialManager = ({ currentStep, nextStep, endTutorial }) => {
    if (currentStep === 0) return null;

    const steps = [
        { id: 1, title: "Bienvenue !", content: "MangaHub Pro vous permet de gérer votre bibliothèque personnelle. Cliquez sur le bouton '+' pour commencer.", targetId: "tutorial-add-manga", position: 'bottom' },
        { id: 2, title: "Import Facile", content: "Le moyen le plus simple est d'importer une archive .zip ou .cbz. Cliquez ici pour en sélectionner une.", targetId: "tutorial-import-zip", position: 'bottom' },
        { id: 3, title: "Votre Premier Livre", content: "Excellent ! Votre manga est maintenant sur l'étagère. Cliquez dessus pour l'inspecter.", targetId: "tutorial-first-book", position: 'top' },
        { id: 4, title: "Prêt à Lire ?", content: "Cette vue 3D vous permet d'admirer la couverture. Cliquez sur 'Ouvrir' pour commencer la lecture.", targetId: "tutorial-open-book", position: 'top' },
        { id: 5, title: "Navigation", content: "Pour tourner les pages, cliquez sur les côtés de l'écran, utilisez les flèches du clavier, ou faites simplement glisser la page.", targetId: "tutorial-reader-nav", position: 'left' },
        { id: 6, title: "C'est Parti !", content: "Vous savez tout ! Explorez les paramètres pour personnaliser votre expérience. Bonne lecture !", onNext: endTutorial, isFinal: true },
    ];

    const stepConfig = steps.find(s => s.id === currentStep);

    if (!stepConfig) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[2999] animate-fade">
            <TutorialStep {...stepConfig} onNext={stepConfig.onNext || nextStep} />
        </div>
    );
};