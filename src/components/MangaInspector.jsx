import React, { useState, useEffect, useRef, useCallback, memo, useLayoutEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconReverse, IconPlay, IconSettings, IconFlag, IconAward } from './Icons';
import { getCachedUrl, MANGA_PROPS } from '../utils';
import { use3DBook } from '../use3DBook';
import StackThumbnail from './StackThumbnail';

const MangaInspector = memo(({ manga, onClose, onRead, isAnimatingOut, onOpenMenu, onPrev, onNext, hasPrev, hasNext, startClosing = false }) => {
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

    const bookContainerRef = useRef(null);
    const uiRef = useRef(null);
    const rotatingBookRef = useRef(null);

    const {
        rotY, rotX, isOpening, isClosing, isDragging,
        spinDirection, setSpinDirection, setAutoSpin,
        onPointerDown, onPointerMove, onPointerUp,
        handleReadClick, handleClose
    } = use3DBook({
        manga, onRead, onClose, startClosing,
        uiRef, bookContainerRef, rotatingBookRef
    });

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsMounted(true));
        return () => cancelAnimationFrame(frame);
    }, []);

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
        <div className={`fixed inset-0 z-[1500] flex items-center justify-center transition-all duration-[500ms] ease-out ${(isMounted && !isClosing && !isAnimatingOut) ? 'bg-black/80 backdrop-blur-xl' : 'bg-black/0 backdrop-blur-none'} ${isAnimatingOut || startClosing ? 'pointer-events-none' : ''}`} onClick={handleClose}>

            <div className={`absolute inset-0 bg-black z-[2000] pointer-events-none transition-opacity ease-in ${isOpening ? 'opacity-100 duration-300 delay-500' : 'opacity-0 duration-500'}`}></div>

            <button onClick={handlePrev} disabled={!hasPrev} className={`absolute left-2 sm:left-8 md:left-12 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-md border transition-all z-[2100] ${isOpening || isClosing ? 'opacity-0 pointer-events-none' : ''} ${hasPrev ? 'bg-black/50 hover:bg-theme-600/80 text-white border-white/10 hover:border-theme-400 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] cursor-pointer active:scale-95' : 'bg-black/20 text-white/20 border-white/5 shadow-none cursor-not-allowed opacity-50'}`}>
                <IconChevronLeft width="32" height="32" />
            </button>
            <button onClick={handleNext} disabled={!hasNext} className={`absolute right-2 sm:right-8 md:right-12 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-md border transition-all z-[2100] ${isOpening || isClosing ? 'opacity-0 pointer-events-none' : ''} ${hasNext ? 'bg-black/50 hover:bg-theme-600/80 text-white border-white/10 hover:border-theme-400 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] cursor-pointer active:scale-95' : 'bg-black/20 text-white/20 border-white/5 shadow-none cursor-not-allowed opacity-50'}`}>
                <IconChevronRight width="32" height="32" />
            </button>

            <div className="relative flex items-center justify-center pointer-events-none" style={{ width: '600px', height: '850px', transform: `scale(${globalScale})`, transformOrigin: 'center center' }}>

                <div className="relative flex flex-col items-center justify-center w-full px-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <div style={{
                        perspective: (isClosing || startClosing) ? '100000px' : '2000px',
                        transition: 'perspective 0.5s ease'
                    }} className="flex justify-center items-center z-[1900] h-[520px] w-full mt-4">
                        <div style={{ ...trStyle, transformStyle: 'preserve-3d' }}>

                            <div ref={bookContainerRef} className="origin-center flex justify-center items-center">
                                <div id="inspect-book-container" className="relative cursor-grab active:cursor-grabbing group touch-none"
                                    style={{
                                        width: `${bw}px`, height: `${bh}px`,
                                        animation: (isOpening || startClosing || isClosing) ? 'none' : 'artifactFloat 6s ease-in-out infinite',
                                        transformStyle: 'preserve-3d',
                                        transform: `scale(${isOpening ? 4 : scale}) translateY(${isOpening ? '10%' : '0px'})`,
                                        transition: isOpening ? 'transform 0.8s cubic-bezier(0.6, 0.05, 0.15, 0.95)' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                    onClick={handleReadClick}
                                    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>

                                    <div ref={rotatingBookRef} data-rot-y={rotY} className="w-full h-full relative" style={{
                                        transformStyle: 'preserve-3d',
                                        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                                        transition: isDragging ? 'none' : (isOpening ? 'transform 0.4s ease-out' : (isClosing ? 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'))
                                    }}>

                                        <div className="absolute inset-0 z-10" style={{
                                            transformOrigin: spineIsRight ? 'right center' : 'left center',
                                            transform: `translateZ(${bd / 2}px) ${isOpening ? `rotateY(${spineIsRight ? 110 : -110}deg)` : ''}`,
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
                                            transform: `translateZ(${(bd / 2) - 1}px)`,
                                            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden'
                                        }}>
                                            <div className={`absolute inset-y-0 w-8 ${spineIsRight ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/15 to-transparent`}></div>
                                            <div className="w-full h-full flex items-center justify-center opacity-5">
                                                <span className="font-black text-2xl rotate-45">MangaHub</span>
                                            </div>
                                        </div>

                                        <div className="absolute inset-0" style={{ transform: `translateZ(${-bd / 2}px) rotateY(180deg)`, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                                            {isDouble ? (
                                                <div className="w-full h-full bg-black" style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: bgSizeFrontBack, backgroundPosition: bgPosBack }}></div>
                                            ) : (
                                                <div className="w-full h-full bg-black"><StackThumbnail file={manga.coverEnd || manga.coverStart || manga.cover} /></div>
                                            )}
                                        </div>

                                        <div className="absolute inset-y-0 bg-[#0f172a]" style={{ width: `${bd}px`, left: spineIsRight ? 'auto' : 0, right: spineIsRight ? 0 : 'auto', transform: `translateX(${spineIsRight ? bd / 2 : -bd / 2}px) rotateY(${spineIsRight ? 90 : -90}deg)` }}>
                                            {isDouble ? (
                                                <div className="w-full h-full" style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: bgSizeSpine, backgroundPosition: bgPosSpine }}></div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center border-l border-l-white/20 border-r border-r-black/80">
                                                    <span className="text-white font-black text-[12px] uppercase tracking-widest whitespace-nowrap" style={{ transform: 'rotate(90deg)' }}>{manga.title}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute inset-y-0 bg-[#e8e4db]" style={{ width: `${bd}px`, left: spineIsRight ? 0 : 'auto', right: spineIsRight ? 'auto' : 0, transform: `translateX(${spineIsRight ? -bd / 2 : bd / 2}px) rotateY(${spineIsRight ? -90 : 90}deg)` }}>
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjMiPjxwYXRoIGQ9Ik0wLDBIMVYzSDBaIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>
                                        </div>
                                        <div className="absolute left-0 right-0 bg-[#e8e4db]" style={{ height: `${bd}px`, top: 0, transform: `translateY(${-bd / 2}px) rotateX(90deg)` }}>
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjMiPjxwYXRoIGQ9Ik0wLDBIM1YxSDBaIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>
                                        </div>
                                        <div className="absolute left-0 right-0 bg-[#e8e4db]" style={{ height: `${bd}px`, bottom: 0, transform: `translateY(${bd / 2}px) rotateX(-90deg)` }}>
                                            <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjMiPjxwYXRoIGQ9Ik0wLDBIM1YxSDBaIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={uiRef} className={`flex flex-col items-center gap-6 w-full max-w-lg z-[2100] mt-6 transition-opacity ${isOpening || startClosing ? 'opacity-0 duration-150 pointer-events-none' : 'opacity-100'}`}>
                        <div className="text-center px-4 w-full">
                            <span className="text-theme-400 font-black uppercase tracking-widest text-xs mb-2 block drop-shadow-md">
                                {manga.group || "Volume Indépendant"}
                            </span>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(var(--theme-rgb),0.8)] line-clamp-2 w-full">
                                {manga.title}
                            </h2>
                            {manga.artist && (
                                <span className="text-theme-200/70 font-bold text-sm mt-2 block drop-shadow-md">
                                    🎨 {manga.artist}
                                </span>
                            )}

                            {manga.chapters && manga.chapters.length > 0 && (
                                <div className="mt-6 w-full animate-in">
                                    <div className="flex items-center gap-2 mb-3 px-2">
                                        <IconFlag className="w-4 h-4 text-theme-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-400/80">Liste des Chapitres</span>
                                        <div className="h-px flex-1 bg-theme-600/20 ml-2"></div>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x no-scrollbar">
                                        {manga.chapters.map((ch, idx) => (
                                            <button
                                                key={idx}
                                                onClick={(e) => { e.stopPropagation(); onRead(manga, ch.startIndex); }}
                                                className="snap-start flex-none flex flex-col items-center gap-2 group/ch"
                                            >
                                                <div className="w-16 h-10 bg-black/40 backdrop-blur-md rounded-lg border border-theme-600/30 group-hover/ch:border-theme-400 group-hover/ch:bg-theme-600/20 transition-all flex items-center justify-center relative overflow-hidden">
                                                    <span className="text-[10px] font-black text-theme-400 group-hover/ch:text-theme-200">{ch.startIndex + 1}</span>
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-theme-600/10 to-transparent opacity-0 group-hover/ch:opacity-100 transition-opacity"></div>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-tight text-white/50 group-hover/ch:text-white truncate w-16 text-center">{ch.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                            <button id="tutorial-spin-book" onClick={(e) => { e.stopPropagation(); setSpinDirection(d => d * -1); setAutoSpin(true); }} className="w-14 h-[60px] rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/10 active:scale-95 flex items-center justify-center flex-none" title="Inverser la rotation">
                                <IconReverse width="22" height="22" />
                            </button>
                            <button id="tutorial-open-book" onClick={handleReadClick} className="flex-[2] py-5 rounded-2xl bg-theme-600 text-white font-black uppercase tracking-widest text-sm hover:bg-theme-500 transition-all shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),1)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-theme-400">
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