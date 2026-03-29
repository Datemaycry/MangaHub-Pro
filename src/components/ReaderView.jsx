import React, { useState, useEffect, memo, useRef } from 'react';
import {
    IconChevronLeft, IconSinglePage, IconDoublePage, IconMaximize,
    IconBookmarkFilled, IconBookmarkOutline, IconMoon, IconSun
} from './Icons';
import { getCachedUrl, triggerHaptic } from '../utils';

// Sous-composant pour afficher une image du lecteur
const ReaderImage = memo(React.forwardRef(({ file, className = "", style = {}, isBackground = false }, ref) => {
    const url = getCachedUrl(file);
    if (!url) return null;
    if (isBackground) return null;
    return <img ref={ref} src={url} decoding="async" className={`reader-img gpu-accelerated ${className}`} style={style} />;
}));
ReaderImage.displayName = 'ReaderImage';

// Sous-composant pour les miniatures de la barre de progression
const StackThumbnail = memo(({ file, contain = false, className = "" }) => {
    const url = getCachedUrl(file);
    return url ? <img src={url} loading="lazy" decoding="async" className={`w-full h-full gpu-accelerated ${contain ? 'object-contain' : 'object-cover'} ${className}`} /> : null;
});

// Sous-composant pour afficher une page ou une double-page (avec animations 3D)
const SpreadDisplay = memo(({ spread, manga, isAnimating = false, slideDir = "next", isLandscape = true, hideAmbilight = false, singleRef, leftRef, rightRef }) => {
    if (!spread) return null;
    const isRTL = manga?.direction === 'rtl'; let animLeftClass = ""; let animRightClass = "";
    
    if (isAnimating) {
        if (isRTL) { if (slideDir === 'next') animRightClass = 'animate-repli-right'; if (slideDir === 'prev') animLeftClass = 'animate-repli-left'; } 
        else { if (slideDir === 'next') animLeftClass = 'animate-repli-left'; if (slideDir === 'prev') animRightClass = 'animate-repli-right'; }
    }
    
    if (spread.center) {
        if (isLandscape) {
            return (
                <div className="flex w-full h-full perspective-[3000px] transform-style-[preserve-3d]">
                    {!hideAmbilight && <ReaderImage file={spread.center} isBackground={true} />}
                    <div ref={leftRef} className={`w-1/2 h-full relative overflow-hidden gpu-accelerated ${animLeftClass}`} style={{ willChange: 'transform, filter' }}>
                        <div className="absolute top-0 left-0 w-[100vw] h-full flex justify-center items-center"><ReaderImage file={spread.center} /></div>
                    </div>
                    <div ref={rightRef} className={`w-1/2 h-full relative overflow-hidden gpu-accelerated ${animRightClass}`} style={{ willChange: 'transform, filter' }}>
                        <div className="absolute top-0 right-0 w-[100vw] h-full flex justify-center items-center"><ReaderImage file={spread.center} /></div>
                    </div>
                </div>
            );
        } else {
            return (
                <>
                    {!hideAmbilight && <ReaderImage file={spread.center} isBackground={true} />}
                    <ReaderImage ref={singleRef} file={spread.center} />
                </>
            );
        }
    }
    return (
        <div className="double-layout relative">
            <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full overflow-hidden relative">{!hideAmbilight && spread.left && <ReaderImage file={spread.left} isBackground={true} />}</div>
                <div className="w-1/2 h-full overflow-hidden relative">{!hideAmbilight && spread.right && <ReaderImage file={spread.right} isBackground={true} />}</div>
            </div>
            <div ref={leftRef} className={`page-wrapper-left gpu-accelerated ${animLeftClass}`} style={{ willChange: 'transform, filter' }}>
                {spread.left ? <ReaderImage file={spread.left} className="img-left" /> : <div className="w-full h-full bg-black"></div>}
            </div>
            <div ref={rightRef} className={`page-wrapper-right gpu-accelerated ${animRightClass}`} style={{ willChange: 'transform, filter' }}>
                {spread.right ? <ReaderImage file={spread.right} className="img-right" /> : <div className="w-full h-full bg-black"></div>}
            </div>
        </div>
    );
});

const ReaderView = memo(({
    isNightMode, setIsNightMode, isExitingReader, zenMode, setZenMode, handleCloseReader,
    toggleFullscreen, toggleBookmark, currentManga, cursor, handleSetCursor, edgeGlow, currentPages,
    allSpreads, isLandscape, prevCursor, slideDir, handleWheel, showNextChapterOverlay,
    setShowNextChapterOverlay, nextChapter, saveProgress, setCurrentManga, setCursor, markAsRead,
    toggleDisplayMode, showSpine, toggleSpine
}) => {
    
    const [currentTime, setCurrentTime] = useState("");
    useEffect(() => {
        const updateClock = () => { setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); };
        updateClock(); const timer = setInterval(updateClock, 30000); return () => clearInterval(timer);
    }, []);

    const [previewCursor, setPreviewCursor] = useState(cursor);
    const deferredPreviewCursor = React.useDeferredValue(previewCursor);
    const [isSliderActive, setIsSliderActive] = useState(false);

    const [dragState, setDragState] = useState({ active: false, dir: null, targetCursor: null, snapping: false });
    const dragData = useRef({ startX: 0, diffX: 0, progress: 0 });
    const activeRefs = useRef({ single: null, left: null, right: null });
    const dragRaf = useRef(null);

    const setSingleRef = React.useCallback(el => { activeRefs.current.single = el; }, []);
    const setLeftRef = React.useCallback(el => { activeRefs.current.left = el; }, []);
    const setRightRef = React.useCallback(el => { activeRefs.current.right = el; }, []);

    const applyPhysicalStyles = React.useCallback((p, dir, isSnapping = false) => {
        const isRTL = currentManga?.direction === 'rtl';
        const trans = isSnapping ? 'transform 0.4s cubic-bezier(0.15, 0.9, 0.3, 1), filter 0.4s' : 'none';
        const filterStyle = `brightness(${1 - Math.sin(p * Math.PI) * 0.4})`;
        
        let sAngle = 0, sOrigin = 'center', side = null;
        if (isRTL) {
            if (dir === 'next') { sAngle = -90+(p*90); sOrigin = 'left center';  side = 'right'; }
            if (dir === 'prev') { sAngle =  90-(p*90); sOrigin = 'right center'; side = 'left';  }
        } else {
            if (dir === 'next') { sAngle =  90-(p*90); sOrigin = 'right center'; side = 'left';  }
            if (dir === 'prev') { sAngle = -90+(p*90); sOrigin = 'left center';  side = 'right'; }
        }
        
        const mkFace = (el, angle, origin) => {
            if (!el) return;
            el.style.transform = `perspective(2000px) rotateY(${angle}deg)`;
            el.style.transformOrigin = origin;
            el.style.transition = trans;
            el.style.filter = filterStyle;
        };

        if (activeRefs.current.single) mkFace(activeRefs.current.single, sAngle, sOrigin);
        if (activeRefs.current.left) {
            if (side === 'left') mkFace(activeRefs.current.left, sAngle, sOrigin);
            else { activeRefs.current.left.style.transform = ''; activeRefs.current.left.style.filter = ''; }
        }
        if (activeRefs.current.right) {
            if (side === 'right') mkFace(activeRefs.current.right, sAngle, sOrigin);
            else { activeRefs.current.right.style.transform = ''; activeRefs.current.right.style.filter = ''; }
        }
    }, [currentManga]);

    const handlePointerDown = (e) => {
        if (showNextChapterOverlay || prevCursor !== null) return;
        if (e.button && e.button !== 0) return;
        if (e.target.tagName?.toLowerCase() === 'input' || e.target.closest('button')) return;
        if (window.visualViewport && window.visualViewport.scale > 1.05) return;
        if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
        dragData.current = { startX: e.clientX, diffX: 0, progress: 0 };
        setDragState({ active: true, dir: null, targetCursor: null, snapping: false });
    };

    const handlePointerMove = (e) => {
        if (!dragState.active || !allSpreads || (window.visualViewport && window.visualViewport.scale > 1.05)) return;
        const clientX = e.clientX; const isRTL = currentManga?.direction === 'rtl';
        if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
        dragRaf.current = requestAnimationFrame(() => {
            const diffX = clientX - dragData.current.startX; let dir = null;
            if (diffX > 5) dir = isRTL ? 'next' : 'prev'; else if (diffX < -5) dir = isRTL ? 'prev' : 'next';
            let targetCursor = null; if (dir === 'next') targetCursor = cursor + 1; if (dir === 'prev') targetCursor = cursor - 1;
            let progress = 0;
            if (targetCursor !== null && targetCursor >= 0 && targetCursor < allSpreads.length) progress = Math.min(1, Math.abs(diffX) / (window.innerWidth * 0.5));
            else progress = Math.min(0.15, Math.abs(diffX) / (window.innerWidth * 3)); 
            
            dragData.current.diffX = diffX;
            dragData.current.progress = progress;

            if (dragState.dir !== dir || dragState.targetCursor !== targetCursor) {
                setDragState(prev => ({ ...prev, dir, targetCursor }));
            }
            applyPhysicalStyles(progress, dir, false);
        });
    };

    const DRAG_RESET = { active: false, dir: null, targetCursor: null, snapping: false };
    const handlePointerUp = (e) => {
        if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
        if (!dragState.active || !allSpreads) return;
        if (e.target.hasPointerCapture?.(e.pointerId)) e.target.releasePointerCapture(e.pointerId);

        const { diffX, progress, startX } = dragData.current;
        const { targetCursor, dir } = dragState;

        if (Math.abs(diffX) < 10) {
            setDragState(DRAG_RESET);
            const x = startX, w = window.innerWidth;
            if (x > w*0.30 && x < w*0.70) { setZenMode(!zenMode); return; }
            const isRTL = currentManga?.direction === 'rtl';
            const goRight = x >= w*0.70, goLeft = x <= w*0.30;
            const goNext = goRight ? !isRTL : goLeft ? isRTL : false;
            const goPrev = goRight ? isRTL : goLeft ? !isRTL : false;
            const side = goRight ? 'right' : 'left';
            if (goNext) { if (cursor < allSpreads.length - 1) handleSetCursor(cursor + 1, side); else { setShowNextChapterOverlay(true); triggerHaptic([50, 100, 50]); } }
            else if (goPrev) { if (showNextChapterOverlay) setShowNextChapterOverlay(false); else if (cursor > 0) handleSetCursor(cursor - 1, side); }
            return;
        }

        if (progress > 0.20 && targetCursor !== null && targetCursor >= 0 && targetCursor < allSpreads.length) {
            triggerHaptic(30);
            setDragState(prev => ({ ...prev, active: false, snapping: true }));
            applyPhysicalStyles(1, dir, true);
            setTimeout(() => {
                setCursor(targetCursor);
                if (currentManga && allSpreads) saveProgress(currentManga.id, targetCursor, targetCursor >= allSpreads.length - 1, allSpreads.length);
                setDragState(DRAG_RESET);
            }, 400);
        } else {
            if (targetCursor !== null && targetCursor >= allSpreads.length && progress > 0.1) { setShowNextChapterOverlay(true); triggerHaptic([50, 100, 50]); }
            setDragState(prev => ({ ...prev, active: false, snapping: true }));
            applyPhysicalStyles(0, dir, true);
            setTimeout(() => setDragState(DRAG_RESET), 400);
        }
    };

    useEffect(() => {
        if (!isSliderActive) setPreviewCursor(cursor);
    }, [cursor, isSliderActive]);

    const maxVal = Math.max(0, allSpreads.length - 1);
    const percent = maxVal > 0 ? (previewCursor / maxVal) * 100 : 0;
    
    const isPhysicalAnimating = dragState.active || dragState.snapping;

    return (
        <div 
            className={`reader-viewport overflow-hidden gpu-accelerated animate-reader-enter transition-[transform,opacity] duration-[400ms] ${isNightMode ? 'night-mode-active' : ''} ${isExitingReader ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}
        >
            <div className={`reader-ui-top ${zenMode ? 'opacity-0 pointer-events-none -translate-y-full' : 'opacity-100 translate-y-0'} flex items-center justify-between w-full px-4 md:px-8 mx-auto`}>
                <button onClick={handleCloseReader} className="bg-black/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl text-theme-400 active:scale-95 transition flex items-center justify-center border border-theme-600/40 shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] hover:text-theme-300 hover:bg-theme-900/30"><IconChevronLeft width="24" height="24" /></button>
                
                <div className="absolute left-1/2 -translate-x-1/2 px-5 py-2 bg-black/60 backdrop-blur-md rounded-full border border-theme-600/30 text-[10px] sm:text-xs font-black tracking-widest text-white/80 pointer-events-none shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    {currentTime}
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={toggleDisplayMode} className="bg-black/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl active:scale-95 transition flex items-center justify-center border border-theme-600/40 shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] text-theme-400 hover:text-theme-300 hover:bg-theme-900/30" title={isLandscape ? "Forcer Page Simple" : "Forcer Double Page"}>
                        {isLandscape ? <IconSinglePage width="24" height="24" /> : <IconDoublePage width="24" height="24" />}
                    </button>

                    {isLandscape && (
                        <button onClick={(e) => { e.stopPropagation(); toggleSpine(); }} className={`bg-black/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl active:scale-95 transition flex items-center justify-center border shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] ${showSpine ? 'text-theme-400 border-theme-600/40 hover:text-theme-300 hover:bg-theme-900/30' : 'text-theme-300 border-theme-400 bg-theme-900/40'}`} title={showSpine ? "Masquer l'ombre de reliure" : "Afficher l'ombre de reliure"}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="3" x2="12" y2="21"/>
                                {showSpine ? <><path d="M8 5 Q12 9 8 13 Q12 17 8 21"/><path d="M16 5 Q12 9 16 13 Q12 17 16 21"/></> : <><path d="M9 3 L9 21"/><path d="M15 3 L15 21"/></>}
                            </svg>
                        </button>
                    )}

                    <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="flex bg-black/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl active:scale-95 transition items-center justify-center border border-theme-600/40 shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] text-theme-400 hover:text-theme-300 hover:bg-theme-900/30" title="Plein Écran (F)">
                        <IconMaximize width="24" height="24" />
                    </button>

                    <button onClick={toggleBookmark} className={`bg-black/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl active:scale-95 transition flex items-center justify-center border shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] ${currentManga?.bookmark === cursor ? 'text-theme-300 border-theme-400 bg-theme-900/40' : 'text-theme-400 border-theme-600/40 hover:text-theme-300 hover:bg-theme-900/30'}`} title={currentManga?.bookmark === cursor ? "Retirer le marque-page" : "Placer un marque-page ici"}>
                        {currentManga?.bookmark === cursor ? <IconBookmarkFilled width="24" height="24" /> : <IconBookmarkOutline width="24" height="24" />}
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); setIsNightMode(prev => !prev); }} className={`bg-black/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl active:scale-95 transition flex items-center justify-center border shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] ${isNightMode ? 'text-amber-300 border-amber-600/60 bg-amber-900/30' : 'text-theme-400 border-theme-600/40 hover:text-theme-300 hover:bg-theme-900/30'}`} title="Confort des yeux (Sépia)">
                        {isNightMode ? <IconMoon width="24" height="24" /> : <IconSun width="24" height="24" />}
                    </button>
                </div>
            </div>

            {edgeGlow === 'left' && <div className="absolute top-0 bottom-0 w-32 z-[140] pointer-events-none animate-edge-glow-left"></div>}
            {edgeGlow === 'right' && <div className="absolute top-0 bottom-0 w-32 z-[140] pointer-events-none animate-edge-glow-right"></div>}

            <div className="w-full h-full flex justify-center items-center overflow-hidden relative" style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
            >
                {currentPages.length === 0 && currentManga ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-theme-900/40"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-theme-400 animate-spin" style={{ filter: 'drop-shadow(0 0 8px rgba(var(--theme-rgb),0.8))' }}></div>
                            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-theme-600 animate-spin" style={{ animationDuration: '0.6s', animationDirection: 'reverse' }}></div>
                        </div>
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest animate-pulse">Chargement...</span>
                    </div>
                ) : (
                    <>
                        <div className="absolute inset-0 z-10 flex justify-center items-center gpu-accelerated pointer-events-none">
                            <SpreadDisplay spread={allSpreads[cursor]} manga={currentManga} isLandscape={isLandscape} hideAmbilight={false} />
                        </div>

                        {prevCursor !== null && !isPhysicalAnimating && (
                            <div className="absolute inset-0 z-20 flex justify-center items-center gpu-accelerated pointer-events-none">
                                <SpreadDisplay spread={allSpreads[prevCursor]} manga={currentManga} isLandscape={isLandscape} hideAmbilight={true} />
                            </div>
                        )}

                        {prevCursor !== null && !isPhysicalAnimating && (
                            <div key={`enter-${cursor}`} className={`absolute inset-0 z-30 flex justify-center items-center gpu-accelerated pointer-events-none ${
                                allSpreads[cursor]?.center && !isLandscape
                                    ? (currentManga?.direction === 'rtl' ? (slideDir === 'next' ? 'animate-enter-next-rtl' : 'animate-enter-prev-rtl') : (slideDir === 'next' ? 'animate-enter-next-ltr' : 'animate-enter-prev-ltr'))
                                    : '' 
                            }`}>
                                <SpreadDisplay spread={allSpreads[cursor]} manga={currentManga} isAnimating={true} slideDir={slideDir} isLandscape={isLandscape} hideAmbilight={true} />
                            </div>
                        )}

                        {isPhysicalAnimating && dragState.targetCursor !== null && (
                            <div className="absolute inset-0 z-40 flex justify-center items-center gpu-accelerated pointer-events-none">
                                <SpreadDisplay 
                                    spread={allSpreads[dragState.targetCursor]} 
                                    manga={currentManga} 
                                    isLandscape={isLandscape} 
                                    hideAmbilight={true} 
                                    singleRef={setSingleRef}
                                    leftRef={setLeftRef}
                                    rightRef={setRightRef}
                                />
                            </div>
                        )}

                        {isLandscape && showSpine && allSpreads.length > 0 && allSpreads[cursor]?.left && allSpreads[cursor]?.right && (
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 bg-gradient-to-r from-transparent via-black/60 to-transparent pointer-events-none z-50 mix-blend-multiply"></div>
                        )}
                    </>
                )}
            </div>

            {showNextChapterOverlay && (
                <div className="absolute inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-6 animate-fade" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest mb-4" style={{ textShadow: '0 0 20px rgba(var(--theme-rgb),0.8)' }}>Chapitre Terminé</h2>
                    {nextChapter ? (
                        <div className="animate-in w-full max-w-lg flex flex-col items-center">
                            <div className="bg-black/80 border border-theme-600/40 shadow-[0_0_40px_rgba(var(--theme-rgb),0.3)] rounded-3xl p-6 w-full mb-8 flex items-center gap-6">
                            <div className="w-24 h-36 bg-black rounded-xl overflow-hidden flex-none shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] border border-theme-600/50"><StackThumbnail file={nextChapter.coverStart || nextChapter.coverDouble || nextChapter.cover} contain={nextChapter.isDoubleCover || !!nextChapter.coverDouble} /></div>
                            <div className="flex-1 overflow-hidden"><span className="text-xs text-theme-400 font-black uppercase tracking-widest block mb-2" style={{ textShadow: '0 0 10px rgba(var(--theme-rgb),0.8)' }}>{currentManga?.group ? 'Suite de la Pile' : 'Suivant'}</span><h3 className="text-xl md:text-2xl text-white font-black truncate">{nextChapter.title}</h3></div>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button onClick={() => { handleCloseReader(); setShowNextChapterOverlay(false); }} className="flex-1 py-5 bg-black text-theme-400 border border-theme-600/40 font-black text-xs rounded-2xl uppercase transition hover:bg-theme-950/30 hover:border-theme-500">Bibliothèque</button>
                            <button onClick={() => { if (currentManga && allSpreads) saveProgress(currentManga.id, cursor, true, allSpreads.length); setCurrentManga(nextChapter); setCursor(nextChapter.bookmark != null ? nextChapter.bookmark : 0); markAsRead(nextChapter); setShowNextChapterOverlay(false); }} className="flex-[2] py-5 bg-theme-600 text-white font-black text-sm rounded-2xl uppercase transition shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] hover:scale-105">Lancer la suite</button>
                        </div>
                    </div>
                ) : (
                        <div className="flex flex-col items-center gap-8 mt-6 w-full max-w-sm animate-in">
                            <p className="text-theme-300/80 text-lg text-center font-bold">{currentManga?.group ? 'Vous avez terminé cette série pour le moment.' : 'Vous avez atteint la fin de la lecture de la sélection.'}</p>
                            <button onClick={() => { handleCloseReader(); setShowNextChapterOverlay(false); }} className="w-full py-5 bg-theme-600/20 text-theme-300 border border-theme-500 font-black text-xs rounded-2xl uppercase transition shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)]">Retour à la bibliothèque</button>
                        </div>
                    )}
                </div>
            )}

            <div className={`reader-ui-bottom ${zenMode ? 'opacity-0 pointer-events-none translate-y-full' : 'opacity-100 translate-y-0'} pb-[max(25px,env(safe-area-inset-bottom))]`} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <div className="bg-black/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-theme-600/40 flex flex-col items-center shadow-[0_0_40px_rgba(var(--theme-rgb),0.3)] w-full max-w-4xl gap-3 sm:gap-4 relative">
                    
                    <div className="flex justify-between items-center w-full px-3 mb-1">
                        <span className="text-xs sm:text-sm text-theme-400 font-bold">{cursor + 1}</span>
                        <span className="text-xs sm:text-sm font-black text-white uppercase tracking-widest" style={{ textShadow: '0 0 10px rgba(var(--theme-rgb),0.8)' }}>{allSpreads[cursor]?.info}</span>
                        <span className="text-xs sm:text-sm text-theme-400 font-bold">{allSpreads.length}</span>
                    </div>

                    <div className="relative w-full h-8 flex items-center">
                        <div className={`absolute bottom-full mb-3 -translate-x-1/2 transition-all duration-200 pointer-events-none z-[160] flex flex-col items-center w-max ${isSliderActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
                             style={{ left: `calc(${percent}% + (${12 - percent * 0.24}px))` }}>

                             <div className="bg-black/90 backdrop-blur-sm text-theme-100 text-[10px] font-black px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)] border border-theme-500/50 whitespace-nowrap mb-2 transform -translate-y-1 drop-shadow-lg">
                                 {allSpreads[deferredPreviewCursor]?.info}
                             </div>

                             <div className="bg-slate-900/95 backdrop-blur-xl border-[2px] border-theme-500/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(var(--theme-rgb),0.5)] overflow-hidden h-32 sm:h-48 aspect-auto min-w-[80px] sm:min-w-[120px] flex items-center justify-center p-1 relative">
                                 <div className="w-full h-full relative flex items-center justify-center bg-transparent rounded-xl overflow-hidden">
                                    {allSpreads[deferredPreviewCursor] && (
                                        allSpreads[deferredPreviewCursor].center ? (
                                            <StackThumbnail file={allSpreads[deferredPreviewCursor].center} contain={true} />
                                        ) : (
                                            <div className="flex w-full h-full bg-theme-900/50">
                                                <div className="w-1/2 h-full relative"><StackThumbnail file={allSpreads[deferredPreviewCursor].left} contain={true} className="object-right" /></div>
                                                <div className="w-1/2 h-full relative -ml-[1px]"><StackThumbnail file={allSpreads[deferredPreviewCursor].right} contain={true} className="object-left" /></div>
                                            </div>
                                        )
                                    )}
                                 </div>
                             </div>

                             <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-theme-500/80 mt-[-2px]"></div>
                        </div>

                        <input type="range" min="0" max={maxVal} value={previewCursor}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                            onPointerDown={(e) => { e.stopPropagation(); setIsSliderActive(true); }}
                            onPointerUp={(e) => { e.stopPropagation(); setIsSliderActive(false); const val = Number(e.target.value); if (val !== cursor) handleSetCursor(val); }}
                            onChange={(e) => setPreviewCursor(Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-range z-10 relative"
                            style={{ touchAction: 'none', '--range-pct': `${percent}%` }}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
});

export default ReaderView;