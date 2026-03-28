import React, { useState, useEffect, memo, useMemo, useDeferredValue, useCallback } from 'react';
import {
    IconSearch, IconFilter, IconCheckSquare, IconBookPlus, IconSettings,
    IconFloppyUp, IconFloppyDown, IconTrash, IconCheck
} from './Icons';
import {
    SHELF_THEMES, SHELF_ENGRAVINGS, getSafeStorage, setSafeStorage, MANGA_PROPS, getCachedUrl
} from '../utils';

// On recrée ce petit composant ici pour que la bibliothèque puisse afficher les images
const StackThumbnail = memo(({ file, contain = false, className = "" }) => {
    const url = getCachedUrl(file);
    return url ? <img src={url} loading="lazy" decoding="async" className={`w-full h-full gpu-accelerated ${contain ? 'object-contain' : 'object-cover'} ${className}`} /> : null;
});

const HubView = memo(({
    isActive, mangas, animatingManga, deferredPrompt, handleInstallApp, 
    setIsAdding, showGlobalSettings, setShowGlobalSettings, appTheme,
    setAppTheme, shelfTheme, setShelfTheme, handleExport, handleImport, setPurgeConfirm, shelfEngraving, setShelfEngraving,
    setActiveCardMenu, isSelectionMode, selectedMangas, toggleMangaSelection, toggleSelectionMode, handleReorderManga,
    toggleSelectAllMangas, setShowBatchEditModal, setBatchDeleteConfirm, setInspectingManga, deletingMangas
}) => {

    const isIosSafari = /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios|opios|mercury/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const [showIosBanner, setShowIosBanner] = useState(() => isIosSafari && !isStandalone && !getSafeStorage('mangaHubIosBannerDismissed', ''));
    const [shelfRowsCount, setShelfRowsCount] = useState(1);

    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeTags, setActiveTags] = useState([]); 
    const [showTags, setShowTags] = useState(false); 
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
    const [sortOrder, setSortOrder] = useState(() => getSafeStorage('mangaHubSortOrder', 'group'));

    // OPTIMISATION : Mode sommeil. On ne met à jour les données que si l'étagère est visible.
    const [displayMangas, setDisplayMangas] = useState(mangas);
    useEffect(() => {
        if (isActive) setDisplayMangas(mangas);
    }, [mangas, isActive]);

    const searchResults = useMemo(() => {
        if (deferredSearch.trim().length < 2) return [];
        const normalizedMangas = displayMangas.map(m => {
            const tSet = new Set((m.tags || []).map(t => t.toUpperCase()));
            return { ...m, tags: Array.from(tSet).sort() };
        });
        return normalizedMangas.filter(m => {
            const searchLower = deferredSearch.toLowerCase();
            const matchTitle = m.title.toLowerCase().includes(searchLower);
            const matchGroup = m.group && m.group.toLowerCase().includes(searchLower);
            const matchArtist = m.artist && m.artist.toLowerCase().includes(searchLower);
            const matchTags = m.tags.some(t => t.toLowerCase().includes(searchLower));
            return matchTitle || matchGroup || matchArtist || matchTags;
        }).slice(0, 50);
    }, [displayMangas, deferredSearch]);

    const libraryStructure = useMemo(() => {
        const tagsSet = new Set();
        const normalizedMangas = displayMangas.map(m => {
            const tSet = new Set((m.tags || []).map(t => t.toUpperCase()));
            return { ...m, tags: Array.from(tSet).sort() };
        });
        normalizedMangas.forEach(m => m.tags.forEach(t => tagsSet.add(t)));
        const allAvailableTags = Array.from(tagsSet).sort();
        
        let filtered = normalizedMangas.filter(m => {
            const matchTags = activeTags.length === 0 || activeTags.every(t => m.tags.includes(t));
            const matchBookmark = showBookmarksOnly ? (m.bookmark != null) : true;
            return matchTags && matchBookmark;
        });

        const shelvesMap = {};
        filtered.forEach(m => {
            const g = m.group || "Volumes Indépendants";
            if (!shelvesMap[g]) shelvesMap[g] = { title: g, mangas: [], date: m.date };
            shelvesMap[g].mangas.push(m);
            if (m.date > shelvesMap[g].date) shelvesMap[g].date = m.date;
        });

        const sortedShelves = Object.values(shelvesMap).sort((a,b) => {
            if (sortOrder === 'lastRead') {
                const lastReadA = Math.max(0, ...a.mangas.map(m => m.lastRead || 0));
                const lastReadB = Math.max(0, ...b.mangas.map(m => m.lastRead || 0));
                if (lastReadB !== lastReadA) return lastReadB - lastReadA;
            }
            if (sortOrder === 'dateAdded') {
                const dateA = Math.max(0, ...a.mangas.map(m => m.date || 0));
                const dateB = Math.max(0, ...b.mangas.map(m => m.date || 0));
                if (dateB !== dateA) return dateB - dateA;
            }
            if (a.title === "Volumes Indépendants") return 1;
            if (b.title === "Volumes Indépendants") return -1;
            return a.title.localeCompare(b.title, undefined, {numeric: true});
        });

        sortedShelves.forEach(s => s.mangas.sort((a,b) => {
            const oA = a.order ?? 999999;
            const oB = b.order ?? 999999;
            if (oA !== oB) return oA - oB;
            return a.title.localeCompare(b.title, undefined, {numeric: true});
        }));

        const flattened = [];
        sortedShelves.forEach((shelf, shelfIndex) => {
            shelf.mangas.forEach((m, mIndex) => {
                flattened.push({ type: 'manga', data: m, group: shelf.title, isFirst: mIndex === 0 });
            });
            if (shelfIndex < sortedShelves.length - 1) flattened.push({ type: 'separator', key: `sep-${shelfIndex}` });
        });

        return { shelves: sortedShelves, flattened, allAvailableTags };
    }, [displayMangas, activeTags, showBookmarksOnly, sortOrder]);
    
    useEffect(() => {
        const updateRows = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const bookH = Math.max(160, Math.min(320, h * 0.28));
            const bookW = bookH * 0.95 * (24 / 320); 
            const availableW = w - 60; 
            
            const itemsPerRow = Math.max(1, Math.floor(availableW / (bookW + 1)));
            const neededRows = Math.ceil(libraryStructure.flattened.length / itemsPerRow);
            setShelfRowsCount(Math.max(1, neededRows));
        };
        
        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateRows, 150); // Debounce de 150ms
        };

        updateRows();
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); clearTimeout(resizeTimer); };
    }, [libraryStructure.flattened.length]);

    const handleSelectAll = () => {
        const allFilteredIds = libraryStructure.flattened.filter(i => i.type === 'manga').map(i => i.data.id);
        if (toggleSelectAllMangas) toggleSelectAllMangas(allFilteredIds);
    };
    const allSelected = libraryStructure.flattened.filter(i => i.type === 'manga').length > 0 && selectedMangas.size === libraryStructure.flattened.filter(i => i.type === 'manga').length;

    // OPTIMISATION : Un seul event listener en mémoire partagé par tous les livres
    const handleBookPointerEnter = useCallback((e) => {
        const popup = e.currentTarget.querySelector('.peek-popup');
        if (popup) {
            if (e.currentTarget.getBoundingClientRect().right > window.innerWidth - 220) {
                popup.style.left = 'auto';
                popup.style.right = 'calc(100% + 12px)';
                popup.style.transformOrigin = 'top right';
            } else {
                popup.style.left = 'calc(100% + 12px)';
                popup.style.right = 'auto';
                popup.style.transformOrigin = 'top left';
            }
        }
    }, []);

    return (
        <div 
            className="flex flex-col h-full w-full mx-auto relative animate-hub-enter"
            style={{ 
                transitionProperty: 'transform, opacity', 
                transitionDuration: '500ms', 
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                transform: animatingManga ? 'scale(0.96)' : 'scale(1)',
                opacity: animatingManga ? 0.3 : 1
            }}
        >
            <header 
                className="relative flex-none flex flex-col gap-4 p-4 lg:py-6 lg:px-8 bg-black/80 backdrop-blur-xl border-b border-theme-600/30 shadow-[0_4px_30px_rgba(var(--theme-rgb),0.15)] z-30"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
            >
                <div className="flex items-center justify-between w-full">
                    <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic cursor-default flex-none">
                        <span className="text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.6), 0 0 20px rgba(var(--theme-rgb),0.5)' }}>Manga</span><span className="text-theme-500" style={{ textShadow: '0 0 10px rgba(var(--theme-rgb),0.8), 0 0 30px rgba(var(--theme-rgb),0.8)' }}>Hub</span>
                    </h1>
                    
                    <div className="hidden md:flex flex-1 justify-center px-8">
                        <div className="relative max-w-xl w-full">
                            <div className="absolute inset-y-0 left-4 flex items-center text-theme-400/80 pointer-events-none"><IconSearch /></div>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans la bibliothèque..." className="bg-theme-950/40 border border-theme-500/40 rounded-full py-2.5 pl-11 pr-4 text-sm text-theme-100 outline-none focus:border-theme-400 focus:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] focus:bg-theme-900/50 placeholder-theme-300/50 w-full transition-all duration-300 shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.2)]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-none">
                        {deferredPrompt && (
                            <button onClick={handleInstallApp} className="bg-gradient-to-r from-theme-600 to-theme-800 text-white px-3 sm:px-4 h-10 flex items-center justify-center rounded-xl active:scale-95 transition border border-theme-400 shadow-[0_0_15px_rgba(var(--theme-rgb),0.6)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.9)] text-[10px] sm:text-xs font-black uppercase tracking-wider animate-[pulse_2s_ease-in-out_infinite]" title="Installer MangaHub sur cet appareil">
                                ↓ Installer
                            </button>
                        )}
                        
                        {libraryStructure.allAvailableTags.length > 0 && !isSelectionMode && (
                            <button onClick={() => setShowTags(!showTags)} className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${showTags || activeTags.length > 0 ? 'bg-theme-600/20 text-theme-300 border-theme-500' : 'bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40'}`} title="Filtrer par tags">
                                <IconFilter width="18" height="18" />
                            </button>
                        )}

                        <button onClick={toggleSelectionMode} className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${isSelectionMode ? 'bg-theme-600/20 text-theme-300 border-theme-500' : 'bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40'}`} title="Sélection multiple">
                            <IconCheckSquare width="18" height="18" />
                        </button>

                        <button onClick={() => setIsAdding(true)} className="bg-theme-600/20 text-theme-400 hover:text-theme-300 w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition border border-theme-500 shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.8)] hover:bg-theme-600/40" title="Ajouter un manga">
                            <IconBookPlus width="18" height="18" />
                        </button>

                        <div className="relative">
                            <button onClick={() => setShowGlobalSettings(!showGlobalSettings)} className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${showGlobalSettings ? 'bg-theme-600/20 text-theme-300 border-theme-500 relative z-[130]' : 'bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40'}`} title="Paramètres"><IconSettings width="18" height="18" /></button>
                            
                            {showGlobalSettings && (
                                <>
                                    <div className="fixed inset-0 z-[110] cursor-default" onClick={() => setShowGlobalSettings(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900/95 border border-theme-500/40 rounded-2xl shadow-[0_15px_40px_rgba(var(--theme-rgb),0.6)] z-[120] p-5 flex flex-col gap-5 animate-in origin-top-right">
                                        
                                        <div>
                                            <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-3 block opacity-70 text-center">Thème Visuel</span>
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => setAppTheme('blue')} className={`w-6 h-6 rounded-full bg-[#0a46ff] shadow-[0_0_10px_rgba(10,70,255,0.8)] border-2 ${appTheme === 'blue' ? 'border-white' : 'border-transparent'} hover:scale-110 transition-transform`}></button>
                                                <button onClick={() => setAppTheme('red')} className={`w-6 h-6 rounded-full bg-[#ff0055] shadow-[0_0_10px_rgba(255,0,85,0.8)] border-2 ${appTheme === 'red' ? 'border-white' : 'border-transparent'} hover:scale-110 transition-transform`}></button>
                                                <button onClick={() => setAppTheme('green')} className={`w-6 h-6 rounded-full bg-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.8)] border-2 ${appTheme === 'green' ? 'border-white' : 'border-transparent'} hover:scale-110 transition-transform`}></button>
                                                <button onClick={() => setAppTheme('purple')} className={`w-6 h-6 rounded-full bg-[#d500ff] shadow-[0_0_10px_rgba(213,0,255,0.8)] border-2 ${appTheme === 'purple' ? 'border-white' : 'border-transparent'} hover:scale-110 transition-transform`}></button>
                                                <button onClick={() => setAppTheme('yellow')} className={`w-6 h-6 rounded-full bg-[#ffea00] shadow-[0_0_10px_rgba(255,234,0,0.8)] border-2 ${appTheme === 'yellow' ? 'border-white' : 'border-transparent'} hover:scale-110 transition-transform`}></button>
                                            </div>
                                        </div>
                                        
                                        <div className="h-px bg-theme-900/50 w-full"></div>
                                        
                                        <div>
                                            <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2 block opacity-70 text-center">Matériau Étagère</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(SHELF_THEMES).map(([key, theme]) => (
                                                    <button key={key} onClick={() => setShelfTheme(key)} className={`py-1.5 rounded text-[10px] font-black transition-colors border ${shelfTheme === key ? 'bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]' : 'bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50'}`}>
                                                        {theme.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-theme-900/50 w-full"></div>

                                        <div>
                                            <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2 block opacity-70 text-center">Gravure Étagère</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(SHELF_ENGRAVINGS).map(([key, engraving]) => (
                                                    <button key={key} onClick={() => setShelfEngraving(key)} className={`py-1.5 rounded text-[10px] font-black transition-colors border ${shelfEngraving === key ? 'bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]' : 'bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50'}`}>
                                                        {engraving.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-theme-900/50 w-full"></div>
                                        
                                        <div>
                                            <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2 block opacity-70 text-center">Données & Sauvegarde</span>
                                            <div className="flex justify-between gap-2">
                                                <button onClick={handleExport} className="flex-1 flex items-center justify-center h-10 bg-theme-900/20 text-theme-400 hover:text-white hover:bg-theme-600/40 rounded-xl transition-all border border-theme-800/50 hover:border-theme-500 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)]">
                                                    <IconFloppyUp width="16" height="16" />
                                                </button>
                                            <label className="flex-1 flex items-center justify-center h-10 bg-theme-900/20 text-theme-400 hover:text-white hover:bg-theme-600/40 rounded-xl transition-all cursor-pointer border border-theme-800/50 hover:border-theme-500 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)]">
                                                    <IconFloppyDown width="16" height="16" />
                                                <input type="file" accept=".json,.zip" className="hidden" onChange={handleImport} />
                                                </label>
                                                <button onClick={() => { setShowGlobalSettings(false); setPurgeConfirm(true); }} className="flex-1 flex items-center justify-center h-10 bg-red-950/20 text-red-500 hover:text-white hover:bg-red-600/40 rounded-xl transition-all border border-red-900/50 hover:border-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                                                    <IconTrash width="16" height="16" />
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="md:hidden w-full relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-theme-400/80 pointer-events-none"><IconSearch /></div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-theme-950/40 border border-theme-500/40 rounded-full py-2 pl-10 pr-4 text-sm text-theme-100 outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)] focus:bg-theme-900/50 placeholder-theme-300/50 w-full transition-all duration-300 shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.2)]" />
                </div>
            </header>
            
            <main className="flex-1 flex flex-col overflow-hidden relative bg-black" style={{ paddingLeft: 'max(0px, env(safe-area-inset-left))', paddingRight: 'max(0px, env(safe-area-inset-right))' }}>
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
                    <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[1200px] max-h-[1200px] bg-theme-600 rounded-full mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-30 aura-blob-1 gpu-accelerated"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] max-w-[1500px] max-h-[1500px] bg-theme-800 rounded-full mix-blend-screen filter blur-[80px] md:blur-[150px] opacity-40 aura-blob-2 gpu-accelerated"></div>
                    <div className="absolute top-[20%] right-[20%] w-[50vw] h-[50vw] max-w-[1000px] max-h-[1000px] bg-theme-400 rounded-full mix-blend-screen filter blur-[50px] md:blur-[100px] opacity-20 aura-blob-3 gpu-accelerated"></div>
                </div>

                {showTags && libraryStructure.allAvailableTags.length > 0 && !isSelectionMode && (
                    <div className="flex-none flex items-center gap-2 overflow-x-auto pb-4 pt-4 px-6 lg:px-10 custom-scrollbar relative z-20 animate-in bg-gradient-to-b from-black/80 to-transparent">
                        <button onClick={() => setActiveTags([])} className={`flex-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all animate-tag-pop ${activeTags.length === 0 ? 'bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]' : 'bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/30'}`}>TOUS</button>
                        {libraryStructure.allAvailableTags.map((t, idx) => {
                            const isActive = activeTags.includes(t);
                            return (<button key={t} onClick={() => setActiveTags(prev => isActive ? prev.filter(x => x !== t) : [...prev, t])} className={`flex-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all animate-tag-pop ${isActive ? 'bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]' : 'bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/30'}`} style={{ animationDelay: `${idx * 30}ms` }}>{t}</button>)
                        })}
                    </div>
                )}

                <div className="relative flex-1 w-full min-h-0 z-10 bg-[#050810]" style={{
                    '--row-pt': 'clamp(15px, 2vh, 30px)', '--row-book-h': 'clamp(180px, 32vh, 360px)',
                    '--board-h': 'clamp(20px, 3vh, 35px)', '--pillar-w': 'clamp(12px, 2.5vw, 30px)',
                    '--row-total': 'calc(var(--row-pt) + var(--row-book-h) + var(--board-h))'
                }}>
                    
                    {[['left-0','shadow-[8px_0_20px_rgba(0,0,0,0.5)] border-r','bg-gradient-to-r'],['right-0','shadow-[-8px_0_20px_rgba(0,0,0,0.5)] border-l','bg-gradient-to-l']].map(([pos, shadow, grad]) => {
                        const t = SHELF_THEMES[shelfTheme] || SHELF_THEMES.mahogany;
                        const engravingDef = SHELF_ENGRAVINGS[shelfEngraving] || SHELF_ENGRAVINGS.none;
                        return (
                            <div key={pos} className={`absolute top-0 bottom-0 ${pos} z-[25] pointer-events-none ${shadow} border-white/10 transition-all duration-500`} style={{ width: 'var(--pillar-w)', ...t.board }}>
                                {t.texture && <div className={`absolute inset-0 ${t.texture} pointer-events-none`}></div>}
                                {engravingDef.style.backgroundImage && (
                                    <div className="absolute inset-0 pointer-events-none" style={engravingDef.style}></div>
                                )}
                                <div className={`absolute inset-0 ${grad} from-black/80 to-transparent pointer-events-none`}></div>
                            </div>
                        );
                    })}

                    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <div className="relative min-h-full w-full">
                            {libraryStructure.flattened.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none select-none px-8">
                                    <div className="text-[64px] opacity-20">📚</div>
                                    <div className="text-center">
                                        <p className="text-theme-400 font-black uppercase tracking-widest text-sm mb-2" style={{ textShadow: '0 0 15px rgba(var(--theme-rgb),0.6)' }}>Bibliothèque vide</p>
                                        <p className="text-white/30 text-xs font-bold">Appuie sur <span className="text-theme-400">+</span> pour ajouter ton premier manga</p>
                                    </div>
                                </div>
                            )}
                            <div className="absolute top-0 left-0 w-full flex flex-col pointer-events-none z-0">
                                {Array.from({ length: shelfRowsCount }).map((_, i) => {
                                    const themeDef = SHELF_THEMES[shelfTheme] || SHELF_THEMES.mahogany;
                                    const engravingDef = SHELF_ENGRAVINGS[shelfEngraving] || SHELF_ENGRAVINGS.none;
                                    return (
                                        <div key={i} className="w-full flex-none flex flex-col justify-end transition-all duration-500" style={{ height: 'var(--row-total)' }}>
                                            <div className="w-full shadow-[0_20px_40px_rgba(0,0,0,1)] relative z-20 border-t border-white/5" style={{ height: 'var(--board-h)', ...themeDef.board }}>
                                                {themeDef.texture && <div className={`absolute inset-0 ${themeDef.texture} pointer-events-none`}></div>}
                                                {engravingDef.style.backgroundImage && (
                                                    <div className="absolute inset-0 pointer-events-none" style={engravingDef.style}></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="relative z-10 flex flex-wrap content-start items-start justify-start w-full" style={{ paddingLeft: 'var(--pillar-w)', paddingRight: 'var(--pillar-w)', paddingBottom: 'max(6rem, env(safe-area-inset-bottom))' }}>
                                {libraryStructure.flattened.map((item, i) => {
                                    const themeDef = SHELF_THEMES[shelfTheme] || SHELF_THEMES.mahogany;
                                    const engravingDef = SHELF_ENGRAVINGS[shelfEngraving] || SHELF_ENGRAVINGS.none;
                                    
                                    if (item.type === 'separator') {
                                        return (
                                            <div key={item.key} className="flex-none flex items-end relative transition-all duration-500" style={{ height: 'var(--row-total)', paddingTop: 'var(--row-pt)', paddingBottom: 'var(--board-h)' }}>
                                                <div className="flex-none shadow-[-5px_0_15px_rgba(0,0,0,0.8)] border-l border-t border-white/10 relative z-20 rounded-t-[2px] h-[90%]" style={{ width: 'clamp(10px, 1.5vh, 20px)', ...themeDef.bookend }}>
                                                    <div className="w-1/2 h-full bg-black/30 absolute left-0 pointer-events-none"></div>
                                                    {engravingDef.style.backgroundImage && (
                                                        <div className="absolute inset-0 pointer-events-none" style={engravingDef.style}></div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    const m = item.data;
                                    const isSelected = isSelectionMode && selectedMangas.has(m.id);
                                    
                                    const isDouble = !!m.coverDouble;
                                    const mainCover = m.coverStart || m.cover;
                                    const wrapCoverUrl = getCachedUrl(m.coverDouble);
                                    const frontCoverUrl = getCachedUrl(mainCover);

                                    const bw = MANGA_PROPS.faceW;
                                    const bh = MANGA_PROPS.h;
                                    const bd = MANGA_PROPS.spineW;
                                    const wrapTotalW = (bw * 2) + bd; 
                                    const bgSizeSpine = `${(wrapTotalW / bd) * 100}% 100%`;

                                    return (
                                        <div key={m.id} className="flex-none flex items-end relative group/book hover:z-[100]" style={{ height: 'var(--row-total)', paddingTop: 'var(--row-pt)', paddingBottom: 'var(--board-h)' }}>
                                            
                                            {/* 👉 Ici, on transmet l'événement "e" avec "setInspectingManga(m, e)" */}
                                                <div onPointerEnter={handleBookPointerEnter} onClick={(e) => { 
                                                if (isSelectionMode) { e.preventDefault(); toggleMangaSelection(m.id); return; }
                                                setInspectingManga(m, e);
                                            }} className={`manga-cover-image relative flex-none cursor-pointer z-10 rounded-[2px] ${isSelected ? 'ring-2 ring-theme-500 scale-95 opacity-80' : 'hover:-translate-y-5 hover:shadow-[0_20px_30px_-8px_rgba(0,0,0,0.9),0_0_20px_rgba(var(--theme-rgb),0.15)]'}`} style={{ backgroundColor: '#0f172a', height: '95%', width: `calc(var(--row-book-h) * 0.95 * (${bd} / ${bh}))`, boxShadow: '0 8px 10px -4px rgba(0,0,0,0.8)', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                                
                                            <div className="peek-popup absolute top-2 left-[calc(100%+12px)] bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(var(--theme-rgb),0.3)] opacity-0 group-hover/book:opacity-100 group-hover/book:translate-y-0 pointer-events-none z-[200] overflow-hidden border border-white/10 flex flex-col w-[140px] sm:w-[180px] origin-top-left translate-y-2" style={{ transition: 'opacity 0.2s ease, transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)' }}>
                                                    <div className="relative w-full bg-black border-b border-white/10" style={{ aspectRatio: `${bw} / ${bh}` }}>
                                                        <StackThumbnail file={mainCover} contain={true} />
                                                    </div>
                                                    <div className="p-3 sm:p-4 flex flex-col bg-gradient-to-b from-transparent to-black/60">
                                                        <span className="text-[8px] sm:text-[10px] text-theme-400 font-black uppercase tracking-widest truncate mb-1">{item.group || "Indépendant"}</span>
                                                        <span className="text-[10px] sm:text-xs text-white font-bold leading-snug line-clamp-3" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{m.title}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[2px] bg-[#0f172a]">
                                                    {isDouble && wrapCoverUrl ? (
                                                        <div className="w-full h-full opacity-100 transition-opacity" style={{ backgroundImage: `url(${wrapCoverUrl})`, backgroundSize: bgSizeSpine, backgroundPosition: 'center center', backgroundRepeat: 'no-repeat' }}></div>
                                                    ) : (
                                                        <>
                                                            {frontCoverUrl && <div className="absolute inset-0 scale-[1.5] opacity-90" style={{ backgroundImage: `url(${frontCoverUrl})`, backgroundSize: 'cover', backgroundPosition: 'left center', filter: 'blur(10px) saturate(1.5) brightness(0.6)' }}></div>}
                                                            
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <span className={`${themeDef.text} group-hover/book:text-white font-black uppercase tracking-widest overflow-hidden whitespace-nowrap [text-overflow:clip] text-center leading-none transition-colors absolute`} style={{ transform: 'rotate(90deg)', textShadow: '0px 2px 5px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,0.8)', fontSize: 'clamp(9px, 1.6vh, 13px)', width: 'max-content', padding: '0 10px' }}>
                                                                    {m.title}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {m.bookmark != null && !m.isFinished && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] max-w-[16px] min-w-[6px] h-[22%] bg-theme-500 shadow-[0_4px_10px_rgba(0,0,0,0.9)] z-40 border-x border-b border-white/40 animate-bookmark-in" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(0,0,0,0.2))' }}></div>
                                                    )}
                                                    {m.isFinished && (
                                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[25%] max-w-[12px] min-w-[6px] aspect-square rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)] border border-white/80 z-40"></div>
                                                    )}
                                                </div>

                                                {isSelectionMode && (
                                                    <div className={`absolute inset-0 z-30 flex items-center justify-center transition-all rounded-[2px] ${isSelected ? 'bg-theme-900/60 backdrop-blur-[2px]' : 'bg-black/40 group-hover/book:bg-black/20'}`}>
                                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-theme-500 bg-theme-500 text-white shadow-[0_0_15px_rgba(var(--theme-rgb),0.8)]' : 'border-white/50 text-transparent'}`}>
                                                            <IconCheck width="12" height="12" strokeWidth="3" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 border-l border-l-white/20 border-r border-r-black/20 pointer-events-none rounded-[2px]"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {isSelectionMode && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-theme-500/50 shadow-[0_20px_50px_rgba(var(--theme-rgb),0.5)] px-6 py-4 rounded-2xl flex items-center gap-6 z-[100] animate-slide-up">
                        <span className="font-black text-white text-sm whitespace-nowrap drop-shadow-[0_0_8px_rgba(var(--theme-rgb),0.8)]">{selectedMangas.size} sélectionné(s)</span>
                        <div className="flex items-center gap-3">
                            <button disabled={selectedMangas.size === 0} onClick={() => setShowBatchEditModal(true)} className="p-2.5 bg-theme-600 text-white rounded-xl hover:scale-105 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition"><IconSettings width="20" height="20" /></button>
                            <button disabled={selectedMangas.size === 0} onClick={() => setBatchDeleteConfirm(true)} className="p-2.5 bg-red-600 text-white rounded-xl hover:scale-105 hover:shadow-[0_0_15px_rgba(220,38,38,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition"><IconTrash width="20" height="20" /></button>
                            <button onClick={handleSelectAll} className="px-4 py-2.5 bg-theme-600 text-white hover:bg-theme-500 transition font-black text-xs uppercase tracking-widest rounded-xl border border-theme-400 active:scale-95 shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)]">{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
                            <div className="w-px h-8 bg-theme-800/80 mx-1"></div>
                            <button onClick={toggleSelectionMode} className="px-4 py-2.5 text-theme-400 hover:text-theme-200 transition font-black text-xs uppercase tracking-widest bg-theme-950/50 rounded-xl border border-theme-800/50 active:scale-95">Annuler</button>
                        </div>
                    </div>
                )}
                {showIosBanner && (
                    <div className="fixed bottom-0 left-0 right-0 z-[200] animate-slide-up" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                        <div className="mx-4 mb-4 bg-slate-900/98 backdrop-blur-xl border border-theme-500/50 rounded-2xl p-5 shadow-[0_-10px_40px_rgba(var(--theme-rgb),0.4)]">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-theme-600/20 border border-theme-500/40 flex items-center justify-center flex-none text-2xl">📚</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black text-sm mb-1">Installer MangaHub</p>
                                    <p className="text-white/50 text-xs leading-relaxed">
                                        Appuie sur <span className="text-theme-300 font-bold">⎙ Partager</span> puis <span className="text-theme-300 font-bold">« Sur l'écran d'accueil »</span> pour utiliser l'app hors-ligne.
                                    </p>
                                </div>
                                <button onClick={() => { setShowIosBanner(false); setSafeStorage('mangaHubIosBannerDismissed', '1'); }} className="text-white/40 hover:text-white/80 transition flex-none p-1 text-xl leading-none">✕</button>
                            </div>
                            <div className="flex justify-center mt-3">
                                <div className="text-theme-400 text-xs font-bold animate-bounce">↓ Bouton Partager en bas de Safari</div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
});

export default HubView;