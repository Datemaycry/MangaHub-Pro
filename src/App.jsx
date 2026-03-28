import {
    IconTrash, IconSettings, IconSearch, IconChevronLeft, IconChevronRight, IconUpload,
    IconLibrary, IconBookPlus, IconBookmarkOutline, IconBookmarkFilled, IconMoon,
    IconSun, IconSinglePage, IconDoublePage, IconFloppyUp, IconFloppyDown,
    IconMoreVertical, IconPlay, IconMaximize, IconCheck, IconCheckSquare,
    IconFilter, IconReverse
} from './components/Icons';
import { 
    MANGA_PROPS, DB_NAME, STORE_MANGAS, STORE_PAGES, 
    getSafeStorage, setSafeStorage, triggerHaptic, initDB, 
    blobToBase64Async, decodeFileToIDB, serializeFile, deserializeFile, 
    getCachedUrl, SHELF_THEMES, EXT_MIME, globalImageCache, getFileKey
} from './utils';
import HubView from './components/HubView';
import ReaderView from './components/ReaderView';
import MangaInspector from './components/MangaInspector';
import { EditMangaModal, BatchEditModal, AddChapterModal } from './components/Forms';
import { ToastNotification, LoadingOverlay, ConfirmModal, MangaActionsModal } from './components/Modals';
import React, { useState, useEffect, useMemo, useRef, useCallback, memo, useDeferredValue } from 'react';
import JSZip from 'jszip';
import { polyfill } from 'mobile-drag-drop';

window.addEventListener('touchmove', function(e) { 
    if (window.visualViewport && window.visualViewport.scale > 1.05) return;
    
    // SÉCURITÉ APPLE PENCIL : Le stylet tremble naturellement. 
    // Si on bloque un micro-mouvement, Safari annule le clic !
    if (e.target && e.target.closest) {
        // On exempte tous les éléments interactifs pour laisser passer le clic
        if (e.target.closest('button, label, input, select, textarea, .manga-cover-image')) {
            return;
        }
        // On exempte aussi les fonds noirs des modales pour pouvoir cliquer à côté et les fermer
        if (e.target.classList && e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
            return;
        }
    }
    
    if (e.target && e.target.closest('.custom-scrollbar') === null && e.target.closest('.shelf-scroll') === null) {
        e.preventDefault(); 
    }
}, {passive: false});

polyfill({ holdToDrag: 250 });

// --- APPLICATION ROOT ---
const App = () => {
    const [toast, setToast] = useState(null);
    const showToast = useCallback((msg, type = 'info') => {
        setToast({ msg, type, id: Date.now() });
    }, []);
    useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 3500); return () => clearTimeout(timer); } }, [toast]);

    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
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
    useEffect(() => { setSafeStorage('mangaHubShowSpine', showSpine.toString()); }, [showSpine]);
    const [shelfTheme, setShelfTheme] = useState(() => getSafeStorage('mangaHubShelfTheme', 'mahogany'));

    useEffect(() => { document.body.setAttribute('data-theme', appTheme); setSafeStorage('mangaHubTheme', appTheme); }, [appTheme]);
    useEffect(() => { setSafeStorage('mangaHubNightMode', isNightMode.toString()); }, [isNightMode]);
    useEffect(() => { setSafeStorage('mangaHubShelfTheme', shelfTheme); }, [shelfTheme]);

    useEffect(() => {
        const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
        window.addEventListener('resize', handleResize); window.addEventListener('orientationchange', handleResize);
        return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('orientationchange', handleResize); };
    }, []);

    const [currentTime, setCurrentTime] = useState("");
    useEffect(() => {
        const updateClock = () => { setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); };
        updateClock(); const timer = setInterval(updateClock, 30000); return () => clearInterval(timer);
    }, []);

    const [view, setView] = useState('hub');
    const [mangas, setMangas] = useState([]);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [currentManga, setCurrentManga] = useState(null);
    
    // ANTI-RACE CONDITION : On garde une trace instantanée du marque-page
    const latestBookmarkRef = useRef(null);
    
    const [currentPages, setCurrentPages] = useState([]);
    const [animatingManga, setAnimatingManga] = useState(null);
    const [isExitingReader, setIsExitingReader] = useState(false); 
    
    const [inspectingManga, setInspectingManga] = useState(null);
    
    // 👉 On ajoute l'état pour sauvegarder les coordonnées du clic
    const [inspectingCoords, setInspectingCoords] = useState(null);

    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [importProgress, setImportProgress] = useState(null);
    const [cursor, setCursor] = useState(0); 
    const [zenMode, setZenMode] = useState(false);
    const [showNextChapterOverlay, setShowNextChapterOverlay] = useState(false); 
    const [slideDir, setSlideDir] = useState('next'); 
    const [prevCursor, setPrevCursor] = useState(null); 
    const [edgeGlow, setEdgeGlow] = useState(null); 

    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [purgeConfirm, setPurgeConfirm] = useState(false);
    const [editingManga, setEditingManga] = useState(null);
    const [activeCardMenu, setActiveCardMenu] = useState(null); 

    const [activeTags, setActiveTags] = useState([]); 
    const [showTags, setShowTags] = useState(false); 
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMangas, setSelectedMangas] = useState(new Set());
    const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
    const [showBatchEditModal, setShowBatchEditModal] = useState(false);

    const existingGroups = useMemo(() => {
        const groups = new Set(mangas.map(m => m.group).filter(Boolean));
        return Array.from(groups).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    }, [mangas]);

    const loadMangas = useCallback(async () => {
        const db = await initDB();
        db.transaction(STORE_MANGAS).objectStore(STORE_MANGAS).getAll().onsuccess = e => {
            setMangas(e.target.result || []);
        };
    }, []);
    useEffect(() => { loadMangas(); }, []);

    useEffect(() => {
        if (view === 'reader' && currentManga) {
            initDB().then(db => {
                db.transaction(STORE_PAGES).objectStore(STORE_PAGES).get(currentManga.id).onsuccess = e => {
                    if(e.target.result) {
                        setCurrentPages(e.target.result.pages || []);
                    }
                }
            });
        } else {
            setCurrentPages([]); 
        }
    }, [view, currentManga]);

    const allSpreads = useMemo(() => {
        if(!currentManga || !currentPages || currentPages.length === 0) return [];
        let p = currentPages;
        const startName = currentManga.coverStart?.name; const endName = currentManga.coverEnd?.name; const doubleName = currentManga.coverDouble?.name;
        if (startName || endName || doubleName) p = p.filter(page => page.name !== startName && page.name !== endName && page.name !== doubleName);

        const spreads = []; 
        const isRTL = currentManga.direction === 'rtl'; 
        const hasDoubleCover = !!currentManga.coverDouble;
        
        if (effectiveLandscape) {
            if (hasDoubleCover) {
                spreads.push({ center: currentManga.coverDouble, info: "Jaquette Complète", pageIndices: [-1] });
            } else if (currentManga.isDoubleCover && currentManga.coverStart && currentManga.coverEnd) {
                if (isRTL) spreads.push({ left: currentManga.coverStart, right: currentManga.coverEnd, info: "Couvertures", pageIndices: [-1] });
                else spreads.push({ left: currentManga.coverEnd, right: currentManga.coverStart, info: "Couvertures", pageIndices: [-1] });
            } else {
                const cover = currentManga.coverStart || currentManga.cover;
                if (cover) {
                    if (isRTL) spreads.push({ left: cover, right: null, info: "Couverture", pageIndices: [-1] });
                    else spreads.push({ left: null, right: cover, info: "Couverture", pageIndices: [-1] });
                }
            }
            for (let i = 0; i < p.length; i += 2) {
                const next = p[i+1];
                if (!next) {
                    if (isRTL) spreads.push({ left: null, right: p[i], info: `Page ${i+1}`, pageIndices: [i] });
                    else spreads.push({ left: p[i], right: null, info: `Page ${i+1}`, pageIndices: [i] });
                }
                else if (isRTL) spreads.push({ left: p[i+1], right: p[i], info: `Pages ${i+2} - ${i+1}`, pageIndices: [i, i+1] });
                else spreads.push({ left: p[i], right: p[i+1], info: `Pages ${i+1} - ${i+2}`, pageIndices: [i, i+1] });
            }
            if (currentManga.coverEnd && !hasDoubleCover && !currentManga.isDoubleCover) {
                if (isRTL) spreads.push({ left: null, right: currentManga.coverEnd, info: "Couverture Fin", pageIndices: [-2] });
                else spreads.push({ left: currentManga.coverEnd, right: null, info: "Couverture Fin", pageIndices: [-2] });
            }
        } else {
            const startCover = currentManga.coverStart || currentManga.coverDouble || currentManga.cover;
            if (startCover) spreads.push({ center: startCover, info: "Couverture Début", pageIndices: [-1] });
            p.forEach((page, i) => spreads.push({ center: page, info: `Page ${i+1}`, pageIndices: [i] }));
            if (currentManga.coverEnd) spreads.push({ center: currentManga.coverEnd, info: "Couverture Fin", pageIndices: [-2] });
        }
        return spreads;
    }, [currentManga, currentPages, effectiveLandscape]);

    const nextChapter = useMemo(() => {
        if (!currentManga) return null;
        const ctx = currentManga.group
            ? mangas.filter(m => m.group === currentManga.group)
            : [...mangas];
        ctx.sort((a,b) => a.title.localeCompare(b.title, undefined, {numeric: true}));
        const i = ctx.findIndex(m => m.id === currentManga.id);
        return i >= 0 && i < ctx.length - 1 ? ctx[i + 1] : null;
    }, [currentManga, mangas]);

    useEffect(() => {
        const neededKeys = new Set();
        
        if (view === 'hub') {
            mangas.forEach(m => {
                if (m.coverDouble) neededKeys.add(getFileKey(m.coverDouble));
                if (m.coverStart) neededKeys.add(getFileKey(m.coverStart));
                if (m.coverEnd) neededKeys.add(getFileKey(m.coverEnd));
                if (m.cover) neededKeys.add(getFileKey(m.cover));
            });
        }

        if (view === 'reader' && allSpreads.length > 0) {
            const addSpreadToNeeded = (index) => {
                const spread = allSpreads[index];
                if (spread) {
                    if (spread.left) neededKeys.add(getFileKey(spread.left));
                    if (spread.right) neededKeys.add(getFileKey(spread.right));
                    if (spread.center) neededKeys.add(getFileKey(spread.center));
                }
            };

            for (let i = cursor - 2; i <= cursor + 3; i++) addSpreadToNeeded(i);
            if (prevCursor !== null) addSpreadToNeeded(prevCursor);
        }

        if (view === 'reader' && nextChapter) {
            if (nextChapter.coverDouble) neededKeys.add(getFileKey(nextChapter.coverDouble));
            if (nextChapter.coverStart) neededKeys.add(getFileKey(nextChapter.coverStart));
            if (nextChapter.cover) neededKeys.add(getFileKey(nextChapter.cover));
        }

        for (const [key, url] of globalImageCache.entries()) {
            if (!neededKeys.has(key)) {
                URL.revokeObjectURL(url);
                globalImageCache.delete(key);
            }
        }

        if (view === 'reader') {
            const preloadFile = (file) => {
                if (!file) return;
                const key = getFileKey(file);
                if (key && !globalImageCache.has(key)) {
                    const url = getCachedUrl(file);
                    if (url) {
                        const img = new Image();
                        img.decoding = "async";
                        img.src = url; 
                    }
                }
            };
            
            for (let i = cursor; i <= cursor + 3; i++) {
                const spread = allSpreads[i];
                if (spread) {
                    preloadFile(spread.left);
                    preloadFile(spread.right);
                    preloadFile(spread.center);
                }
            }
        }
    }, [cursor, prevCursor, allSpreads, view, mangas]);

    const toggleSelectAllMangas = useCallback((allFilteredIds) => {
        setSelectedMangas(prev => {
            if (prev.size === allFilteredIds.length && allFilteredIds.length > 0) return new Set();
            return new Set(allFilteredIds);
        });
        triggerHaptic(20);
    }, []);

    const markAsRead = useCallback(async (manga) => {
        const db = await initDB();
        const tx = db.transaction(STORE_MANGAS, "readwrite");
        tx.objectStore(STORE_MANGAS).get(manga.id).onsuccess = (e) => {
            const m = e.target.result;
            if (m) { m.lastRead = Date.now(); tx.objectStore(STORE_MANGAS).put(m); }
        };
    }, []);

    const handleOpenManga = useCallback((m, e, skipAnimation = false) => {
        if (skipAnimation) {
            setCurrentManga(m);
            setCursor(m.bookmark != null ? m.bookmark : 0);
            setView('reader');
            setZenMode(true);
            markAsRead(m);
            return;
        }
        let rect = { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };
        if (e && e.currentTarget) {
            const coverNode = e.currentTarget.querySelector('.manga-cover-image');
            if (coverNode) rect = coverNode.getBoundingClientRect();
            else rect = e.currentTarget.getBoundingClientRect();
        } else {
            const fallback = document.getElementById('inspect-book-container');
            if (fallback) rect = fallback.getBoundingClientRect();
        }
        setAnimatingManga({ manga: m, rect, phase: 'start' });
    }, [markAsRead]);

    // 👉 La fonction modifiée pour capturer les coordonnées
    const handleInspectManga = useCallback((manga, e) => {
        if (e && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            setInspectingCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
        } else {
            setInspectingCoords(null);
        }
        setInspectingManga(manga);
    }, []);

    useEffect(() => {
        if (animatingManga && animatingManga.phase === 'start') {
            const rAF = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimatingManga(prev => prev ? { ...prev, phase: 'expanding' } : null);
                });
            });
            return () => cancelAnimationFrame(rAF);
        }
    }, [animatingManga?.phase]);

    useEffect(() => {
        if (animatingManga && animatingManga.phase === 'expanding') {
            const timer = setTimeout(() => {
                const m = animatingManga.manga;
                setCurrentManga(m);
                setCursor(m.bookmark != null ? m.bookmark : 0);
                setView('reader');
                setZenMode(true);
                markAsRead(m);
                setTimeout(() => setAnimatingManga(null), 50);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [animatingManga?.phase]);

    const handleCloseReader = useCallback((e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (currentManga && allSpreads) saveProgress(currentManga.id, cursor, cursor >= allSpreads.length - 1, allSpreads.length);
        setIsExitingReader(true);
        setTimeout(() => {
            setView('hub');
            setZenMode(false);
            loadMangas();
            setIsExitingReader(false);
        }, 400);
    }, [currentManga, allSpreads, cursor]);

    const handleExport = async () => {
        setLoading(true); setImportProgress("Préparation export JSON...");
        try {
            const db = await initDB();
            const allMangasMeta = await new Promise(res => {
                db.transaction(STORE_MANGAS, "readonly").objectStore(STORE_MANGAS).getAll().onsuccess = e => res(e.target.result);
            });
            const allPages = await new Promise(res => {
                db.transaction(STORE_PAGES, "readonly").objectStore(STORE_PAGES).getAll().onsuccess = e => res(e.target.result);
            });
            
            const pagesMap = {};
            allPages.forEach(p => pagesMap[p.id] = p.pages);

            const chunks = [];
            chunks.push(new Blob(["[\n"], { type: "application/json" }));

            for (let i = 0; i < allMangasMeta.length; i++) {
                setImportProgress(`Compression Manga (${i+1}/${allMangasMeta.length})...`);
                await new Promise(r => setTimeout(r, 10));
                
                const meta = allMangasMeta[i];
                const rawPages = pagesMap[meta.id] || [];
                delete pagesMap[meta.id]; 
                
                const metaToEncode = { ...meta };
                const coverKeys = ['coverDouble', 'coverStart', 'coverEnd', 'cover'];
                for (const k of coverKeys) {
                    if (metaToEncode[k]) metaToEncode[k] = await encodeFile(metaToEncode[k]);
                }
                
                const metaStr = JSON.stringify(metaToEncode);
                chunks.push(new Blob([metaStr.slice(0,-1) + `,"pages":[`], { type: "application/json" }));
                
                const BATCH_SIZE = 15;
                for (let pIdx = 0; pIdx < rawPages.length; pIdx += BATCH_SIZE) {
                    setImportProgress(`Compression Manga (${i+1}/${allMangasMeta.length}) - Pages ${pIdx}...`);
                    const end = Math.min(pIdx + BATCH_SIZE, rawPages.length);
                    const batchProms = [];
                    for (let k = pIdx; k < end; k++) batchProms.push(encodeFile(rawPages[k]));
                    const encodedBatch = await Promise.all(batchProms);
                    
                    for (let k = 0; k < encodedBatch.length; k++) {
                        const globalIdx = pIdx + k;
                        chunks.push(new Blob([JSON.stringify(encodedBatch[k]) + (globalIdx < rawPages.length - 1 ? "," : "")], { type: "application/json" }));
                        rawPages[globalIdx] = null;
                    }
                    await new Promise(r => setTimeout(r, 0));
                }
                
                chunks.push(new Blob(["]}" + (i < allMangasMeta.length - 1 ? ",\n" : "")], { type: "application/json" }));
                await new Promise(r => setTimeout(r, 20));
            }
            
            chunks.push(new Blob(["\n]"], { type: "application/json" }));
            setImportProgress("Assemblage final...");
            await new Promise(r => setTimeout(r, 50));
            
            const jsonBlob = new Blob(chunks, { type: "application/json" });

            setImportProgress("Compression ZIP...");
            await new Promise(r => setTimeout(r, 50));
            const zip = new JSZip();
            zip.file("MangaHub_Backup.json", jsonBlob);
            const finalBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });

            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement("a"); 
            a.style.display = "none";
            a.href = url; 
            a.download = `MangaHub_Backup.zip`; 
            document.body.appendChild(a); 
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            setImportProgress(null); setLoading(false); setShowGlobalSettings(false); showToast("Sauvegarde ZIP exportée avec succès", "success");
        } catch (err) { console.error(err); showToast("Erreur lors de l'export.", "error"); setLoading(false); setImportProgress(null); }
    };

    const handleImport = async (e) => {
        let file = e.target.files[0]; if (!file) return;
        setLoading(true); setImportProgress("Initialisation...");
        try {
            if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
                setImportProgress("Décompression de l'archive...");
                const zip = new JSZip();
                await zip.loadAsync(file);
                const jsonFileInZip = zip.file("MangaHub_Backup.json");
                if (!jsonFileInZip) {
                    throw new Error("Le fichier MangaHub_Backup.json est introuvable dans l'archive ZIP.");
                }
                file = await jsonFileInZip.async("blob");
            }
            await new Promise(r => setTimeout(r, 30));
            const db = await initDB();
            let processed = 0;

            const chunkSize = 1024 * 1024 * 4;
            let offset = 0;
            let buffer = "";
            let depth = 0;
            let inString = false;
            let escapeNext = false;
            let objStart = -1;
            let scanIndex = 0;
            const decoder = new TextDecoder("utf-8");

            while (offset < file.size) {
                setImportProgress(`Analyse... ${Math.round((offset / file.size) * 100)}%`);

                const sliceEnd = Math.min(offset + chunkSize, file.size);
                const chunkBuffer = await file.slice(offset, sliceEnd).arrayBuffer();
                buffer += decoder.decode(chunkBuffer, { stream: true });
                offset = sliceEnd;

                while (scanIndex < buffer.length) {
                    const char = buffer[scanIndex];
                    if (escapeNext) { escapeNext = false; }
                    else if (char === '\\') { escapeNext = true; }
                    else if (char === '"') { inString = !inString; }
                    else if (!inString) {
                        if (char === '{') { if (depth === 0) objStart = scanIndex; depth++; }
                        else if (char === '}') {
                            depth--;
                            if (depth === 0 && objStart !== -1) {
                                const item = JSON.parse(buffer.substring(objStart, scanIndex + 1));
                                buffer = buffer.substring(scanIndex + 1);
                                scanIndex = -1;
                                objStart = -1;

                                processed++;
                                setImportProgress(`Restauration manga ${processed}...`);

                                const meta = { ...item }; delete meta.pages;
                                for (const k of ['coverDouble','coverStart','coverEnd','cover']) {
                                    if (meta[k]) meta[k] = await decodeFileToIDB(meta[k]);
                                }
                                meta.totalPages = item.pages?.length || 0;

                                const rawPages = item.pages || [];
                                item.pages = null; 
                                const BATCH = 20;
                                const decPages = new Array(rawPages.length);
                                for (let b = 0; b < rawPages.length; b += BATCH) {
                                    const end = Math.min(b + BATCH, rawPages.length);
                                    const results = await Promise.all(
                                        rawPages.slice(b, end).map(p => decodeFileToIDB(p))
                                    );
                                    results.forEach((r, j) => { decPages[b + j] = r; rawPages[b + j] = null; });
                                    if (end < rawPages.length) await new Promise(r => setTimeout(r, 0));
                                }

                                await new Promise((res, rej) => {
                                    const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");
                                    tx.objectStore(STORE_MANGAS).put(meta);
                                    tx.objectStore(STORE_PAGES).put({ id: meta.id, pages: decPages });
                                    tx.oncomplete = res; tx.onerror = rej;
                                });

                                if (processed % 3 === 0) await new Promise(r => setTimeout(r, 5));
                            }
                        }
                    }
                    scanIndex++;
                }
            }

            setLoading(false); setImportProgress(null); setShowGlobalSettings(false);
            e.target.value = ''; loadMangas(); showToast("Restauration terminée !", "success");
        } catch(err) {
            console.error(err);
            showToast("Fichier invalide ou corrompu.", "error");
            setLoading(false); setImportProgress(null); e.target.value = '';
        }
    };

    const handleExportArchive = async (manga, format, e) => {
        if(e) e.stopPropagation(); setActiveCardMenu(null);
        setLoading(true); setImportProgress(`Création ${format.toUpperCase()}...`);
        try {
            const db = await initDB();
            const pagesData = await new Promise((res) => { db.transaction(STORE_PAGES).objectStore(STORE_PAGES).get(manga.id).onsuccess = ev => res(ev.target.result); });
            const fullPages = pagesData ? (pagesData.pages || []).map(deserializeFile) : [];

            const zip = new JSZip();
            const metadata = { title: manga.title || "", group: manga.group || null, direction: manga.direction || "rtl", isDoubleCover: manga.isDoubleCover || false, tags: manga.tags || [], pages: [] };
            const addFileToZip = (fileObj, nameBase) => {
                if (!fileObj) return null;
                const ext = fileObj.type === 'image/png' ? 'png' : fileObj.type === 'image/webp' ? 'webp' : 'jpg';
                const filename = `${nameBase}.${ext}`; zip.file(filename, fileObj); return filename;
            };
            const addCoverToZip = (raw, nameBase) => {
                const blob = deserializeFile(raw);
                return blob ? addFileToZip(blob, nameBase) : null;
            };
            if (manga.coverDouble) metadata.coverDouble = addCoverToZip(manga.coverDouble, "cover_double");
            if (manga.coverStart)  metadata.coverStart  = addCoverToZip(manga.coverStart,  "cover_start");
            if (manga.coverEnd)    metadata.coverEnd    = addCoverToZip(manga.coverEnd,    "cover_end");
            const fallbackCover = deserializeFile(manga.coverDouble || manga.coverStart || manga.cover);
            if (fallbackCover) addFileToZip(fallbackCover, "000_cover_preview");
            if (fullPages.length > 0) { fullPages.forEach((p, i) => { const filename = addFileToZip(p, `page_${String(i+1).padStart(3,'0')}`); if (filename) metadata.pages.push(filename); }); }
            
            zip.file("metadata.json", JSON.stringify(metadata, null, 2));
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `${(manga.title || 'Manga').replace(/[^a-z0-9]/gi,'_')}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            setLoading(false); setImportProgress(null); showToast(`Archive ${format.toUpperCase()} exportée !`, "success");
        } catch (error) { console.error(error); showToast(`Erreur lors de l'export ${format.toUpperCase()}.`, "error"); setLoading(false); setImportProgress(null); }
    };

    const encodeFile = useCallback(async (f) => {
        if (!f) return f;
        const blob = deserializeFile(f);
        if (!blob) return null;
        return { name: blob.name || 'image.jpg', type: blob.type || 'image/jpeg', data: await blobToBase64Async(blob) };
    }, []);

    const saveProgress = useCallback(async (mangaId, newCursor, isFinished = false, currentTotalSpreads = 0) => {
        const db = await initDB();
        const tx = db.transaction(STORE_MANGAS, "readwrite");
        const store = tx.objectStore(STORE_MANGAS);
        let updatedManga = null;
        tx.oncomplete = () => { 
            if (updatedManga) setMangas(prev => prev.map(m => m.id === mangaId ? updatedManga : m)); 
        };
        store.get(mangaId).onsuccess = (e) => {
            const manga = e.target.result;
            if (manga) {
                manga.progress = newCursor; manga.isFinished = isFinished;
                if (currentTotalSpreads > 0) manga.totalSpreads = currentTotalSpreads;
                if (latestBookmarkRef.current !== undefined) manga.bookmark = latestBookmarkRef.current;
                if (isFinished) { manga.bookmark = null; latestBookmarkRef.current = null; }
                manga.lastRead = Date.now();
                updatedManga = manga;
                store.put(manga);
                if (isFinished && currentManga && currentManga.id === mangaId && currentManga.bookmark != null) {
                    setCurrentManga(prev => ({...prev, bookmark: null}));
                }
            }
        };
    }, [currentManga]);

    useEffect(() => {
        if (view === 'reader' && currentManga && allSpreads) {
            const timer = setTimeout(() => { saveProgress(currentManga.id, cursor, cursor >= (allSpreads.length || 1) - 1, allSpreads.length); }, 500);
            return () => clearTimeout(timer);
        }
    }, [cursor, currentManga, view, allSpreads]);
    
    const toggleBookmark = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!currentManga) return;
        triggerHaptic(50);
        const newBookmark = currentManga.bookmark === cursor ? null : cursor;
        latestBookmarkRef.current = newBookmark;
        setCurrentManga(prev => ({...prev, bookmark: newBookmark}));
        const db = await initDB(); const tx = db.transaction(STORE_MANGAS, "readwrite");
        tx.objectStore(STORE_MANGAS).get(currentManga.id).onsuccess = (ev) => {
            const manga = ev.target.result;
            if (manga) { manga.bookmark = newBookmark; tx.objectStore(STORE_MANGAS).put(manga); }
        };
        tx.oncomplete = () => { 
            setMangas(prev => prev.map(m => m.id === currentManga.id ? { ...m, bookmark: newBookmark } : m));
            showToast(newBookmark !== null ? "Marque-page ajouté" : "Marque-page retiré", "info"); 
        };
    };

    const executeUpdateManga = async (e) => {
        e.preventDefault(); 
        const nt = e.target.title.value; 
        const ng = e.target.group.value.trim() || null;
        const nTags = e.target.tags.value.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
        setLoading(true); const db = await initDB(); const tx = db.transaction(STORE_MANGAS, "readwrite");
        tx.objectStore(STORE_MANGAS).get(editingManga.id).onsuccess = (ev) => {
            const item = ev.target.result; if (item) { item.title = nt; item.group = ng; item.tags = nTags; tx.objectStore(STORE_MANGAS).put(item); }
        };
        tx.oncomplete = () => { setLoading(false); setEditingManga(null); setActiveCardMenu(null); loadMangas(); showToast("Manga mis à jour", "success"); };
    };

    const executePurge = async () => { setLoading(true); const db = await initDB(); const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite"); tx.objectStore(STORE_MANGAS).clear(); tx.objectStore(STORE_PAGES).clear(); tx.oncomplete = () => window.location.reload(); };

    const getProgressPercent = (m) => {
        if (!m) return 0; if (m.isFinished) return 100;
        if (m.totalSpreads && m.totalSpreads > 1) return Math.min(100, Math.round((m.progress / (m.totalSpreads - 1)) * 100));
        return Math.min(100, Math.round((m.progress / Math.max(1, m.totalPages || 1)) * 100));
    };

    const toggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => !prev);
        setSelectedMangas(new Set());
    }, []);

    const toggleMangaSelection = useCallback((mangaId) => {
        setSelectedMangas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mangaId)) newSet.delete(mangaId);
            else newSet.add(mangaId);
            return newSet;
        });
        triggerHaptic(20);
    }, []);

    const executeBatchDelete = async () => {
        setLoading(true);
        const db = await initDB();
        const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");
        selectedMangas.forEach(id => {
            tx.objectStore(STORE_MANGAS).delete(id);
            tx.objectStore(STORE_PAGES).delete(id);
        });
        tx.oncomplete = () => {
            setLoading(false);
            setBatchDeleteConfirm(false);
            setIsSelectionMode(false);
            const count = selectedMangas.size;
            setSelectedMangas(new Set());
            loadMangas();
            showToast(`${count} mangas supprimés`, "error");
        };
    };

    const executeBatchEdit = async (e) => {
        e.preventDefault();
        const ng = e.target.group.value.trim();
        const nTags = e.target.tags.value.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
        
        if (!ng && nTags.length === 0) {
            setShowBatchEditModal(false);
            return;
        }

        setLoading(true);
        const db = await initDB();
        const tx = db.transaction(STORE_MANGAS, "readwrite");
        const store = tx.objectStore(STORE_MANGAS);
        
        Array.from(selectedMangas).forEach(id => {
            store.get(id).onsuccess = (ev) => {
                const item = ev.target.result;
                if (item) {
                    if (ng) item.group = ng === 'CLEAR' ? null : ng;
                    if (nTags.length > 0) {
                        const currentTags = new Set(item.tags || []);
                        nTags.forEach(t => currentTags.add(t));
                        item.tags = Array.from(currentTags);
                    }
                    store.put(item);
                }
            };
        });
        
        tx.oncomplete = () => {
            setLoading(false);
            setShowBatchEditModal(false);
            setIsSelectionMode(false);
            setSelectedMangas(new Set());
            loadMangas();
            showToast("Sélection mise à jour", "success");
        };
    };

    const libraryStructure = useMemo(() => {
        const tagsSet = new Set();
        const normalizedMangas = mangas.map(m => {
            const tSet = new Set((m.tags || []).map(t => t.toUpperCase()));
            return { ...m, tags: Array.from(tSet).sort() };
        });
        normalizedMangas.forEach(m => m.tags.forEach(t => tagsSet.add(t)));
        const allAvailableTags = Array.from(tagsSet).sort();
        
        let filtered = normalizedMangas.filter(m => {
            const matchSearch = m.title.toLowerCase().includes(deferredSearch.toLowerCase()) || (m.group && m.group.toLowerCase().includes(deferredSearch.toLowerCase()));
            const matchTags = activeTags.length === 0 || activeTags.every(t => m.tags.includes(t));
            const matchBookmark = showBookmarksOnly ? (m.bookmark != null) : true;
            return matchSearch && matchTags && matchBookmark;
        });

        const shelvesMap = {};
        filtered.forEach(m => {
            const g = m.group || "Volumes Indépendants";
            if (!shelvesMap[g]) shelvesMap[g] = { title: g, mangas: [], date: m.date };
            shelvesMap[g].mangas.push(m);
            if (m.date > shelvesMap[g].date) shelvesMap[g].date = m.date;
        });

        const sortedShelves = Object.values(shelvesMap).sort((a, b) => {
            if (a.title === "Volumes Indépendants") return 1;
            if (b.title === "Volumes Indépendants") return -1;
            return a.title.localeCompare(b.title);
        });

        sortedShelves.forEach(s => s.mangas.sort((a,b) => a.title.localeCompare(b.title, undefined, {numeric: true})));

        const flattened = [];
        sortedShelves.forEach((shelf, shelfIndex) => {
            shelf.mangas.forEach((m, mIndex) => {
                flattened.push({ type: 'manga', data: m, group: shelf.title, isFirst: mIndex === 0 });
            });
            if (shelfIndex < sortedShelves.length - 1) flattened.push({ type: 'separator', key: `sep-${shelfIndex}` });
        });

        return { shelves: sortedShelves, flattened, allAvailableTags };
    }, [mangas, deferredSearch, activeTags, showBookmarksOnly]);

    const prevOrientation = useRef(effectiveLandscape);
    const prevSpreadsRef = useRef(allSpreads);

    useEffect(() => {
        if (prevOrientation.current !== effectiveLandscape && allSpreads && allSpreads.length > 0) {
            const oldSpreads = prevSpreadsRef.current; const currentSpread = oldSpreads[cursor];
            if (currentSpread && currentSpread.pageIndices) {
                const isRTL = currentManga?.direction === 'rtl'; let targetPage = currentSpread.pageIndices[0];
                if (prevOrientation.current === true && effectiveLandscape === false && currentSpread.pageIndices.length === 2) { targetPage = isRTL ? currentSpread.pageIndices[0] : currentSpread.pageIndices[1]; }
                const newCursor = allSpreads.findIndex(s => s.pageIndices.includes(targetPage));
                if (newCursor !== -1 && newCursor !== cursor) { setCursor(newCursor); }
            }
            prevOrientation.current = effectiveLandscape;
        }
        prevSpreadsRef.current = allSpreads;
    }, [effectiveLandscape, allSpreads, currentManga, cursor]);

    const handleSetCursor = useCallback((newVal, fromTap = null) => {
        if (newVal === cursor) return;
        if (fromTap) { setEdgeGlow(fromTap); setTimeout(() => setEdgeGlow(null), 400); }
        setPrevCursor(cursor); setSlideDir(newVal > cursor ? 'next' : 'prev'); setCursor(newVal); setShowNextChapterOverlay(false); setTimeout(() => setPrevCursor(null), 1000);
    }, [cursor]);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            if (document.exitFullscreen) await document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (view !== 'reader' || isAdding || showGlobalSettings || !allSpreads || activeCardMenu) return;
            const isRTL = currentManga?.direction === 'rtl';
            if (e.key === 'Escape') { handleCloseReader(); return; }
            if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }

            if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) {
                if (e.key === ' ') e.preventDefault(); const goNext = isRTL && e.key !== ' ' ? false : true;
                if (goNext) { if (cursor < allSpreads.length - 1) handleSetCursor(cursor + 1, 'right'); else { setShowNextChapterOverlay(true); triggerHaptic([50, 100, 50]); } } 
                else { if (showNextChapterOverlay) setShowNextChapterOverlay(false); else if (cursor > 0) handleSetCursor(cursor - 1, 'right'); }
            } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || (e.key === ' ' && e.shiftKey)) {
                if (e.key === ' ' || e.key === 'Backspace') e.preventDefault(); const goNext = isRTL && e.key === 'ArrowLeft' ? true : false;
                if (goNext) { if (cursor < allSpreads.length - 1) handleSetCursor(cursor + 1, 'left'); else { setShowNextChapterOverlay(true); triggerHaptic([50, 100, 50]); } } 
                else { if (showNextChapterOverlay) setShowNextChapterOverlay(false); else if (cursor > 0) handleSetCursor(cursor - 1, 'left'); }
            } else if (e.key === 'ArrowUp') { setZenMode(prev => !prev); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, cursor, allSpreads, showNextChapterOverlay, isAdding, showGlobalSettings, currentManga, activeCardMenu, handleCloseReader]);

    const wheelTimeout = useRef(null);
    const handleWheel = useCallback((e) => {
        if (view !== 'reader' || showNextChapterOverlay) return;
        if (wheelTimeout.current) return;
        
        const isRTL = currentManga?.direction === 'rtl';
        let goNext = false; let goPrev = false;

        if (e.deltaY > 40) { goNext = isRTL ? false : true; goPrev = isRTL ? true : false; }
        else if (e.deltaY < -40) { goNext = isRTL ? true : false; goPrev = isRTL ? false : true; }

        if (goNext) {
            if (cursor < allSpreads.length - 1) handleSetCursor(cursor + 1, isRTL ? 'left' : 'right');
            else { setShowNextChapterOverlay(true); triggerHaptic([50, 100, 50]); }
        } else if (goPrev) {
            if (cursor > 0) handleSetCursor(cursor - 1, isRTL ? 'right' : 'left');
        }

        if (goNext || goPrev) {
            wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null; }, 600);
        }
    }, [view, cursor, allSpreads, currentManga, showNextChapterOverlay]);

    const { inspectorPrev, inspectorNext } = useMemo(() => {
        if (!inspectingManga) return { inspectorPrev: null, inspectorNext: null };
        let ctx = inspectingManga.group
            ? mangas.filter(m => m.group === inspectingManga.group)
            : mangas.filter(m => !m.group);
        ctx.sort((a,b) => a.title.localeCompare(b.title, undefined, {numeric: true}));
        const idx = ctx.findIndex(m => m.id === inspectingManga.id);
        return { inspectorPrev: idx > 0 ? ctx[idx-1] : null, inspectorNext: idx >= 0 && idx < ctx.length-1 ? ctx[idx+1] : null };
    }, [inspectingManga, mangas]);

    const handleInstallApp = useCallback(() => { 
        if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => setDeferredPrompt(null)); } 
    }, [deferredPrompt]);

    return (
        <div className="h-full w-full bg-black text-white flex flex-col items-center">
            
            {view === 'hub' && (
                <HubView 
                    animatingManga={animatingManga} search={search} setSearch={setSearch} deferredPrompt={deferredPrompt} handleInstallApp={handleInstallApp}
                    showBookmarksOnly={showBookmarksOnly} setShowBookmarksOnly={setShowBookmarksOnly} setIsAdding={setIsAdding} showGlobalSettings={showGlobalSettings}
                    setShowGlobalSettings={setShowGlobalSettings} appTheme={appTheme} setAppTheme={setAppTheme} shelfTheme={shelfTheme} setShelfTheme={setShelfTheme}
                    handleExport={handleExport} handleImport={handleImport} setPurgeConfirm={setPurgeConfirm} showTags={showTags}
                    setShowTags={setShowTags} activeTags={activeTags} setActiveTags={setActiveTags} libraryStructure={libraryStructure}
                    handleOpenManga={handleOpenManga} setActiveCardMenu={setActiveCardMenu}
                    isSelectionMode={isSelectionMode} selectedMangas={selectedMangas}
                    toggleMangaSelection={toggleMangaSelection} toggleSelectAllMangas={toggleSelectAllMangas} 
                    toggleSelectionMode={toggleSelectionMode} setShowBatchEditModal={setShowBatchEditModal}
                    setBatchDeleteConfirm={setBatchDeleteConfirm} setInspectingManga={handleInspectManga}
                />
            )}

            {view === 'reader' && (
                <ReaderView 
                    isNightMode={isNightMode} setIsNightMode={setIsNightMode} isExitingReader={isExitingReader} zenMode={zenMode} setZenMode={setZenMode}
                    handleCloseReader={handleCloseReader} currentTime={currentTime} toggleFullscreen={toggleFullscreen} toggleBookmark={toggleBookmark} currentManga={currentManga}
                    cursor={cursor} handleSetCursor={handleSetCursor} edgeGlow={edgeGlow} currentPages={currentPages} allSpreads={allSpreads} isLandscape={effectiveLandscape}
                    prevCursor={prevCursor} slideDir={slideDir} handleWheel={handleWheel}
                    showNextChapterOverlay={showNextChapterOverlay} setShowNextChapterOverlay={setShowNextChapterOverlay} nextChapter={nextChapter} saveProgress={saveProgress}
                    setCurrentManga={setCurrentManga} setCursor={setCursor} markAsRead={markAsRead} toggleDisplayMode={toggleDisplayMode}
                    showSpine={showSpine} toggleSpine={() => setShowSpine(p => !p)}
                />
            )}

            {inspectingManga && (
                <MangaInspector 
                    manga={inspectingManga} 
                    inspectingCoords={inspectingCoords} 
                    onClose={() => setInspectingManga(null)} 
                    onRead={(m, e, skipAnim) => {
                        handleOpenManga(m, e, skipAnim);
                        setTimeout(() => setInspectingManga(null), skipAnim ? 0 : 100);
                    }}
                    isAnimatingOut={!!animatingManga}
                    onOpenMenu={(m) => {
                        setInspectingManga(null);
                        setTimeout(() => setActiveCardMenu(m), 300);
                    }}
                    hasPrev={!!inspectorPrev}
                    hasNext={!!inspectorNext}
                    onPrev={() => { triggerHaptic(30); setInspectingManga(inspectorPrev); }}
                    onNext={() => { triggerHaptic(30); setInspectingManga(inspectorNext); }}
                />
            )}

            <MangaActionsModal activeCardMenu={activeCardMenu} onClose={() => setActiveCardMenu(null)} onEdit={(manga) => setEditingManga(manga)} onExport={handleExportArchive} onDelete={(id) => { setActiveCardMenu(null); setDeleteConfirm(id); }} />
            <EditMangaModal editingManga={editingManga} onClose={() => setEditingManga(null)} onSubmit={executeUpdateManga} existingGroups={existingGroups} />
            <BatchEditModal isOpen={showBatchEditModal} count={selectedMangas.size} onClose={() => setShowBatchEditModal(false)} onSubmit={executeBatchEdit} />
            <ConfirmModal 
                isOpen={deleteConfirm !== null || purgeConfirm || batchDeleteConfirm} 
                title={batchDeleteConfirm ? `Supprimer ${selectedMangas.size} mangas ?` : "Confirmer ?"}
                onCancel={() => { setDeleteConfirm(null); setPurgeConfirm(false); setBatchDeleteConfirm(false); }} 
                onConfirm={() => { 
                    if (batchDeleteConfirm) { executeBatchDelete(); }
                    else if (deleteConfirm) { initDB().then(db => { const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite"); tx.objectStore(STORE_MANGAS).delete(deleteConfirm); tx.objectStore(STORE_PAGES).delete(deleteConfirm); tx.oncomplete = () => { setDeleteConfirm(null); loadMangas(); showToast("Manga supprimé", "error"); }; }); } 
                    else { executePurge(); } 
                }} 
            />
            {isAdding && (<AddChapterModal onClose={() => setIsAdding(false)} onSuccess={() => { setIsAdding(false); loadMangas(); }} setLoading={setLoading} setImportProgress={setImportProgress} showToast={showToast} existingGroups={existingGroups} />)}
            <LoadingOverlay loading={loading} importProgress={importProgress} />
            <ToastNotification toast={toast} />

            {animatingManga && (
                <div className="fixed inset-0 z-[2000] pointer-events-none">
                    <div className="absolute inset-0 bg-black transition-opacity duration-[500ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ opacity: animatingManga.phase === 'expanding' ? 1 : 0 }} />
                    <div className="absolute overflow-hidden transition-[top,left,width,height,border-radius] duration-[500ms] ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
                        style={{ top: animatingManga.phase === 'expanding' ? '0px' : animatingManga.rect.top + 'px', left: animatingManga.phase === 'expanding' ? '0px' : animatingManga.rect.left + 'px', width: animatingManga.phase === 'expanding' ? '100vw' : animatingManga.rect.width + 'px', height: animatingManga.phase === 'expanding' ? '100vh' : animatingManga.rect.height + 'px', borderRadius: animatingManga.phase === 'expanding' ? '0px' : '16px', transform: 'translateZ(0)' }}>
                        <StackThumbnail file={animatingManga.manga.coverDouble || animatingManga.manga.coverStart || animatingManga.manga.cover} contain={true} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;