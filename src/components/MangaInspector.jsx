import React, { useState, useEffect, useRef, useCallback, memo, useLayoutEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconReverse, IconPlay, IconSettings } from './Icons';
import { getCachedUrl, MANGA_PROPS } from '../utils';

const StackThumbnail = memo(({ file, contain = false, className = "" }) => {
    const url = getCachedUrl(file);
    return url ? <img src={url} loading="lazy" decoding="async" className={`w-full h-full gpu-accelerated ${contain ? 'object-contain' : 'object-cover'} ${className}`} /> : null;
});

const MangaInspector = memo(({ manga, onClose, onRead, isAnimatingOut, onOpenMenu, onPrev, onNext, hasPrev, hasNext, inspectingCoords }) => {
    if (!manga) return null;

    const [globalScale, setGlobalScale] = useState(1);
    useEffect(() => {
        const updateScale = () => {
            const w = window.innerWidth, h = window.innerHeight;
            let s = Math.min(1, w / 600, h / 850);
            if (w > h && h < 500) s *= 0.85;
            setGlobalScale(s);
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const scale = 1.4;

    const isDouble = !!manga.coverDouble;
    const isRTL = manga.direction === 'rtl';
    const mainCover = manga.coverDouble || manga.coverStart || manga.cover;
    const coverUrl = getCachedUrl(mainCover);

    const bw = MANGA_PROPS.faceW;
    const bh = MANGA_PROPS.h;
    const bd = MANGA_PROPS.spineW;

    const wrapTotalW = (bw * 2) + bd;
    const bgSizeFrontBack = `${(wrapTotalW / bw) * 100}% 100%`;
    const bgSizeSpine = `${(wrapTotalW / bd) * 100}% 100%`;
    
    const bgPosFront = isRTL ? '0% 50%' : '100% 50%';
    const bgPosBack = isRTL ? '100% 50%' : '0% 50%';
    const bgPosSpine = '50% 50%';

    const spineIsRight = isRTL;

    // --- LOGIQUE INTERACTION 3D ---
    const [rotY, setRotY] = useState(isRTL ? -15 : 15);
    const [rotX, setRotX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [autoSpin, setAutoSpin] = useState(true);
    const [spinDirection, setSpinDirection] = useState(isRTL ? -1 : 1);
    const [isOpening, setIsOpening] = useState(false);
    
    const bookContainerRef = useRef(null);
    const uiRef = useRef(null);
    const [isClosing, setIsClosing] = useState(false);

    const dragInfo = useRef({ startX: 0, startY: 0, initRotY: 0, initRotX: 0, hasDragged: false });
    const spinTimeoutRef = useRef(null);

    // CORRECTION: Réinitialiser l'état quand le manga change (Tomb Raider)
    useEffect(() => {
        setRotY(isRTL ? -15 : 15);
        setRotX(0);
        setIsOpening(false);
        setAutoSpin(true);
    }, [manga.id, isRTL]);

    useEffect(() => {
        if (!autoSpin) return;
        let animationFrameId;
        let lastTime = performance.now();
        const speedPerMs = (360 / 16000) * spinDirection; 
        
        const animate = (time) => {
            const delta = time - lastTime;
            lastTime = time;
            setRotY(prev => prev + (delta * speedPerMs));
            animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [autoSpin, spinDirection]);

    const onPointerDown = (e) => {
        setAutoSpin(false); 
        if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
        setIsDragging(true);
        dragInfo.current = { startX: e.clientX, startY: e.clientY, initRotY: rotY, initRotX: rotX, hasDragged: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragInfo.current.startX;
        const deltaY = e.clientY - dragInfo.current.startY;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) dragInfo.current.hasDragged = true;
        
        setRotY(dragInfo.current.initRotY + deltaX * 0.6);
        setRotX(Math.max(-60, Math.min(60, dragInfo.current.initRotX - deltaY * 0.6))); 
    };

    const onPointerUp = (e) => {
        setIsDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = setTimeout(() => setAutoSpin(true), 1500);
    };

    // 📖 OPTION 2 : L'OUVERTURE PHYSIQUE
    const handleReadClick = (e) => {
        if (e) e.stopPropagation();
        if (dragInfo.current && dragInfo.current.hasDragged) { dragInfo.current.hasDragged = false; return; }
        if (isOpening) return;

        setAutoSpin(false);
        setRotX(5); 
        setRotY(spineIsRight ? 25 : -25); 
        setIsOpening(true);

        if (typeof window.triggerHaptic === 'function') window.triggerHaptic(50);

        // CORRECTION : On passe "null" pour l'évenement, et "true" pour skipAnimation !
        setTimeout(() => {
            onRead(manga, null, true);
        }, 800);
    };

    // 🪃 LE BOOMERANG (Tomb Raider -> Bibliothèque)
    const handleClose = useCallback((e) => {
        if (e) e.stopPropagation();
        if (isClosing) return; 
        
        setIsClosing(true);

        if (inspectingCoords && bookContainerRef.current && uiRef.current) {
            const targetCenterX = inspectingCoords.left + (inspectingCoords.width / 2);
            const targetCenterY = inspectingCoords.top + (inspectingCoords.height / 2);
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            
            const moveX = (targetCenterX - screenCenterX) / globalScale;
            const moveY = (targetCenterY - screenCenterY) / globalScale;
            
            const bookVisualWidth = MANGA_PROPS.faceW * globalScale * scale;
            const targetScale = inspectingCoords.width / bookVisualWidth;

            uiRef.current.style.transition = 'opacity 0.2s ease';
            uiRef.current.style.opacity = '0'; 

            bookContainerRef.current.style.transformOrigin = 'center center';
            bookContainerRef.current.style.transition = 'transform 0.4s cubic-bezier(0.5, 0, 0.75, 0)'; 
            bookContainerRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${targetScale})`;
        }

        setTimeout(() => {
            onClose();
        }, 400);
    }, [isClosing, inspectingCoords, globalScale, scale, onClose]);

    // ✨ L'ENTRÉE MAGIQUE (Bibliothèque -> Tomb Raider)
    useLayoutEffect(() => {
        if (!inspectingCoords || !bookContainerRef.current || !uiRef.current) return;

        const targetWidth = MANGA_PROPS.faceW * globalScale * scale;
        const targetHeight = MANGA_PROPS.h * globalScale * scale;
        const targetLeft = (window.innerWidth - targetWidth) / 2;
        const targetTop = (window.innerHeight - targetHeight) / 2;

        const deltaX = inspectingCoords.left - targetLeft;
        const deltaY = inspectingCoords.top - targetTop;
        const deltaScale = inspectingCoords.width / targetWidth;

        bookContainerRef.current.style.transition = 'none';
        bookContainerRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaScale})`;
        uiRef.current.style.transition = 'none';
        uiRef.current.style.opacity = '0';

        bookContainerRef.current.offsetHeight;

        requestAnimationFrame(() => {
            if (!bookContainerRef.current || !uiRef.current) return;
            bookContainerRef.current.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            bookContainerRef.current.style.transform = 'translate(0, 0) scale(1)';
            
            uiRef.current.style.transition = 'opacity 0.4s ease 0.2s';
            uiRef.current.style.opacity = '1';
        });
    }, [inspectingCoords, globalScale, scale]);

    // --- ANIMATION STYLE TOMB RAIDER (SLIDE 3D) ---
    const [trState, setTrState] = useState('idle');

    // CORRECTION : On attend que le manga.id change pour déclencher l'animation d'entrée
    useLayoutEffect(() => {
        setTrState(prev => {
            if (prev === 'leaving-next') return 'entering-next';
            if (prev === 'leaving-prev') return 'entering-prev';
            return prev;
        });
    }, [manga.id]);

    useLayoutEffect(() => {
        if (trState.startsWith('entering-')) {
            let f2;
            const f1 = requestAnimationFrame(() => {
                f2 = requestAnimationFrame(() => setTrState('idle'));
            });
            return () => { cancelAnimationFrame(f1); cancelAnimationFrame(f2); };
        }
    }, [trState]);

    const handlePrev = useCallback((e) => {
        e.stopPropagation();
        if (!hasPrev || trState !== 'idle') return;
        setTrState('leaving-prev');
        setTimeout(() => onPrev(), 300);
    }, [hasPrev, onPrev, trState]);

    const handleNext = useCallback((e) => {
        e.stopPropagation();
        if (!hasNext || trState !== 'idle') return;
        setTrState('leaving-next');
        setTimeout(() => onNext(), 300);
    }, [hasNext, onNext, trState]);

    let trStyle = { transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease', transform: 'translateX(0) translateZ(0) scale(1) rotateY(0deg)', opacity: 1 };
    if (trState === 'leaving-next') trStyle = { transition: 'transform 0.3s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.3s ease', transform: 'translateX(-40vw) translateZ(-600px) scale(0.6) rotateY(60deg)', opacity: 0 };
    else if (trState === 'entering-next') trStyle = { transition: 'none', transform: 'translateX(40vw) translateZ(-600px) scale(0.6) rotateY(-60deg)', opacity: 0 };
    else if (trState === 'leaving-prev') trStyle = { transition: 'transform 0.3s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.3s ease', transform: 'translateX(40vw) translateZ(-600px) scale(0.6) rotateY(-60deg)', opacity: 0 };
    else if (trState === 'entering-prev') trStyle = { transition: 'none', transform: 'translateX(-40vw) translateZ(-600px) scale(0.6) rotateY(60deg)', opacity: 0 };

    return (
        <div className={`fixed inset-0 z-[1500] flex items-center justify-center transition-all duration-400 ${isAnimatingOut ? 'opacity-0 pointer-events-none' : 'animate-fade'} ${isClosing ? 'bg-transparent backdrop-blur-none' : 'bg-black/80 backdrop-blur-xl'}`} onClick={handleClose}>
            
            <div className={`absolute inset-0 bg-black z-[2000] pointer-events-none transition-opacity ease-in ${isOpening ? 'opacity-100 duration-300 delay-500' : 'opacity-0 duration-500'}`}></div>

            <button onClick={handlePrev} disabled={!hasPrev} className={`absolute left-2 sm:left-8 md:left-12 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-md border transition-all z-[1600] ${isOpening ? 'opacity-0 pointer-events-none' : ''} ${hasPrev ? 'bg-black/50 hover:bg-theme-600/80 text-white border-white/10 hover:border-theme-400 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] cursor-pointer active:scale-95' : 'bg-black/20 text-white/20 border-white/5 shadow-none cursor-not-allowed opacity-50'}`}>
                <IconChevronLeft width="32" height="32" />
            </button>
            <button onClick={handleNext} disabled={!hasNext} className={`absolute right-2 sm:right-8 md:right-12 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-md border transition-all z-[1600] ${isOpening ? 'opacity-0 pointer-events-none' : ''} ${hasNext ? 'bg-black/50 hover:bg-theme-600/80 text-white border-white/10 hover:border-theme-400 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] cursor-pointer active:scale-95' : 'bg-black/20 text-white/20 border-white/5 shadow-none cursor-not-allowed opacity-50'}`}>
                <IconChevronRight width="32" height="32" />
            </button>

            <div className="relative flex items-center justify-center pointer-events-none" style={{ width: '600px', height: '850px', transform: `scale(${globalScale})`, transformOrigin: 'center center' }}>
                
                <div className="relative flex flex-col items-center justify-center w-full px-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <div style={{ perspective: '2000px' }} className="flex justify-center items-center z-[1900] h-[520px] w-full mt-4">
                        <div style={{ ...trStyle, transformStyle: 'preserve-3d' }}>
                            
                            <div ref={bookContainerRef} className="origin-center flex justify-center items-center">
                                <div id="inspect-book-container" className="relative cursor-grab active:cursor-grabbing group touch-none" 
                                    style={{ 
                                        width: `${bw}px`, height: `${bh}px`, 
                                        animation: 'artifactFloat 6s ease-in-out infinite',
                                        animationPlayState: isOpening ? 'paused' : 'running',
                                        transformStyle: 'preserve-3d', 
                                        transform: `scale(${isOpening ? 4 : scale}) translateY(${isOpening ? '10%' : '0px'})`,
                                        transition: isOpening ? 'transform 0.8s cubic-bezier(0.6, 0.05, 0.15, 0.95)' : 'none'
                                    }} 
                                    onClick={handleReadClick}
                                    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                                    
                                    <div className="w-full h-full relative" style={{ 
                                        transformStyle: 'preserve-3d', 
                                        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                                        transition: isOpening ? 'transform 0.4s ease-out' : 'none' 
                                    }}>
                                        
                                        <div className="absolute inset-0 z-10" style={{ 
                                            transformOrigin: spineIsRight ? 'right center' : 'left center',
                                            transform: `translateZ(${bd/2}px) ${isOpening ? `rotateY(${spineIsRight ? 110 : -110}deg)` : ''}`,
                                            transition: isOpening ? 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1) 0.1s' : 'none',
                                            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' 
                                        }}>
                                            {isDouble ? (
                                                <div className="w-full h-full bg-black" style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: bgSizeFrontBack, backgroundPosition: bgPosFront }}></div>
                                            ) : (
                                                <div className="w-full h-full bg-black"><StackThumbnail file={manga.coverStart || manga.cover} /></div>
                                            )}
                                        </div>

                                        <div className="absolute inset-0 bg-[#f9f9f9] border border-black/5" style={{ 
                                            transform: `translateZ(${(bd/2) - 1}px)`,
                                            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' 
                                        }}>
                                            <div className={`absolute inset-y-0 w-8 ${spineIsRight ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/15 to-transparent`}></div>
                                            <div className="w-full h-full flex items-center justify-center opacity-5">
                                                <span className="font-black text-2xl rotate-45">MangaHub</span>
                                            </div>
                                        </div>

                                        <div className="absolute inset-0" style={{ transform: `translateZ(${-bd/2}px) rotateY(180deg)`, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                                            {isDouble ? (
                                                <div className="w-full h-full bg-black" style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: bgSizeFrontBack, backgroundPosition: bgPosBack }}></div>
                                            ) : (
                                                <div className="w-full h-full bg-black"><StackThumbnail file={manga.coverEnd || manga.coverStart || manga.cover} /></div>
                                            )}
                                        </div>

                                        <div className="absolute inset-y-0 bg-[#0f172a]" style={{ width: `${bd}px`, left: spineIsRight ? 'auto' : 0, right: spineIsRight ? 0 : 'auto', transform: `translateX(${spineIsRight ? bd/2 : -bd/2}px) rotateY(${spineIsRight ? 90 : -90}deg)` }}>
                                            {isDouble ? (
                                                <div className="w-full h-full" style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: bgSizeSpine, backgroundPosition: bgPosSpine }}></div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center border-l border-white/20 border-r border-black/80">
                                                    <span className="text-white font-black text-[12px] uppercase tracking-widest whitespace-nowrap" style={{ transform: 'rotate(90deg)' }}>{manga.title}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute inset-y-0 bg-[#e8e4db]" style={{ width: `${bd}px`, left: spineIsRight ? 0 : 'auto', right: spineIsRight ? 'auto' : 0, transform: `translateX(${spineIsRight ? -bd/2 : bd/2}px) rotateY(${spineIsRight ? -90 : 90}deg)` }}>
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjMiPjxwYXRoIGQ9Ik0wLDBIMVYzSDBaIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>
                                        </div>
                                        <div className="absolute left-0 right-0 bg-[#e8e4db]" style={{ height: `${bd}px`, top: 0, transform: `translateY(${-bd/2}px) rotateX(90deg)` }}>
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjMiPjxwYXRoIGQ9Ik0wLDBIM1YxSDBaIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>
                                        </div>
                                        <div className="absolute left-0 right-0 bg-[#e8e4db]" style={{ height: `${bd}px`, bottom: 0, transform: `translateY(${bd/2}px) rotateX(-90deg)` }}>
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjMiPjxwYXRoIGQ9Ik0wLDBIM1YxSDBaIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={uiRef} className={`flex flex-col items-center gap-6 w-full max-w-lg z-30 mt-6 transition-opacity ${isOpening ? 'opacity-0 duration-150 pointer-events-none' : 'opacity-100'}`}>
                        <div className="text-center px-4 w-full">
                            <span className="text-theme-400 font-black uppercase tracking-widest text-xs mb-2 block drop-shadow-md">
                                {manga.group || "Volume Indépendant"}
                            </span>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(var(--theme-rgb),0.8)] line-clamp-2 w-full">
                                {manga.title}
                            </h2>
                            {manga.bookmark != null && (
                                <span className="inline-block mt-4 bg-theme-600/30 border border-theme-500 text-theme-100 text-sm font-black px-5 py-2 rounded-full shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)]">
                                    Reprendre page {manga.bookmark + 1}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 w-full mt-4">
                            <button onClick={handleClose} className="flex-1 py-5 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-colors border border-white/10 active:scale-95">
                                Remettre
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setSpinDirection(d => d * -1); setAutoSpin(true); }} className="w-14 h-[60px] rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/10 active:scale-95 flex items-center justify-center flex-none" title="Inverser la rotation">
                                <IconReverse width="22" height="22" />
                            </button>
                            <button onClick={handleReadClick} className="flex-[2] py-5 rounded-2xl bg-theme-600 text-white font-black uppercase tracking-widest text-sm hover:bg-theme-500 transition-all shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),1)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-theme-400">
                                <IconPlay width="22" height="22" /> {manga.bookmark != null ? 'Continuer' : 'Ouvrir'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onOpenMenu(manga); }} className="w-14 h-[60px] rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/10 active:scale-95 flex items-center justify-center flex-none" title="Options du manga">
                                <IconSettings width="22" height="22" />
                            </button>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
});

export default MangaInspector;