import {
  IconTrash,
  IconSettings,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconUpload,
  IconLibrary,
  IconBookPlus,
  IconBookmarkOutline,
  IconBookmarkFilled,
  IconMoon,
  IconSun,
  IconSinglePage,
  IconDoublePage,
  IconFloppyUp,
  IconFloppyDown,
  IconMoreVertical,
  IconPlay,
  IconMaximize,
  IconCheck,
  IconCheckSquare,
  IconFilter,
  IconReverse,
} from "./components/Icons";
import {
  STORE_MANGAS,
  STORE_PAGES,
  triggerHaptic,
  initDB,
  blobToBase64Async,
  decodeFileToIDB,
  deserializeFile,
  getCachedUrl,
  globalImageCache,
  getFileKey,
} from "./utils";
import HubView from "./components/HubView";
import {
  ToastNotification,
  LoadingOverlay,
  ConfirmModal,
} from "./components/Modals";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
  lazy,
} from "react";
import JSZip from "jszip";
import { polyfill } from "mobile-drag-drop";
import { useToast } from "./hooks/useToast";
import { useSettings } from "./hooks/useSettings";
import { useFullscreen } from "./hooks/useFullscreen";

// --- Lazy Loading des composants lourds ou non-critiques ---
const ReaderView = lazy(() => import("./components/ReaderView"));
const MangaInspector = lazy(() => import("./components/MangaInspector"));
const AddChapterModal = lazy(() =>
  import("./components/Forms").then((module) => ({
    default: module.AddChapterModal,
  })),
);
const EditMangaModal = lazy(() =>
  import("./components/Forms").then((module) => ({
    default: module.EditMangaModal,
  })),
);
const BatchEditModal = lazy(() =>
  import("./components/Forms").then((module) => ({
    default: module.BatchEditModal,
  })),
);
const MangaActionsModal = lazy(() =>
  import("./components/Modals").then((module) => ({
    default: module.MangaActionsModal,
  })),
);

window.addEventListener(
  "touchmove",
  function (e) {
    if (window.visualViewport && window.visualViewport.scale > 1.05) return;

    // SÉCURITÉ APPLE PENCIL : Le stylet tremble naturellement.
    // Si on bloque un micro-mouvement, Safari annule le clic !
    if (e.target && e.target.closest) {
      // On exempte tous les éléments interactifs pour laisser passer le clic
      if (
        e.target.closest(
          "button, label, input, select, textarea, .manga-cover-image",
        )
      ) {
        return;
      }
      // On exempte aussi les fonds noirs des modales pour pouvoir cliquer à côté et les fermer
      if (
        e.target.classList &&
        e.target.classList.contains("fixed") &&
        e.target.classList.contains("inset-0")
      ) {
        return;
      }
    }

    if (
      e.target &&
      e.target.closest(".custom-scrollbar") === null &&
      e.target.closest(".shelf-scroll") === null
    ) {
      e.preventDefault();
    }
  },
  { passive: false },
);

polyfill({ holdToDrag: 250 });

import StackThumbnail from "./components/StackThumbnail";

// --- APPLICATION ROOT ---
const App = () => {
  const { toast, showToast } = useToast();

  const {
    isLandscape,
    effectiveLandscape,
    toggleDisplayMode,
    appTheme,
    setAppTheme,
    isNightMode,
    setIsNightMode,
    showSpine,
    setShowSpine,
    shelfTheme,
    setShelfTheme,
    pageAnimationsEnabled,
    setPageAnimationsEnabled,
    soundVolume,
    setSoundVolume,
    ledIntensity,
    setLedIntensity,
    animationSpeed,
    setAnimationSpeed,
  } = useSettings();

  const [view, setView] = useState("hub");
  const [mangas, setMangas] = useState([]);
  const [currentManga, setCurrentManga] = useState(null);

  // ANTI-RACE CONDITION : On garde une trace instantanée du marque-page
  const latestBookmarkRef = useRef(null);

  const [currentPages, setCurrentPages] = useState([]);
  const [animatingManga, setAnimatingManga] = useState(null);
  const [isExitingReader, setIsExitingReader] = useState(false);

  const [inspectingManga, setInspectingManga] = useState(null);

  // 👉 On ajoute l'état pour sauvegarder les coordonnées du clic
  const [lastOpenRect, setLastOpenRect] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [pendingPageIndex, setPendingPageIndex] = useState(null);
  const [isJumping, setIsJumping] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [showNextChapterOverlay, setShowNextChapterOverlay] = useState(false);
  const [slideDir, setSlideDir] = useState("next");
  const [prevCursor, setPrevCursor] = useState(null);
  const [edgeGlow, setEdgeGlow] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [editingManga, setEditingManga] = useState(null);
  const [activeCardMenu, setActiveCardMenu] = useState(null);

  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMangas, setSelectedMangas] = useState(new Set());
  const [isClosingReaderWithAnim, setIsClosingReaderWithAnim] = useState(false);
  const appRef = useRef(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const [deletingMangas, setDeletingMangas] = useState(new Set());
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);

  const pageTurnSound = useMemo(() => {
    const audio = new Audio("/mangahub-pro/page-turn.mp3");
    audio.oncanplaythrough = () => {
      setSoundLoaded(true);
    };
    audio.onerror = () => {
      setSoundLoaded(false);
      console.warn(
        "Attention : Le fichier son 'page-turn.mp3' n'a pas pu être chargé. Assurez-vous qu'il se trouve dans le dossier /public.",
      );
    };
    return audio;
  }, []);

  useEffect(() => {
    if (pageTurnSound) {
      pageTurnSound.volume = soundVolume;
    }
  }, [soundVolume, pageTurnSound]);

  const { existingGroups, existingTags, existingArtists, seriesByAuthor } =
    useMemo(() => {
      const g = new Set();
      const t = new Set();
      const a = new Set();
      const seriesByAuthor = new Map();

      mangas.forEach((m) => {
        if (m.group) g.add(m.group);
        if (m.tags) m.tags.forEach((tag) => t.add(tag));
        if (m.artist) a.add(m.artist);

        const authorKey = m.artist ? m.artist.toUpperCase().trim() : null;
        if (m.group) {
          if (!seriesByAuthor.has(authorKey)) {
            seriesByAuthor.set(authorKey, new Set());
          }
          seriesByAuthor.get(authorKey).add(m.group);
        }
      });

      const sortFn = (x, y) => x.localeCompare(y, undefined, { numeric: true });

      const seriesByAuthorSorted = new Map();
      seriesByAuthor.forEach((seriesSet, author) => {
        seriesByAuthorSorted.set(author, Array.from(seriesSet).sort(sortFn));
      });

      return {
        existingGroups: Array.from(g).sort(sortFn),
        existingTags: Array.from(t).sort(sortFn),
        existingArtists: Array.from(a).sort(sortFn),
        seriesByAuthor: seriesByAuthorSorted,
      };
    }, [mangas]);

  const { isFullscreen, toggleFullscreen } = useFullscreen(setZenMode);

  const loadMangas = useCallback(async () => {
    const db = await initDB();
    db.transaction(STORE_MANGAS).objectStore(STORE_MANGAS).getAll().onsuccess =
      (e) => {
        const loadedMangas = e.target.result || [];
        setMangas(loadedMangas);
      };
  }, []);
  useEffect(() => {
    loadMangas();
  }, []);

  useEffect(() => {
    if (view === "reader" && currentManga) {
      // NETTOYAGE IMMÉDIAT : On vide les pages dès que le manga change
      // pour éviter d'afficher brièvement les pages du manga précédent.
      setCurrentPages([]);

      initDB().then((db) => {
        db
          .transaction(STORE_PAGES)
          .objectStore(STORE_PAGES)
          .get(currentManga.id).onsuccess = (e) => {
          if (e.target.result) {
            setCurrentPages(e.target.result.pages || []);
          }
        };
      });
    } else {
      setCurrentPages([]);
    }
  }, [view, currentManga]);

  const allSpreads = useMemo(() => {
    if (!currentManga || !currentPages || currentPages.length === 0) return [];
    let p = currentPages;
    const startName = currentManga.coverStart?.name;
    const endName = currentManga.coverEnd?.name;
    const doubleName = currentManga.coverDouble?.name;
    if (startName || endName || doubleName)
      p = p.filter(
        (page) =>
          page.name !== startName &&
          page.name !== endName &&
          page.name !== doubleName,
      );

    const spreads = [];
    const isRTL = currentManga.direction === "rtl";
    const hasDoubleCover = !!currentManga.coverDouble;

    if (effectiveLandscape) {
      if (hasDoubleCover) {
        spreads.push({
          center: currentManga.coverDouble,
          info: "Jaquette Complète",
          pageIndices: [-1],
        });
      } else if (
        currentManga.isDoubleCover &&
        currentManga.coverStart &&
        currentManga.coverEnd
      ) {
        if (isRTL)
          spreads.push({
            left: currentManga.coverStart,
            right: currentManga.coverEnd,
            info: "Couvertures",
            pageIndices: [-1],
          });
        else
          spreads.push({
            left: currentManga.coverEnd,
            right: currentManga.coverStart,
            info: "Couvertures",
            pageIndices: [-1],
          });
      } else {
        const cover = currentManga.coverStart || currentManga.cover;
        if (cover) {
          if (isRTL)
            spreads.push({
              left: cover,
              right: null,
              info: "Couverture",
              pageIndices: [-1],
            });
          else
            spreads.push({
              left: null,
              right: cover,
              info: "Couverture",
              pageIndices: [-1],
            });
        }
      }
      for (let i = 0; i < p.length; i += 2) {
        const next = p[i + 1];
        if (!next) {
          if (isRTL)
            spreads.push({
              left: null,
              right: p[i],
              info: `Page ${i + 1}`,
              pageIndices: [i],
            });
          else
            spreads.push({
              left: p[i],
              right: null,
              info: `Page ${i + 1}`,
              pageIndices: [i],
            });
        } else if (isRTL)
          spreads.push({
            left: p[i + 1],
            right: p[i],
            info: `Pages ${i + 2} - ${i + 1}`,
            pageIndices: [i, i + 1],
          });
        else
          spreads.push({
            left: p[i],
            right: p[i + 1],
            info: `Pages ${i + 1} - ${i + 2}`,
            pageIndices: [i, i + 1],
          });
      }
      if (
        currentManga.coverEnd &&
        !hasDoubleCover &&
        !currentManga.isDoubleCover
      ) {
        if (isRTL)
          spreads.push({
            left: null,
            right: currentManga.coverEnd,
            info: "Couverture Fin",
            pageIndices: [-2],
          });
        else
          spreads.push({
            left: currentManga.coverEnd,
            right: null,
            info: "Couverture Fin",
            pageIndices: [-2],
          });
      }
    } else {
      const startCover =
        currentManga.coverStart ||
        currentManga.coverDouble ||
        currentManga.cover;
      if (startCover)
        spreads.push({
          center: startCover,
          info: "Couverture Début",
          pageIndices: [-1],
        });
      p.forEach((page, i) =>
        spreads.push({ center: page, info: `Page ${i + 1}`, pageIndices: [i] }),
      );
      if (currentManga.coverEnd)
        spreads.push({
          center: currentManga.coverEnd,
          info: "Couverture Fin",
          pageIndices: [-2],
        });
    }
    return spreads;
  }, [currentManga, currentPages, effectiveLandscape]);

  useEffect(() => {
    if (pendingPageIndex == null || allSpreads.length === 0) return;
    const spreadIdx = allSpreads.findIndex((s) =>
      s.pageIndices?.includes(pendingPageIndex),
    );
    if (spreadIdx >= 0) {
      setCursor(spreadIdx);
      setPendingPageIndex(null);
      setIsJumping(false);
    }
  }, [allSpreads, pendingPageIndex]);

  const nextChapter = useMemo(() => {
    if (!currentManga || !currentManga.group) return null; // FIX: Les mangas sans groupe ne s'enchaînent plus

    const ctx = mangas.filter((m) => m.group === currentManga.group);
    ctx.sort((a, b) => {
      const oA = a.order ?? 999999;
      const oB = b.order ?? 999999;
      if (oA !== oB) return oA - oB;
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
    const i = ctx.findIndex((m) => m.id === currentManga.id);
    return i >= 0 && i < ctx.length - 1 ? ctx[i + 1] : null;
  }, [currentManga, mangas]);

  // Précharge les images pour le lecteur afin d'améliorer la fluidité de la navigation.
  // La logique de cache LRU dans `utils.js` gère automatiquement la mémoire.
  useEffect(() => {
    if (view !== "reader" || !allSpreads.length) return;

    const preloadFile = (file) => {
      if (!file) return;
      // getCachedUrl va soit récupérer l'URL du cache (et la marquer comme récemment utilisée),
      // soit la créer et l'ajouter au cache.
      const url = getCachedUrl(file);
      if (url) {
        // Créer un objet Image force le navigateur à télécharger l'image.
        const img = new Image();
        img.src = url;
      }
    };

    // Précharge les 3 prochaines doubles-pages.
    for (let i = cursor + 1; i <= cursor + 3; i++) {
      if (i < allSpreads.length) {
        const spread = allSpreads[i];
        if (spread) {
          preloadFile(spread.left);
          preloadFile(spread.right);
          preloadFile(spread.center);
        }
      }
    }
  }, [view, cursor, allSpreads]);

  const toggleSelectAllMangas = useCallback((allFilteredIds) => {
    setSelectedMangas((prev) => {
      if (prev.size === allFilteredIds.length && allFilteredIds.length > 0)
        return new Set();
      return new Set(allFilteredIds);
    });
    triggerHaptic(20);
  }, []);

  const markAsRead = useCallback(async (manga) => {
    const db = await initDB();
    const tx = db.transaction(STORE_MANGAS, "readwrite");
    tx.objectStore(STORE_MANGAS).get(manga.id).onsuccess = (e) => {
      const m = e.target.result;
      if (m) {
        m.lastRead = Date.now();
        tx.objectStore(STORE_MANGAS).put(m);
      }
    };
  }, []);

  const handleOpenManga = useCallback(
    (m, e, skipAnimation = false, startAtPageIndex = null) => {
      // Nettoyage pour éviter les sauts visuels
      if (currentManga?.id !== m.id) {
        setCurrentPages([]);
        setCursor(0);
      }

      if (skipAnimation) {
        setCurrentManga(m);
        if (startAtPageIndex !== null) {
          setIsJumping(true);
          setPendingPageIndex(startAtPageIndex);
        } else {
          setCursor(m.bookmark != null ? m.bookmark : 0);
        }
        setView("reader");
        setZenMode(true);
        markAsRead(m);
        return;
      }

      let rect = {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        width: 0,
        height: 0,
      };
      if (e && e.currentTarget) {
        const coverNode = e.currentTarget.querySelector(".manga-cover-image");
        if (coverNode) rect = coverNode.getBoundingClientRect();
        else rect = e.currentTarget.getBoundingClientRect();
        setLastOpenRect(rect);
      } else {
        const fallback = document.getElementById("inspect-book-container");
        if (fallback) rect = fallback.getBoundingClientRect();
      }
      setAnimatingManga({ manga: m, rect, phase: "start" });
    },
    [markAsRead, currentManga?.id],
  );

  // 👉 La fonction modifiée pour capturer les coordonnées
  const handleInspectManga = useCallback((manga, e) => {
    setIsClosingReaderWithAnim(false); // SÉCURITÉ : On s'assure que le mode "fermeture auto" est éteint
    setInspectingManga(manga);
  }, []);

  useEffect(() => {
    if (animatingManga && animatingManga.phase === "start") {
      const rAF = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatingManga((prev) =>
            prev ? { ...prev, phase: "expanding" } : null,
          );
        });
      });
      return () => cancelAnimationFrame(rAF);
    }
  }, [animatingManga?.phase]);

  useEffect(() => {
    if (animatingManga && animatingManga.phase === "expanding") {
      const timer = setTimeout(() => {
        const m = animatingManga.manga;
        setCurrentManga(m);
        setCursor(m.bookmark != null ? m.bookmark : 0);
        setView("reader");
        setZenMode(true);
        markAsRead(m);
        setTimeout(() => setAnimatingManga(null), 50);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [animatingManga?.phase]);

  const saveProgress = useCallback(
    async (mangaId, newCursor, isFinished = false, currentTotalSpreads = 0) => {
      const db = await initDB();
      const tx = db.transaction(STORE_MANGAS, "readwrite");
      const store = tx.objectStore(STORE_MANGAS);
      let updatedManga = null;
      tx.oncomplete = () => {
        if (updatedManga)
          setMangas((prev) =>
            prev.map((m) => (m.id === mangaId ? updatedManga : m)),
          );
      };
      store.get(mangaId).onsuccess = (e) => {
        const manga = e.target.result;
        if (manga) {
          manga.progress = newCursor;
          manga.isFinished = isFinished;
          if (currentTotalSpreads > 0) manga.totalSpreads = currentTotalSpreads;
          if (latestBookmarkRef.current !== undefined)
            manga.bookmark = latestBookmarkRef.current;
          if (isFinished) {
            manga.bookmark = null;
            latestBookmarkRef.current = null;
          }
          manga.lastRead = Date.now();
          updatedManga = manga;
          store.put(manga);
          if (
            isFinished &&
            currentManga &&
            currentManga.id === mangaId &&
            currentManga.bookmark != null
          ) {
            setCurrentManga((prev) => ({ ...prev, bookmark: null }));
          }
        }
      };
    },
    [currentManga],
  );

  const handleCloseReader = useCallback(
    (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (currentManga && allSpreads)
        saveProgress(
          currentManga.id,
          cursor,
          cursor >= allSpreads.length - 1,
          allSpreads.length,
        );

      if (lastOpenRect && currentManga) {
        let rect = lastOpenRect;

        // 👉 On récupère les coordonnées fraîches du livre juste avant l'animation
        const bookEl = document.getElementById(`book-${currentManga.id}`);
        if (bookEl) {
          const bRect = bookEl.getBoundingClientRect();
          if (bRect.width > 0)
            rect = {
              top: bRect.top,
              left: bRect.left,
              width: bRect.width,
              height: bRect.height,
            };
        } else {
          const searchBook = document.getElementById(
            `search-book-${currentManga.id}`,
          );
          if (searchBook) {
            const sRect = searchBook.getBoundingClientRect();
            if (sRect.width > 0)
              rect = {
                top: sRect.top,
                left: sRect.left,
                width: sRect.width,
                height: sRect.height,
              };
          }
        }

        setView("hub");
        setInspectingManga(currentManga);
        setIsClosingReaderWithAnim(true);
        setCurrentManga(null);
        setZenMode(false);
      } else {
        setIsExitingReader(true);
        setTimeout(() => {
          setView("hub");
          setZenMode(false);
          loadMangas();
          setIsExitingReader(false);
        }, 400);
      }
    },
    [currentManga, allSpreads, cursor, loadMangas, lastOpenRect, saveProgress],
  );

  const handleExport = async () => {
    setLoading(true);
    setImportProgress("Préparation export JSON...");
    try {
      const db = await initDB();
      const allMangasMeta = await new Promise((res) => {
        db
          .transaction(STORE_MANGAS, "readonly")
          .objectStore(STORE_MANGAS)
          .getAll().onsuccess = (e) => res(e.target.result);
      });
      const allPages = await new Promise((res) => {
        db
          .transaction(STORE_PAGES, "readonly")
          .objectStore(STORE_PAGES)
          .getAll().onsuccess = (e) => res(e.target.result);
      });

      const pagesMap = {};
      allPages.forEach((p) => (pagesMap[p.id] = p.pages));

      const chunks = [];
      chunks.push(new Blob(["[\n"], { type: "application/json" }));

      for (let i = 0; i < allMangasMeta.length; i++) {
        setImportProgress(
          `Compression Manga (${i + 1}/${allMangasMeta.length})...`,
        );
        await new Promise((r) => setTimeout(r, 10));

        const meta = allMangasMeta[i];
        const rawPages = pagesMap[meta.id] || [];
        delete pagesMap[meta.id];

        const metaToEncode = { ...meta };
        const coverKeys = ["coverDouble", "coverStart", "coverEnd", "cover"];
        for (const k of coverKeys) {
          if (metaToEncode[k])
            metaToEncode[k] = await encodeFile(metaToEncode[k]);
        }

        const metaStr = JSON.stringify(metaToEncode);
        chunks.push(
          new Blob([metaStr.slice(0, -1) + `,"pages":[`], {
            type: "application/json",
          }),
        );

        const BATCH_SIZE = 15;
        for (let pIdx = 0; pIdx < rawPages.length; pIdx += BATCH_SIZE) {
          setImportProgress(
            `Compression Manga (${i + 1}/${allMangasMeta.length}) - Pages ${pIdx}...`,
          );
          const end = Math.min(pIdx + BATCH_SIZE, rawPages.length);
          const batchProms = [];
          for (let k = pIdx; k < end; k++)
            batchProms.push(encodeFile(rawPages[k]));
          const encodedBatch = await Promise.all(batchProms);

          for (let k = 0; k < encodedBatch.length; k++) {
            const globalIdx = pIdx + k;
            chunks.push(
              new Blob(
                [
                  JSON.stringify(encodedBatch[k]) +
                    (globalIdx < rawPages.length - 1 ? "," : ""),
                ],
                { type: "application/json" },
              ),
            );
            rawPages[globalIdx] = null;
          }
          await new Promise((r) => setTimeout(r, 0));
        }

        chunks.push(
          new Blob(["]}" + (i < allMangasMeta.length - 1 ? ",\n" : "")], {
            type: "application/json",
          }),
        );
        await new Promise((r) => setTimeout(r, 20));
      }

      chunks.push(new Blob(["\n]"], { type: "application/json" }));
      setImportProgress("Assemblage final...");
      await new Promise((r) => setTimeout(r, 50));

      const jsonBlob = new Blob(chunks, { type: "application/json" });

      setImportProgress("Compression ZIP...");
      await new Promise((r) => setTimeout(r, 50));
      const zip = new JSZip();
      zip.file("MangaHub_Backup.json", jsonBlob);
      const finalBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `MangaHub_Backup.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setImportProgress(null);
      setLoading(false);
      setShowGlobalSettings(false);
      showToast("Sauvegarde ZIP exportée avec succès", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'export.", "error");
      setLoading(false);
      setImportProgress(null);
    }
  };

  const encodeFile = useCallback(async (f) => {
    if (!f) return f;
    const blob = deserializeFile(f);
    if (!blob) return null;
    return {
      name: blob.name || "image.jpg",
      type: blob.type || "image/jpeg",
      data: await blobToBase64Async(blob),
    };
  }, []);

  const handleImport = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setImportProgress("Initialisation...");
    try {
      if (
        file.name.endsWith(".zip") ||
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed"
      ) {
        setImportProgress("Décompression de l'archive...");
        const zip = new JSZip();
        await zip.loadAsync(file);
        const jsonFileInZip = zip.file("MangaHub_Backup.json");
        if (!jsonFileInZip) {
          throw new Error(
            "Le fichier MangaHub_Backup.json est introuvable dans l'archive ZIP.",
          );
        }
        file = await jsonFileInZip.async("blob");
      }
      await new Promise((r) => setTimeout(r, 30));
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
        setImportProgress(
          `Analyse... ${Math.round((offset / file.size) * 100)}%`,
        );

        const sliceEnd = Math.min(offset + chunkSize, file.size);
        const chunkBuffer = await file.slice(offset, sliceEnd).arrayBuffer();
        buffer += decoder.decode(chunkBuffer, { stream: true });
        offset = sliceEnd;

        while (scanIndex < buffer.length) {
          const char = buffer[scanIndex];
          if (escapeNext) {
            escapeNext = false;
          } else if (char === "\\") {
            escapeNext = true;
          } else if (char === '"') {
            inString = !inString;
          } else if (!inString) {
            if (char === "{") {
              if (depth === 0) objStart = scanIndex;
              depth++;
            } else if (char === "}") {
              depth--;
              if (depth === 0 && objStart !== -1) {
                const item = JSON.parse(
                  buffer.substring(objStart, scanIndex + 1),
                );
                buffer = buffer.substring(scanIndex + 1);
                scanIndex = -1;
                objStart = -1;

                processed++;
                setImportProgress(`Restauration manga ${processed}...`);

                const meta = { ...item };
                delete meta.pages;
                for (const k of [
                  "coverDouble",
                  "coverStart",
                  "coverEnd",
                  "cover",
                ]) {
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
                    rawPages.slice(b, end).map((p) => decodeFileToIDB(p)),
                  );
                  results.forEach((r, j) => {
                    decPages[b + j] = r;
                    rawPages[b + j] = null;
                  });
                  if (end < rawPages.length)
                    await new Promise((r) => setTimeout(r, 0));
                }

                await new Promise((res, rej) => {
                  const tx = db.transaction(
                    [STORE_MANGAS, STORE_PAGES],
                    "readwrite",
                  );
                  tx.objectStore(STORE_MANGAS).put(meta);
                  tx.objectStore(STORE_PAGES).put({
                    id: meta.id,
                    pages: decPages,
                  });
                  tx.oncomplete = res;
                  tx.onerror = rej;
                });

                if (processed % 3 === 0)
                  await new Promise((r) => setTimeout(r, 5));
              }
            }
          }
          scanIndex++;
        }
      }

      setLoading(false);
      setImportProgress(null);
      setShowGlobalSettings(false);
      e.target.value = "";
      loadMangas();
      showToast("Restauration terminée !", "success");
    } catch (err) {
      console.error(err);
      showToast("Fichier invalide ou corrompu.", "error");
      setLoading(false);
      setImportProgress(null);
      e.target.value = "";
    }
  };

  const handleExportArchive = async (manga, format, e) => {
    if (e) e.stopPropagation();
    setActiveCardMenu(null);
    setLoading(true);
    setImportProgress(`Création ${format.toUpperCase()}...`);
    try {
      const db = await initDB();
      const pagesData = await new Promise((res) => {
        db
          .transaction(STORE_PAGES)
          .objectStore(STORE_PAGES)
          .get(manga.id).onsuccess = (ev) => res(ev.target.result);
      });
      const fullPages = pagesData
        ? (pagesData.pages || []).map(deserializeFile)
        : [];

      const zip = new JSZip();
      const metadata = {
        title: manga.title || "",
        group: manga.group || null,
        direction: manga.direction || "rtl",
        isDoubleCover: manga.isDoubleCover || false,
        tags: manga.tags || [],
        pages: [],
      };
      if (manga.artist) metadata.artist = manga.artist;
      const addFileToZip = (fileObj, nameBase) => {
        if (!fileObj) return null;
        const ext =
          fileObj.type === "image/png"
            ? "png"
            : fileObj.type === "image/webp"
              ? "webp"
              : "jpg";
        const filename = `${nameBase}.${ext}`;
        zip.file(filename, fileObj);
        return filename;
      };
      const addCoverToZip = (raw, nameBase) => {
        const blob = deserializeFile(raw);
        return blob ? addFileToZip(blob, nameBase) : null;
      };
      if (manga.coverDouble)
        metadata.coverDouble = addCoverToZip(manga.coverDouble, "cover_double");
      if (manga.coverStart)
        metadata.coverStart = addCoverToZip(manga.coverStart, "cover_start");
      if (manga.coverEnd)
        metadata.coverEnd = addCoverToZip(manga.coverEnd, "cover_end");
      const fallbackCover = deserializeFile(
        manga.coverDouble || manga.coverStart || manga.cover,
      );
      if (fallbackCover) addFileToZip(fallbackCover, "000_cover_preview");
      if (fullPages.length > 0) {
        fullPages.forEach((p, i) => {
          const filename = addFileToZip(
            p,
            `page_${String(i + 1).padStart(3, "0")}`,
          );
          if (filename) metadata.pages.push(filename);
        });
      }

      zip.file("metadata.json", JSON.stringify(metadata, null, 2));
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${(manga.title || "Manga").replace(/[^a-z0-9]/gi, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setLoading(false);
      setImportProgress(null);
      showToast(`Archive ${format.toUpperCase()} exportée !`, "success");
    } catch (error) {
      console.error(error);
      showToast(`Erreur lors de l'export ${format.toUpperCase()}.`, "error");
      setLoading(false);
      setImportProgress(null);
    }
  };

  useEffect(() => {
    if (view === "reader" && currentManga && allSpreads) {
      const timer = setTimeout(() => {
        saveProgress(
          currentManga.id,
          cursor,
          cursor >= (allSpreads.length || 1) - 1,
          allSpreads.length,
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cursor, currentManga, view, allSpreads]);

  const toggleBookmark = useCallback(
    async (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!currentManga) return;
      triggerHaptic(50);
      const newBookmark = currentManga.bookmark === cursor ? null : cursor;
      latestBookmarkRef.current = newBookmark;
      setCurrentManga((prev) => ({ ...prev, bookmark: newBookmark }));
      const db = await initDB();
      const tx = db.transaction(STORE_MANGAS, "readwrite");
      tx.objectStore(STORE_MANGAS).get(currentManga.id).onsuccess = (ev) => {
        const manga = ev.target.result;
        if (manga) {
          manga.bookmark = newBookmark;
          tx.objectStore(STORE_MANGAS).put(manga);
        }
      };
      tx.oncomplete = () => {
        setMangas((prev) =>
          prev.map((m) =>
            m.id === currentManga.id ? { ...m, bookmark: newBookmark } : m,
          ),
        );
        showToast(
          newBookmark !== null ? "Marque-page ajouté" : "Marque-page retiré",
          "info",
        );
      };
    },
    [currentManga, cursor, showToast],
  );

  const executeUpdateManga = async (e, chapters, modifiedPages) => {
    if (e && e.preventDefault) e.preventDefault();
    const form = e.target;
    const nt = form.title.value;
    const ng = form.group.value.trim() || null;
    const na = form.artist.value.trim() || null;
    const nTags = form.tags.value
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    setLoading(true);
    const db = await initDB();
    const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");

    if (modifiedPages) {
      setImportProgress("Mise à jour des pages...");
      // Optimisation et sérialisation en parallèle pour la performance
      const pageProcessingPromises = modifiedPages.map((page) =>
        optimizeImage(page, 1600, 0.8).then(serializeFile),
      );
      const sOrderedPages = await Promise.all(pageProcessingPromises);
      tx.objectStore(STORE_PAGES).put({
        id: editingManga.id,
        pages: sOrderedPages,
      });
    }

    const mangaStore = tx.objectStore(STORE_MANGAS);
    mangaStore.get(editingManga.id).onsuccess = (ev) => {
      const item = ev.target.result;
      if (item) {
        item.title = nt;
        item.group = ng;
        item.artist = na;
        item.tags = nTags;
        item.chapters = chapters || [];
        if (modifiedPages) {
          item.totalPages = modifiedPages.length;
        }
        mangaStore.put(item);
      }
    };
    tx.oncomplete = () => {
      setLoading(false);
      setImportProgress(null);
      setEditingManga(null);
      setActiveCardMenu(null);
      loadMangas();
      showToast("Manga mis à jour", "success");
    };
    tx.onerror = () => {
      setLoading(false);
      setImportProgress(null);
      showToast("Erreur lors de la mise à jour.", "error");
    };
  };

  const executePurge = async () => {
    setLoading(true);
    const db = await initDB();
    const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");
    tx.objectStore(STORE_MANGAS).clear();
    tx.objectStore(STORE_PAGES).clear();
    tx.oncomplete = () => window.location.reload();
  };

  const getProgressPercent = (m) => {
    if (!m) return 0;
    if (m.isFinished) return 100;
    if (m.totalSpreads && m.totalSpreads > 1)
      return Math.min(
        100,
        Math.round((m.progress / (m.totalSpreads - 1)) * 100),
      );
    return Math.min(
      100,
      Math.round((m.progress / Math.max(1, m.totalPages || 1)) * 100),
    );
  };

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedMangas(new Set());
  }, []);

  const toggleMangaSelection = useCallback((mangaId) => {
    setSelectedMangas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mangaId)) newSet.delete(mangaId);
      else newSet.add(mangaId);
      return newSet;
    });
    triggerHaptic(20);
  }, []);

  const handleReorderManga = useCallback((draggedId, targetId) => {
    if (draggedId === targetId) return;
    let updatedMangasForDb = [];

    setMangas((prev) => {
      const draggedManga = prev.find((m) => m.id === draggedId);
      const targetManga = prev.find((m) => m.id === targetId);
      if (
        !draggedManga ||
        !targetManga ||
        draggedManga.group !== targetManga.group
      )
        return prev;

      const group = draggedManga.group;
      const shelfMangas = prev
        .filter((m) => m.group === group)
        .sort((a, b) => {
          const oA = a.order ?? 999999;
          const oB = b.order ?? 999999;
          if (oA !== oB) return oA - oB;
          return a.title.localeCompare(b.title, undefined, { numeric: true });
        });

      const fromIndex = shelfMangas.findIndex((m) => m.id === draggedId);
      const toIndex = shelfMangas.findIndex((m) => m.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return prev;

      shelfMangas.splice(fromIndex, 1);
      shelfMangas.splice(toIndex, 0, draggedManga);

      updatedMangasForDb = shelfMangas.map((m, idx) => ({ ...m, order: idx }));

      return prev.map((m) =>
        m.group === group
          ? updatedMangasForDb.find((um) => um.id === m.id) || m
          : m,
      );
    });

    if (updatedMangasForDb.length > 0) {
      initDB().then((db) => {
        const tx = db.transaction(STORE_MANGAS, "readwrite");
        const store = tx.objectStore(STORE_MANGAS);
        updatedMangasForDb.forEach((m) => store.put(m));
      });
      triggerHaptic(20);
    }
  }, []);

  const executeBatchDelete = async () => {
    setBatchDeleteConfirm(false);

    // Délai court pour laisser le fond noir de la modale disparaître
    await new Promise((r) => setTimeout(r, 150));

    setDeletingMangas(new Set(selectedMangas));
    await new Promise((r) => setTimeout(r, 400));

    setLoading(true);
    const db = await initDB();
    const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");
    selectedMangas.forEach((id) => {
      tx.objectStore(STORE_MANGAS).delete(id);
      tx.objectStore(STORE_PAGES).delete(id);
    });
    tx.oncomplete = () => {
      setLoading(false);
      setIsSelectionMode(false);
      const count = selectedMangas.size;
      setSelectedMangas(new Set());
      setDeletingMangas(new Set());
      loadMangas();
      showToast(`${count} mangas supprimés`, "error");
    };
  };

  const executeBatchEdit = async (e) => {
    e.preventDefault();
    const ng = e.target.group.value.trim();
    const na = e.target.artist.value.trim();
    const nTags = e.target.tags.value
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    if (!ng && !na && nTags.length === 0) {
      setShowBatchEditModal(false);
      return;
    }

    setLoading(true);
    const db = await initDB();
    const tx = db.transaction(STORE_MANGAS, "readwrite");
    const store = tx.objectStore(STORE_MANGAS);

    Array.from(selectedMangas).forEach((id) => {
      store.get(id).onsuccess = (ev) => {
        const item = ev.target.result;
        if (item) {
          if (ng) item.group = ng === "CLEAR" ? null : ng;
          if (na) item.artist = na === "CLEAR" ? null : na;
          if (nTags.length > 0) {
            const currentTags = new Set(item.tags || []);
            nTags.forEach((t) => currentTags.add(t));
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

  const prevOrientation = useRef(effectiveLandscape);
  const prevSpreadsRef = useRef(allSpreads);

  useEffect(() => {
    if (
      prevOrientation.current !== effectiveLandscape &&
      allSpreads &&
      allSpreads.length > 0
    ) {
      const oldSpreads = prevSpreadsRef.current;
      const currentSpread = oldSpreads[cursor];
      if (currentSpread && currentSpread.pageIndices) {
        const isRTL = currentManga?.direction === "rtl";
        let targetPage = currentSpread.pageIndices[0];
        if (
          prevOrientation.current === true &&
          effectiveLandscape === false &&
          currentSpread.pageIndices.length === 2
        ) {
          targetPage = isRTL
            ? currentSpread.pageIndices[0]
            : currentSpread.pageIndices[1];
        }
        const newCursor = allSpreads.findIndex((s) =>
          s.pageIndices.includes(targetPage),
        );
        if (newCursor !== -1 && newCursor !== cursor) {
          setCursor(newCursor);
        }
      }
      prevOrientation.current = effectiveLandscape;
    }
    prevSpreadsRef.current = allSpreads;
  }, [effectiveLandscape, allSpreads, currentManga, cursor]);

  // Refs pour stabiliser les callbacks qui lisent cursor/allSpreads à haute fréquence
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const allSpreadsRef = useRef(allSpreads);
  allSpreadsRef.current = allSpreads;
  const showNextChapterOverlayRef = useRef(showNextChapterOverlay);
  showNextChapterOverlayRef.current = showNextChapterOverlay;

  const handleSetCursor = useCallback(
    (newVal, fromTap = null) => {
      const cur = cursorRef.current;
      if (newVal === cur) return;

      if (soundVolume > 0 && soundLoaded) {
        pageTurnSound.currentTime = 0;
        pageTurnSound.play().catch((e) => {
          // This catch is a fallback for playback interruptions, the main check is soundLoaded
        });
      }
      if (fromTap) {
        setEdgeGlow(fromTap);
        setTimeout(() => setEdgeGlow(null), 400);
      }
      setPrevCursor(cur);
      setSlideDir(newVal > cur ? "next" : "prev");
      setCursor(newVal);
      setShowNextChapterOverlay(false);
      setTimeout(() => setPrevCursor(null), 1000);
    },
    [soundVolume, soundLoaded, pageTurnSound],
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ne pas déclencher de raccourcis si on est en train de saisir du texte
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      // Raccourci Plein Écran Global
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Raccourcis spécifiques au lecteur
      if (view === "reader") {
        if (e.key === "Escape") {
          handleCloseReader();
          return;
        }
        if (
          isAdding ||
          showGlobalSettings ||
          !allSpreadsRef.current ||
          activeCardMenu
        )
          return;

        const cursor = cursorRef.current;
        const allSpreads = allSpreadsRef.current;
        const showNextChapterOverlay = showNextChapterOverlayRef.current;
        const isRTL = currentManga?.direction === "rtl";

        if (e.key === "ArrowRight" || (e.key === " " && !e.shiftKey)) {
          if (e.key === " ") e.preventDefault();
          const goNext = isRTL && e.key !== " " ? false : true;
          if (goNext) {
            if (cursor < allSpreads.length - 1)
              handleSetCursor(cursor + 1, "right");
            else {
              setShowNextChapterOverlay(true);
              triggerHaptic([50, 100, 50]);
            }
          } else {
            if (showNextChapterOverlay) setShowNextChapterOverlay(false);
            else if (cursor > 0) handleSetCursor(cursor - 1, "right");
          }
        } else if (
          e.key === "ArrowLeft" ||
          e.key === "Backspace" ||
          (e.key === " " && e.shiftKey)
        ) {
          if (e.key === " " || e.key === "Backspace") e.preventDefault();
          const goNext = isRTL && e.key === "ArrowLeft" ? true : false;
          if (goNext) {
            if (cursor < allSpreads.length - 1)
              handleSetCursor(cursor + 1, "left");
            else {
              setShowNextChapterOverlay(true);
              triggerHaptic([50, 100, 50]);
            }
          } else {
            if (showNextChapterOverlay) setShowNextChapterOverlay(false);
            else if (cursor > 0) handleSetCursor(cursor - 1, "left");
          }
        } else if (e.key === "ArrowUp") {
          setZenMode((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    view,
    isAdding,
    showGlobalSettings,
    currentManga,
    activeCardMenu,
    handleCloseReader,
    toggleFullscreen,
    handleSetCursor,
  ]);

  const wheelTimeout = useRef(null);
  const handleWheel = useCallback(
    (e) => {
      if (view !== "reader" || showNextChapterOverlayRef.current) return;
      if (wheelTimeout.current) return;

      const cursor = cursorRef.current;
      const allSpreads = allSpreadsRef.current;
      const isRTL = currentManga?.direction === "rtl";
      let goNext = false;
      let goPrev = false;

      if (e.deltaY > 40) {
        goNext = isRTL ? false : true;
        goPrev = isRTL ? true : false;
      } else if (e.deltaY < -40) {
        goNext = isRTL ? true : false;
        goPrev = isRTL ? false : true;
      }

      if (goNext) {
        if (cursor < allSpreads.length - 1)
          handleSetCursor(cursor + 1, isRTL ? "left" : "right");
        else {
          setShowNextChapterOverlay(true);
          triggerHaptic([50, 100, 50]);
        }
      } else if (goPrev) {
        if (cursor > 0) handleSetCursor(cursor - 1, isRTL ? "right" : "left");
      }

      if (goNext || goPrev) {
        wheelTimeout.current = setTimeout(() => {
          wheelTimeout.current = null;
        }, 600);
      }
    },
    [view, currentManga, handleSetCursor],
  );

  const { inspectorPrev, inspectorNext } = useMemo(() => {
    if (!inspectingManga) return { inspectorPrev: null, inspectorNext: null };
    let ctx = inspectingManga.group
      ? mangas.filter((m) => m.group === inspectingManga.group)
      : mangas.filter((m) => !m.group);
    ctx.sort((a, b) => {
      const oA = a.order ?? 999999;
      const oB = b.order ?? 999999;
      if (oA !== oB) return oA - oB;
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
    const idx = ctx.findIndex((m) => m.id === inspectingManga.id);
    return {
      inspectorPrev: idx > 0 ? ctx[idx - 1] : null,
      inspectorNext: idx >= 0 && idx < ctx.length - 1 ? ctx[idx + 1] : null,
    };
  }, [inspectingManga, mangas]);

  const handleInstallApp = useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  }, [deferredPrompt]);

  // Optimisation : Mémorisation stricte des fonctions passées aux composants lourds
  const toggleSpineCb = useCallback(() => setShowSpine((p) => !p), []);
  const handleInspectorClose = useCallback(() => setInspectingManga(null), []);
  const handleInspectorRead = useCallback(
    (m, eOrPageIndex, skipAnim) => {
      // Clic sur un chapitre : on saute l'animation et on va directement à la page
      if (typeof eOrPageIndex === "number") {
        handleOpenManga(m, null, true, eOrPageIndex);
        setTimeout(() => setInspectingManga(null), 100);
      } else {
        // Clic sur "Ouvrir" : on utilise l'animation du livre qui s'ouvre
        handleOpenManga(m, eOrPageIndex, skipAnim);
        setTimeout(() => setInspectingManga(null), skipAnim ? 0 : 100);
      }
    },
    [handleOpenManga],
  );

  const handleInspectorOpenMenu = useCallback((m) => {
    setInspectingManga(null);
    setTimeout(() => setActiveCardMenu(m), 300);
  }, []);
  const handleInspectorPrevAction = useCallback(() => {
    triggerHaptic(30);
    setInspectingManga(inspectorPrev);
  }, [inspectorPrev]);
  const handleInspectorNextAction = useCallback(() => {
    triggerHaptic(30);
    setInspectingManga(inspectorNext);
  }, [inspectorNext]);

  const handleOpenAddModal = useCallback(() => {
    setIsAdding(true);
  }, []);

  return (
    <div
      ref={appRef}
      className="h-full w-full bg-black text-white flex flex-col items-center relative overflow-hidden"
    >
      <div
        className="w-full h-full absolute inset-0"
        style={{
          visibility: view === "hub" ? "visible" : "hidden",
          opacity: view === "hub" ? 1 : 0,
          pointerEvents: view === "hub" ? "auto" : "none",
        }}
      >
        <HubView
          isActive={view === "hub"}
          soundVolume={soundVolume}
          setSoundVolume={setSoundVolume}
          ledIntensity={ledIntensity}
          setLedIntensity={setLedIntensity}
          mangas={mangas}
          animatingManga={animatingManga}
          deferredPrompt={deferredPrompt}
          handleInstallApp={handleInstallApp}
          animationSpeed={animationSpeed}
          setAnimationSpeed={setAnimationSpeed}
          pageAnimationsEnabled={pageAnimationsEnabled}
          setPageAnimationsEnabled={setPageAnimationsEnabled}
          setIsAdding={handleOpenAddModal}
          showGlobalSettings={showGlobalSettings}
          setShowGlobalSettings={setShowGlobalSettings}
          appTheme={appTheme}
          setAppTheme={setAppTheme}
          shelfTheme={shelfTheme}
          setShelfTheme={setShelfTheme}
          handleExport={handleExport}
          handleImport={handleImport}
          setPurgeConfirm={setPurgeConfirm}
          handleReorderManga={handleReorderManga}
          handleOpenManga={handleOpenManga}
          setActiveCardMenu={setActiveCardMenu}
          isSelectionMode={isSelectionMode}
          selectedMangas={selectedMangas}
          toggleMangaSelection={toggleMangaSelection}
          toggleSelectAllMangas={toggleSelectAllMangas}
          toggleSelectionMode={toggleSelectionMode}
          setShowBatchEditModal={setShowBatchEditModal}
          setBatchDeleteConfirm={setBatchDeleteConfirm}
          setInspectingManga={handleInspectManga}
          deletingMangas={deletingMangas}
          inspectingMangaId={inspectingManga?.id}
          toggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
      </div>

      <Suspense
        fallback={
          <LoadingOverlay loading={true} importProgress="Chargement..." />
        }
      >
        {view === "reader" && (
          <ReaderView
            isNightMode={isNightMode}
            setIsNightMode={setIsNightMode}
            isExitingReader={isExitingReader}
            zenMode={zenMode}
            setZenMode={setZenMode}
            handleCloseReader={handleCloseReader}
            toggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            toggleBookmark={toggleBookmark}
            currentManga={currentManga}
            cursor={cursor}
            handleSetCursor={handleSetCursor}
            edgeGlow={edgeGlow}
            currentPages={currentPages}
            allSpreads={allSpreads}
            isLandscape={effectiveLandscape}
            prevCursor={prevCursor}
            slideDir={slideDir}
            handleWheel={handleWheel}
            showNextChapterOverlay={showNextChapterOverlay}
            setShowNextChapterOverlay={setShowNextChapterOverlay}
            nextChapter={nextChapter}
            saveProgress={saveProgress}
            setCurrentManga={setCurrentManga}
            setCursor={setCursor}
            markAsRead={markAsRead}
            toggleDisplayMode={toggleDisplayMode}
            showSpine={showSpine}
            toggleSpine={toggleSpineCb}
            isJumping={isJumping}
          />
        )}

        {inspectingManga && (
          <MangaInspector
            manga={inspectingManga}
            onClose={handleInspectorClose}
            onRead={handleInspectorRead}
            isAnimatingOut={!!animatingManga}
            startClosing={isClosingReaderWithAnim}
            onOpenMenu={handleInspectorOpenMenu}
            hasPrev={!!inspectorPrev}
            hasNext={!!inspectorNext}
            onPrev={handleInspectorPrevAction}
            onNext={handleInspectorNextAction}
          />
        )}

        {activeCardMenu && (
          <MangaActionsModal
            activeCardMenu={activeCardMenu}
            onClose={() => setActiveCardMenu(null)}
            onEdit={(manga) => setEditingManga(manga)}
            onExport={handleExportArchive}
            onDelete={(id) => {
              setActiveCardMenu(null);
              setDeleteConfirm(id);
            }}
          />
        )}
        {editingManga && (
          <EditMangaModal
            editingManga={editingManga}
            onClose={() => setEditingManga(null)}
            onSubmit={executeUpdateManga}
            seriesByAuthor={seriesByAuthor}
            existingTags={existingTags}
            existingArtists={existingArtists}
          />
        )}
        {showBatchEditModal && (
          <BatchEditModal
            isOpen={showBatchEditModal}
            count={selectedMangas.size}
            onClose={() => setShowBatchEditModal(false)}
            onSubmit={executeBatchEdit}
            existingTags={existingTags}
            existingGroups={existingGroups}
            existingArtists={existingArtists}
          />
        )}
        {isAdding && (
          <AddChapterModal
            onClose={() => setIsAdding(false)}
            onSuccess={() => {
              setIsAdding(false);
              loadMangas();
            }}
            setLoading={setLoading}
            setImportProgress={setImportProgress}
            showToast={showToast}
            seriesByAuthor={seriesByAuthor}
            existingTags={existingTags}
            existingArtists={existingArtists}
          />
        )}
      </Suspense>

      <ConfirmModal
        isOpen={deleteConfirm !== null || purgeConfirm || batchDeleteConfirm}
        title={
          batchDeleteConfirm
            ? `Supprimer ${selectedMangas.size} mangas ?`
            : "Confirmer ?"
        }
        onCancel={() => {
          setDeleteConfirm(null);
          setPurgeConfirm(false);
          setBatchDeleteConfirm(false);
        }}
        onConfirm={async () => {
          if (batchDeleteConfirm) {
            executeBatchDelete();
          } else if (deleteConfirm) {
            const idToDelete = deleteConfirm;
            setDeleteConfirm(null);

            // Délai court pour laisser le fond noir de la modale disparaître
            await new Promise((r) => setTimeout(r, 150));

            setDeletingMangas(new Set([idToDelete]));
            await new Promise((r) => setTimeout(r, 400));
            initDB().then((db) => {
              const tx = db.transaction(
                [STORE_MANGAS, STORE_PAGES],
                "readwrite",
              );
              tx.objectStore(STORE_MANGAS).delete(idToDelete);
              tx.objectStore(STORE_PAGES).delete(idToDelete);
              tx.oncomplete = () => {
                setDeletingMangas(new Set());
                loadMangas();
                showToast("Manga supprimé", "error");
              };
            });
          } else {
            executePurge();
          }
        }}
      />
      <LoadingOverlay loading={loading} importProgress={importProgress} />
      <ToastNotification toast={toast} />

      {animatingManga && (
        <div className="fixed inset-0 z-[2000] pointer-events-none">
          <div
            className="absolute inset-0 bg-black transition-opacity duration-500"
            style={{
              opacity: animatingManga.phase === "expanding" ? 1 : 0,
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
          <div
            className="absolute overflow-hidden transition-[top,left,width,height,border-radius] duration-500 shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
            style={{
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              top:
                animatingManga.phase === "expanding"
                  ? "0px"
                  : animatingManga.rect.top + "px",
              left:
                animatingManga.phase === "expanding"
                  ? "0px"
                  : animatingManga.rect.left + "px",
              width:
                animatingManga.phase === "expanding"
                  ? "100vw"
                  : animatingManga.rect.width + "px",
              height:
                animatingManga.phase === "expanding"
                  ? "100vh"
                  : animatingManga.rect.height + "px",
              borderRadius: "0px",
              transform: "translateZ(0)",
            }}
          >
            <StackThumbnail
              file={
                animatingManga.manga.coverDouble ||
                animatingManga.manga.coverStart ||
                animatingManga.manga.cover
              }
              contain={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
