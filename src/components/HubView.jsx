import React, {
  useState,
  useEffect,
  memo,
  useMemo,
  useDeferredValue,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { FixedSizeList } from "react-window";
import Fuse from "fuse.js";
import {
  IconSearch,
  IconFilter,
  IconCheckSquare,
  IconBookPlus,
  IconSettings,
  IconFloppyUp,
  IconFloppyDown,
  IconTrash,
  IconCheck,
  IconMaximize,
  IconMinimize,
  IconVolumeX,
  IconVolume1,
  IconVolume2,
  IconLedOff,
  IconLedOn,
} from "./Icons";
import {
  SHELF_THEMES,
  getSafeStorage,
  setSafeStorage,
  MANGA_PROPS,
  getCachedUrl,
} from "../utils";
import StackThumbnail from "./StackThumbnail";

const ShelfItem = memo(
  ({
    item,
    themeDef,
    isSelectionMode,
    selectedMangas,
    inspectingMangaId,
    deletingMangas,
    handleBookPointerEnter,
    toggleMangaSelection,
    setInspectingManga,
    handleReorderManga,
  }) => {
    if (item.type === "separator") {
      const isAuthorSep = item.level === "author";
      const width = isAuthorSep
        ? "clamp(25px, 3.5vh, 45px)"
        : "clamp(10px, 1.5vh, 20px)";
      const height = isAuthorSep ? "95%" : "90%";
      return (
        <div
          key={item.key}
          className="flex-none flex items-end relative transition-all duration-500"
          style={{
            height: "var(--row-total)",
            paddingTop: "var(--row-pt)",
            paddingBottom: "var(--board-h)",
          }}
        >
          <div
            className={`flex-none border-l border-t border-white/10 relative z-20 rounded-t-[2px]`}
            style={{ width, height, ...themeDef.bookend }}
          >
            <div className="w-1/2 h-full bg-black/30 absolute left-0 pointer-events-none"></div>
          </div>
        </div>
      );
    }

    const m = item.data;
    const isSelected = isSelectionMode && selectedMangas.has(m.id);
    const isInspected = inspectingMangaId === m.id;
    const isDeleting = deletingMangas && deletingMangas.has(m.id);

    const isDouble = !!m.coverDouble;
    const mainCover = m.coverStart || m.cover;
    const wrapCoverUrl = getCachedUrl(m.coverDouble);
    const frontCoverUrl = getCachedUrl(mainCover);

    const bw = MANGA_PROPS.faceW;
    const bh = MANGA_PROPS.h;
    const bd = MANGA_PROPS.spineW;
    const wrapTotalW = bw * 2 + bd;
    const bgSizeSpine = `${(wrapTotalW / bd) * 100}% 100%`;

    return (
      <div
        key={m.id}
        className="flex-none flex items-end relative group/book hover:z-[100]"
        style={{
          height: "var(--row-total)",
          paddingTop: "var(--row-pt)",
          paddingBottom: "var(--board-h)",
        }}
      >
        <div
          id={`book-${m.id}`}
          draggable={!isSelectionMode}
          onDragStart={(e) => {
            if (isSelectionMode) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", m.id);
            e.currentTarget.style.opacity = "0.4";
          }}
          onDragEnd={(e) => {
            e.currentTarget.style.opacity = "";
          }}
          onDragOver={(e) => {
            if (isSelectionMode) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (isSelectionMode) return;
            e.preventDefault();
            e.stopPropagation();
            const draggedId = e.dataTransfer.getData("text/plain");
            if (draggedId && draggedId !== m.id && handleReorderManga) {
              handleReorderManga(draggedId, m.id);
            }
          }}
          onPointerEnter={handleBookPointerEnter}
          onClick={(e) => {
            if (isSelectionMode) {
              e.preventDefault();
              toggleMangaSelection(m.id);
              return;
            }
            setInspectingManga(m, e);
          }}
          className={`manga-cover-image relative flex-none cursor-pointer z-10 rounded-[2px] ${isDeleting ? "scale-0 opacity-0 pointer-events-none" : isInspected ? "opacity-0 pointer-events-none" : isSelected ? "ring-2 ring-theme-500 scale-95 opacity-80" : "hover:-translate-y-5 hover:shadow-[0_20px_30px_-8px_rgba(0,0,0,0.9),0_0_20px_rgba(var(--theme-rgb),0.15)]"}`}
          style={{
            backgroundColor: "#0f172a",
            height: "95%",
            width: `calc(var(--row-book-h) * 0.95 * (${bd} / ${bh}))`,
            boxShadow: "0 8px 10px -4px rgba(0,0,0,0.8)",
            transition: isDeleting
              ? "transform 0.4s cubic-bezier(0.5, 0, 1, 0.5), opacity 0.4s ease-out"
              : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease",
            willChange: "transform",
          }}
        >
          <div
            className="peek-popup absolute top-2 left-[calc(100%+12px)] bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(var(--theme-rgb),0.3)] opacity-0 group-hover/book:opacity-100 group-hover/book:translate-y-0 pointer-events-none z-[200] overflow-hidden border border-white/10 flex flex-col w-[140px] sm:w-[180px] origin-top-left translate-y-2"
            style={{
              transition:
                "opacity 0.2s ease, transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)",
            }}
          >
            <div
              className="relative w-full bg-black border-b border-white/10"
              style={{ aspectRatio: `${bw} / ${bh}` }}
            >
              <StackThumbnail file={mainCover} contain={true} />
            </div>
            <div className="p-3 sm:p-4 flex flex-col bg-gradient-to-b from-transparent to-black/60">
              <span className="text-[8px] sm:text-[10px] text-theme-400 font-black uppercase tracking-widest truncate mb-1">
                {item.group || "Indépendant"}
              </span>
              <span
                className="text-[10px] sm:text-xs text-white font-bold leading-snug line-clamp-3"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
              >
                {m.title}
              </span>
              {m.artist && (
                <span className="text-[8px] text-theme-200/80 font-bold truncate mt-1">
                  🎨 {m.artist}
                </span>
              )}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[2px] bg-[#0f172a]">
            {isDouble && wrapCoverUrl ? (
              <div
                className="w-full h-full opacity-100 transition-opacity"
                style={{
                  backgroundImage: `url(${wrapCoverUrl})`,
                  backgroundSize: bgSizeSpine,
                  backgroundPosition: "center center",
                  backgroundRepeat: "no-repeat",
                }}
              ></div>
            ) : (
              <>
                {frontCoverUrl && (
                  <div
                    className="absolute inset-0 scale-[1.5] opacity-90"
                    style={{
                      backgroundImage: `url(${frontCoverUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "left center",
                      filter: "blur(10px) saturate(1.5) brightness(0.6)",
                    }}
                  ></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span
                    className={`${themeDef.text} group-hover/book:text-white font-black uppercase tracking-widest overflow-hidden whitespace-nowrap [text-overflow:clip] text-center leading-none transition-colors absolute`}
                    style={{
                      transform: "rotate(90deg)",
                      textShadow:
                        "0px 2px 5px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,0.8)",
                      fontSize: "clamp(9px, 1.6vh, 13px)",
                      width: "max-content",
                      padding: "0 10px",
                    }}
                  >
                    {m.title}
                  </span>
                </div>
              </>
            )}
            {m.bookmark != null && !m.isFinished && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] max-w-[16px] min-w-[6px] h-[22%] bg-theme-500 shadow-[0_4px_10px_rgba(0,0,0,0.9)] z-40 border-x border-b border-white/40 animate-bookmark-in"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
                  backgroundImage:
                    "linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(0,0,0,0.2))",
                }}
              ></div>
            )}
            {m.isFinished && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[25%] max-w-[12px] min-w-[6px] aspect-square rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)] border border-white/80 z-40"></div>
            )}
          </div>
          {isSelectionMode && (
            <div
              className={`absolute inset-0 z-30 flex items-center justify-center transition-all rounded-[2px] ${isSelected ? "bg-theme-900/60 backdrop-blur-[2px]" : "bg-black/40 group-hover/book:bg-black/20"}`}
            >
              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-theme-500 bg-theme-500 text-white shadow-[0_0_15px_rgba(var(--theme-rgb),0.8)]" : "border-white/50 text-transparent"}`}
              >
                <IconCheck width="12" height="12" strokeWidth="3" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 border-l border-l-white/20 border-r border-r-black/80 pointer-events-none rounded-[2px]"></div>
        </div>
      </div>
    );
  },
);

const Row = memo(({ index, style, data }) => {
  const { virtualRows, pillarWidth, bookWidth, ...rest } = data;
  const row = virtualRows[index];
  const themeDef = SHELF_THEMES[rest.shelfTheme] || SHELF_THEMES.mahogany;

  const authorLabels = useMemo(() => {
    const labels = [];
    if (!row || !row.items || !bookWidth) return labels;

    let currentAuthor = null;
    let authorStartIndex = -1;
    let authorItemCount = 0;

    const pushLabel = () => {
      if (currentAuthor && authorItemCount > 0) {
        labels.push({
          key: `label-${currentAuthor}-${index}-${authorStartIndex}`,
          title: currentAuthor,
          width: authorItemCount * bookWidth,
          left: pillarWidth + authorStartIndex * bookWidth,
        });
      }
    };

    for (let i = 0; i < row.items.length; i++) {
      const item = row.items[i];
      const itemAuthor =
        item.type === "manga" ? item.data.artist || "Auteurs Inconnus" : null;

      if (itemAuthor !== currentAuthor) {
        pushLabel();
        currentAuthor = itemAuthor;
        authorStartIndex = i;
        authorItemCount = itemAuthor ? 1 : 0;
      } else if (currentAuthor) {
        authorItemCount++;
      }
    }

    pushLabel();

    return labels;
  }, [row, bookWidth, pillarWidth]);

  return (
    <div style={style}>
      <div className="relative h-full w-full">
        <div className="absolute top-0 left-0 w-full flex flex-col pointer-events-none z-0">
          <div
            className="w-full flex-none flex flex-col justify-end transition-all duration-500"
            style={{ height: "var(--row-total)" }}
          >
            <div className="shelf-led"></div>
            <div
              className="w-full shadow-[0_20px_40px_rgba(0,0,0,1)] relative z-20 border-t border-white/5"
              style={{ height: "var(--board-h)", ...themeDef.board }}
            >
              {themeDef.texture && (
                <div
                  className={`absolute inset-0 ${themeDef.texture} pointer-events-none`}
                ></div>
              )}
              {authorLabels.map((label) => (
                <div
                  key={label.key}
                  className="absolute inset-y-0 flex items-center justify-center"
                  style={{ left: label.left, width: label.width }}
                >
                  {label.width >= 60 && (
                    <span
                      className={`${themeDef.text} font-black uppercase tracking-widest text-center transition-colors truncate px-4`}
                      style={{
                        textShadow: "0px 1px 2px rgba(0,0,0,0.9)",
                        fontSize: "clamp(10px, 1.5vh, 13px)",
                      }}
                    >
                      {label.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          className="relative z-30 flex flex-wrap content-start items-start justify-start w-full"
          style={{
            paddingLeft: "var(--pillar-w)",
            paddingRight: "var(--pillar-w)",
          }}
        >
          {row.items.map((item) => (
            <ShelfItem
              key={item.key || item.data.id}
              item={item}
              themeDef={themeDef}
              {...rest}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

const HubView = memo(
  ({
    isActive,
    mangas,
    animatingManga,
    deferredPrompt,
    handleInstallApp,
    setIsAdding,
    showGlobalSettings,
    setShowGlobalSettings,
    appTheme,
    setAppTheme,
    shelfTheme,
    setShelfTheme,
    handleExport,
    handleImport,
    setPurgeConfirm,
    animationSpeed,
    setAnimationSpeed,
    pageAnimationsEnabled,
    setPageAnimationsEnabled,
    soundVolume,
    setSoundVolume,
    ledIntensity,
    setLedIntensity,
    setActiveCardMenu,
    isSelectionMode,
    selectedMangas,
    toggleMangaSelection,
    toggleSelectionMode,
    handleReorderManga,
    toggleSelectAllMangas,
    setShowBatchEditModal,
    setBatchDeleteConfirm,
    setInspectingManga,
    deletingMangas,
    inspectingMangaId,
    toggleFullscreen,
    isFullscreen,
  }) => {
    const isIosSafari =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      /safari/i.test(navigator.userAgent) &&
      !/crios|fxios|opios|mercury/i.test(navigator.userAgent);
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const [showIosBanner, setShowIosBanner] = useState(
      () =>
        isIosSafari &&
        !isStandalone &&
        !getSafeStorage("mangaHubIosBannerDismissed", ""),
    );

    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeTags, setActiveTags] = useState([]);
    const [activeAuthors, setActiveAuthors] = useState([]);
    const [activeSeries, setActiveSeries] = useState([]);
    const [showTags, setShowTags] = useState(false);
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
    const [sortOrder, setSortOrder] = useState(() =>
      getSafeStorage("mangaHubSortOrder", "group"),
    );

    const scrollDebounceRef = useRef(null);

    // Restaure la position de défilement au montage du composant
    const initialScrollOffset = useMemo(() => {
      try {
        const savedPosition = sessionStorage.getItem("mangaHubScrollPosition");
        return savedPosition ? Number(savedPosition) : 0;
      } catch (e) {
        return 0;
      }
    }, []);

    // Sauvegarde la position de défilement (avec un délai pour la performance)
    const handleScroll = useCallback(({ scrollOffset }) => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      scrollDebounceRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(
            "mangaHubScrollPosition",
            String(scrollOffset),
          );
        } catch (e) {
          // Peut échouer en mode de navigation privée
          console.error("Failed to save scroll position:", e);
        }
      }, 300);
    }, []);

    // Nettoie le minuteur du debounce lorsque le composant est démonté
    useEffect(
      () => () => {
        if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      },
      [],
    );

    const mainContainerRef = useRef(null);
    const [layout, setLayout] = useState({
      width: 0,
      height: 0,
      rowHeight: 300,
      itemsPerRow: 5,
      pillarWidth: 30,
      bookWidth: 0,
    });

    // OPTIMISATION : Mode sommeil. On ne met à jour les données que si l'étagère est visible.
    const frozenMangasRef = useRef(mangas || []);
    if (isActive) {
      frozenMangasRef.current = mangas;
    }
    const displayMangas = isActive ? mangas : frozenMangasRef.current;

    const normalizedMangas = useMemo(() => {
      return displayMangas.map((m) => {
        const tSet = new Set((m.tags || []).map((t) => t.toUpperCase()));
        return { ...m, tags: Array.from(tSet).sort() };
      });
    }, [displayMangas]);

    const fuse = useMemo(
      () =>
        new Fuse(normalizedMangas, {
          keys: ["title", "group", "artist", "tags"],
          includeScore: true,
          threshold: 0.4,
          minMatchCharLength: 2,
          ignoreLocation: true,
        }),
      [normalizedMangas],
    );

    const searchResults = useMemo(() => {
      if (deferredSearch.trim().length < 2) return [];
      // La recherche retourne les résultats triés par pertinence.
      return fuse
        .search(deferredSearch)
        .map((result) => result.item)
        .slice(0, 50);
    }, [fuse, deferredSearch]);

    const allAvailableOptions = useMemo(() => {
      const tagsSet = new Set();
      const authorsSet = new Set();
      const seriesSet = new Set();
      normalizedMangas.forEach((m) => {
        m.tags.forEach((t) => tagsSet.add(t));
        authorsSet.add(m.artist || "Auteurs Inconnus");
        if (m.group) seriesSet.add(m.group);
      });
      return {
        allAvailableTags: Array.from(tagsSet).sort(),
        allAvailableAuthors: Array.from(authorsSet).sort(),
        allAvailableSeries: Array.from(seriesSet).sort(),
      };
    }, [normalizedMangas]);

    const libraryStructure = useMemo(() => {
      const filtered = normalizedMangas.filter((m) => {
        const matchTags =
          activeTags.length === 0 ||
          activeTags.some((t) => m.tags.includes(t));
        const matchAuthors =
          activeAuthors.length === 0 ||
          activeAuthors.includes(m.artist || "Auteurs Inconnus");
        const matchSeries =
          activeSeries.length === 0 ||
          activeSeries.includes(m.group);
        const matchBookmark = showBookmarksOnly ? m.bookmark != null : true;
        return matchTags && matchAuthors && matchSeries && matchBookmark;
      });

      // 1. Group by author
      const authorsMap = {};
      filtered.forEach((m) => {
        const author = m.artist || "Auteurs Inconnus";
        if (!authorsMap[author]) {
          authorsMap[author] = {
            title: author,
            mangas: [],
            date: m.date || 0,
            lastRead: m.lastRead || 0,
          };
        }
        authorsMap[author].mangas.push(m);
        if ((m.date || 0) > authorsMap[author].date)
          authorsMap[author].date = m.date;
        if ((m.lastRead || 0) > authorsMap[author].lastRead)
          authorsMap[author].lastRead = m.lastRead;
      });

      // 2. Sort authors
      const sortedAuthors = Object.values(authorsMap).sort((a, b) => {
        if (sortOrder === "lastRead") {
          const lastReadA = Math.max(
            0,
            ...a.mangas.map((m) => m.lastRead || 0),
          );
          const lastReadB = Math.max(
            0,
            ...b.mangas.map((m) => m.lastRead || 0),
          );
          if (lastReadB !== lastReadA) return lastReadB - lastReadA;
        }
        if (sortOrder === "dateAdded") {
          const dateA = Math.max(0, ...a.mangas.map((m) => m.date || 0));
          const dateB = Math.max(0, ...b.mangas.map((m) => m.date || 0));
          if (dateB !== dateA) return dateB - dateA;
        }
        if (a.title === "Auteurs Inconnus") return 1;
        if (b.title === "Auteurs Inconnus") return -1;
        return a.title.localeCompare(b.title, undefined, { numeric: true });
      });

      const flattened = [];
      const shelves = []; // Keep for compatibility, though its meaning has changed.

      // 3. For each author, group by series, sort, and flatten
      sortedAuthors.forEach((author, authorIndex) => {
        const seriesMap = {};
        author.mangas.forEach((m) => {
          const seriesTitle = m.group || "Volumes Indépendants";
          if (!seriesMap[seriesTitle]) {
            seriesMap[seriesTitle] = { title: seriesTitle, mangas: [] };
          }
          seriesMap[seriesTitle].mangas.push(m);
        });

        const sortedSeries = Object.values(seriesMap).sort((a, b) => {
          if (a.title === "Volumes Indépendants") return 1;
          if (b.title === "Volumes Indépendants") return -1;
          return a.title.localeCompare(b.title, undefined, { numeric: true });
        });

        sortedSeries.forEach((s) => {
          s.mangas.sort((a, b) => {
            const oA = a.order ?? 999999;
            const oB = b.order ?? 999999;
            if (oA !== oB) return oA - oB;
            return a.title.localeCompare(b.title, undefined, { numeric: true });
          });
        });

        shelves.push(...sortedSeries);

        sortedSeries.forEach((series, seriesIndex) => {
          series.mangas.forEach((m, mIndex) => {
            flattened.push({
              type: "manga",
              data: m,
              group: series.title,
              isFirst: mIndex === 0,
            });
          });
          // Add a series separator
          if (seriesIndex < sortedSeries.length - 1) {
            flattened.push({
              type: "separator",
              level: "series",
              key: `series-sep-${author.title}-${seriesIndex}`,
            });
          }
        });

        // Add a separator at the end of an author's section
        if (authorIndex < sortedAuthors.length - 1) {
          flattened.push({
            type: "separator",
            level: "author",
            key: `author-sep-${authorIndex}`,
          });
        }
      });

      return { shelves, flattened };
    }, [normalizedMangas, activeTags, activeAuthors, activeSeries, showBookmarksOnly, sortOrder]);

    useLayoutEffect(() => {
      const container = mainContainerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(() => {
        // Pour obtenir les valeurs calculées en pixels des variables CSS qui utilisent clamp(),
        // nous les appliquons à un élément temporaire et lisons sa taille calculée.
        const tempDiv = document.createElement("div");
        tempDiv.style.visibility = "hidden";
        tempDiv.style.position = "absolute";
        tempDiv.style.pointerEvents = "none"; // S'assurer qu'il n'interfère pas avec les interactions
        container.appendChild(tempDiv); // Ajouter au conteneur pour hériter des variables CSS

        // Mesurer --row-pt
        tempDiv.style.height = "var(--row-pt)";
        const rowPT = tempDiv.offsetHeight;

        // Mesurer --row-book-h
        tempDiv.style.height = "var(--row-book-h)";
        const bookH = tempDiv.offsetHeight;

        // Mesurer --board-h
        tempDiv.style.height = "var(--board-h)";
        const boardH = tempDiv.offsetHeight;

        // Mesurer --pillar-w
        tempDiv.style.width = "var(--pillar-w)";
        const pillarW = tempDiv.offsetWidth;

        container.removeChild(tempDiv); // Nettoyer l'élément temporaire

        // Valeurs de repli pour la sécurité, bien que offsetHeight/offsetWidth devraient toujours renvoyer un nombre
        const safeRowPT = isNaN(rowPT) || rowPT === 0 ? 15 : rowPT;
        const safeBookH = isNaN(bookH) || bookH === 0 ? 180 : bookH;
        const safeBoardH = isNaN(boardH) || boardH === 0 ? 20 : boardH;
        const safePillarW = isNaN(pillarW) || pillarW === 0 ? 30 : pillarW;

        const bookW = safeBookH * 0.95 * (MANGA_PROPS.spineW / MANGA_PROPS.h);
        const containerWidth = container.clientWidth;
        const itemsPerRow = Math.max(
          1,
          Math.floor((containerWidth - 2 * safePillarW) / (bookW + 8)),
        ); // +8 for some margin

        setLayout({
          width: container.clientWidth,
          height: container.clientHeight,
          rowHeight: safeRowPT + safeBookH + safeBoardH,
          itemsPerRow,
          pillarWidth: safePillarW,
          bookWidth: bookW,
        });
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    const virtualRows = useMemo(() => {
      if (layout.itemsPerRow <= 0 || libraryStructure.flattened.length === 0)
        return [];

      const rows = [];
      let i = 0;
      while (i < libraryStructure.flattened.length) {
        rows.push({
          items: libraryStructure.flattened.slice(i, i + layout.itemsPerRow),
        });
        i += layout.itemsPerRow;
      }
      return rows;
    }, [libraryStructure.flattened, layout.itemsPerRow]);

    // OPTIMISATION : Un seul event listener en mémoire partagé par tous les livres
    const handleBookPointerEnter = useCallback((e) => {
      const popup = e.currentTarget.querySelector(".peek-popup");
      if (popup) {
        if (
          e.currentTarget.getBoundingClientRect().right >
          window.innerWidth - 220
        ) {
          popup.style.left = "auto";
          popup.style.right = "calc(100% + 12px)";
          popup.style.transformOrigin = "top right";
        } else {
          popup.style.left = "calc(100% + 12px)";
          popup.style.right = "auto";
          popup.style.transformOrigin = "top left";
        }
      }
    }, []);

    const handleSelectAll = () => {
      const allFilteredIds = libraryStructure.flattened
        .filter((i) => i.type === "manga")
        .map((i) => i.data.id);
      if (toggleSelectAllMangas) toggleSelectAllMangas(allFilteredIds);
    };
    const allSelected =
      libraryStructure.flattened.filter((i) => i.type === "manga").length > 0 &&
      selectedMangas.size ===
        libraryStructure.flattened.filter((i) => i.type === "manga").length;

    return (
      <div
        className="flex flex-col h-full w-full mx-auto relative animate-hub-enter"
        style={{
          transitionProperty: "transform, opacity",
          transitionDuration: "500ms",
          transitionTimingFunction: animatingManga?.phase.startsWith("closing")
            ? "cubic-bezier(0.55, 0, 1, 0.45)"
            : "cubic-bezier(0.22, 1, 0.36, 1)",
          transform:
            animatingManga && animatingManga.phase !== "closing-end"
              ? "scale(0.96)"
              : "scale(1)",
          opacity:
            animatingManga && animatingManga.phase !== "closing-end" ? 0.3 : 1,
        }}
        onClick={(e) => {
          if (search.length > 1 && !e.target.closest("input")) {
            setSearch("");
          }
        }}
      >
        <header
          className="relative flex-none flex flex-col gap-4 p-4 lg:py-6 lg:px-8 bg-black/80 backdrop-blur-xl border-b border-theme-600/30 shadow-[0_4px_30px_rgba(var(--theme-rgb),0.15)] z-30"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic cursor-default flex-none">
              <span
                className="text-white"
                style={{
                  textShadow:
                    "0 0 10px rgba(255,255,255,0.6), 0 0 20px rgba(var(--theme-rgb),0.5)",
                }}
              >
                Manga
              </span>
              <span
                className="text-theme-500"
                style={{
                  textShadow:
                    "0 0 10px rgba(var(--theme-rgb),0.8), 0 0 30px rgba(var(--theme-rgb),0.8)",
                }}
              >
                Hub
              </span>
            </h1>

            <div className="hidden md:flex flex-1 justify-center px-8">
              <div className="relative max-w-xl w-full">
                <div className="absolute inset-y-0 left-4 flex items-center text-theme-400/80 pointer-events-none">
                  <IconSearch />
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans la bibliothèque..."
                  className="bg-theme-950/40 border border-theme-500/40 rounded-full py-2.5 pl-11 pr-4 text-sm text-theme-100 outline-none focus:border-theme-400 focus:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] focus:bg-theme-900/50 placeholder-theme-300/50 w-full transition-all duration-300 shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.2)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-none">
              {deferredPrompt && (
                <button
                  onClick={handleInstallApp}
                  className="hidden sm:flex bg-gradient-to-r from-theme-600 to-theme-800 text-white px-3 sm:px-4 h-10 items-center justify-center rounded-xl active:scale-95 transition border border-theme-400 shadow-[0_0_15px_rgba(var(--theme-rgb),0.6)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.9)] text-[10px] sm:text-xs font-black uppercase tracking-wider animate-[pulse_2s_ease-in-out_infinite]"
                  title="Installer MangaHub sur cet appareil"
                >
                  ↓ Installer
                </button>
              )}

              {!isSelectionMode && (
                <button
                  onClick={() => setShowTags(!showTags)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${showTags || activeTags.length > 0 || activeAuthors.length > 0 || activeSeries.length > 0 || sortOrder !== "group" || showBookmarksOnly ? "bg-theme-600/20 text-theme-300 border-theme-500" : "bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40"}`}
                  title="Trier et filtrer"
                >
                  <IconFilter width="16" height="16" />
                </button>
              )}

              <button
                onClick={toggleSelectionMode}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${isSelectionMode ? "bg-theme-600/20 text-theme-300 border-theme-500" : "bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40"}`}
                title="Sélection multiple"
              >
                <IconCheckSquare width="16" height="16" />
              </button>

              <button
                id="tutorial-add-manga"
                onClick={() => setIsAdding(true)}
                className="bg-theme-600/20 text-theme-400 hover:text-theme-300 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active:scale-95 transition border border-theme-500 shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.8)] hover:bg-theme-600/40"
                title="Ajouter un manga"
              >
                <IconBookPlus width="16" height="16" />
              </button>

              <button
                onClick={toggleFullscreen}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${isFullscreen ? "bg-theme-600/20 text-theme-300 border-theme-500" : "bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40"}`}
                title={
                  isFullscreen
                    ? "Quitter le plein écran (F)"
                    : "Plein Écran (F)"
                }
              >
                {isFullscreen ? (
                  <IconMinimize width="18" height="18" />
                ) : (
                  <IconMaximize width="18" height="18" />
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowGlobalSettings(!showGlobalSettings)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition border shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.6)] ${showGlobalSettings ? "bg-theme-600/20 text-theme-300 border-theme-500 relative z-[130]" : "bg-black text-theme-400 hover:text-theme-300 hover:bg-theme-900/20 border-theme-600/40"}`}
                  title="Paramètres"
                >
                  <IconSettings width="18" height="18" />
                </button>

                {showGlobalSettings && (
                  <>
                    <div
                      className="fixed inset-0 z-[110] cursor-default"
                      onClick={() => setShowGlobalSettings(false)}
                    ></div>
                    <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900/95 border border-theme-500/40 rounded-2xl shadow-[0_15px_40px_rgba(var(--theme-rgb),0.6)] z-[120] p-5 flex flex-col gap-5 animate-in origin-top-right">
                      <div>
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-3 block opacity-70 text-center">
                          Thème Visuel
                        </span>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => setAppTheme("blue")}
                            className={`w-6 h-6 rounded-full bg-[#0a46ff] shadow-[0_0_10px_rgba(10,70,255,0.8)] border-2 ${appTheme === "blue" ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                          ></button>
                          <button
                            onClick={() => setAppTheme("red")}
                            className={`w-6 h-6 rounded-full bg-[#ff0055] shadow-[0_0_10px_rgba(255,0,85,0.8)] border-2 ${appTheme === "red" ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                          ></button>
                          <button
                            onClick={() => setAppTheme("green")}
                            className={`w-6 h-6 rounded-full bg-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.8)] border-2 ${appTheme === "green" ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                          ></button>
                          <button
                            onClick={() => setAppTheme("purple")}
                            className={`w-6 h-6 rounded-full bg-[#d500ff] shadow-[0_0_10px_rgba(213,0,255,0.8)] border-2 ${appTheme === "purple" ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                          ></button>
                          <button
                            onClick={() => setAppTheme("yellow")}
                            className={`w-6 h-6 rounded-full bg-[#ffea00] shadow-[0_0_10px_rgba(255,234,0,0.8)] border-2 ${appTheme === "yellow" ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                          ></button>
                        </div>
                      </div>

                      <div className="h-px bg-theme-900/50 w-full"></div>

                      <div>
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2 block opacity-70 text-center">
                          Matériau Étagère
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(SHELF_THEMES).map(([key, theme]) => (
                            <button
                              key={key}
                              onClick={() => setShelfTheme(key)}
                              className={`py-1.5 rounded text-[10px] font-black transition-colors border ${shelfTheme === key ? "bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]" : "bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50"}`}
                            >
                              {theme.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-theme-900/50 w-full"></div>

                      <div className="h-px bg-theme-900/50 w-full"></div>

                      <div className="space-y-3">
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest block opacity-70 text-center">
                          Animation des Pages
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPageAnimationsEnabled(true)}
                            className={`py-1.5 rounded text-[10px] font-black transition-colors border ${pageAnimationsEnabled ? "bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]" : "bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50"}`}
                          >
                            Activées
                          </button>
                          <button
                            onClick={() => setPageAnimationsEnabled(false)}
                            className={`py-1.5 rounded text-[10px] font-black transition-colors border ${!pageAnimationsEnabled ? "bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]" : "bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50"}`}
                          >
                            Désactivées
                          </button>
                        </div>
                        <div
                          className={`grid grid-cols-3 gap-2 transition-opacity ${!pageAnimationsEnabled ? "opacity-40 pointer-events-none" : ""}`}
                        >
                          <button
                            onClick={() => setAnimationSpeed(1.5)}
                            className={`py-1.5 rounded text-[10px] font-black transition-colors border ${animationSpeed === 1.5 ? "bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]" : "bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50"}`}
                          >
                            Lente
                          </button>
                          <button
                            onClick={() => setAnimationSpeed(1.0)}
                            className={`py-1.5 rounded text-[10px] font-black transition-colors border ${animationSpeed === 1.0 ? "bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]" : "bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50"}`}
                          >
                            Normale
                          </button>
                          <button
                            onClick={() => setAnimationSpeed(0.6)}
                            className={`py-1.5 rounded text-[10px] font-black transition-colors border ${animationSpeed === 0.6 ? "bg-theme-500 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.6)]" : "bg-theme-950/50 text-theme-400 border-theme-800/50 hover:bg-theme-800/50"}`}
                          >
                            Rapide
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-theme-900/50 w-full"></div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest block opacity-70 text-center">
                          Volume des Sons
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setSoundVolume(soundVolume > 0 ? 0 : 0.4)
                            }
                            className="text-theme-400 hover:text-white transition-colors flex-none"
                          >
                            {soundVolume === 0 ? (
                              <IconVolumeX width="20" height="20" />
                            ) : soundVolume < 0.5 ? (
                              <IconVolume1 width="20" height="20" />
                            ) : (
                              <IconVolume2 width="20" height="20" />
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={soundVolume}
                            onChange={(e) =>
                              setSoundVolume(Number(e.target.value))
                            }
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-range"
                            style={{ "--range-pct": `${soundVolume * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest block opacity-70 text-center">
                          Intensité LED
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setLedIntensity(ledIntensity > 0 ? 0 : 1.0)
                            }
                            className="text-theme-400 hover:text-white transition-colors flex-none"
                          >
                            {ledIntensity === 0 ? (
                              <IconLedOff width="20" height="20" />
                            ) : (
                              <IconLedOn width="20" height="20" />
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={ledIntensity}
                            onChange={(e) =>
                              setLedIntensity(Number(e.target.value))
                            }
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-range"
                            style={{ "--range-pct": `${ledIntensity * 50}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2 block opacity-70 text-center">
                          Données & Sauvegarde
                        </span>
                        <div className="flex justify-between gap-2">
                          <button
                            onClick={handleExport}
                            className="flex-1 flex items-center justify-center h-10 bg-theme-900/20 text-theme-400 hover:text-white hover:bg-theme-600/40 rounded-xl transition-all border border-theme-800/50 hover:border-theme-500 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)]"
                          >
                            <IconFloppyUp width="16" height="16" />
                          </button>
                          <label className="flex-1 flex items-center justify-center h-10 bg-theme-900/20 text-theme-400 hover:text-white hover:bg-theme-600/40 rounded-xl transition-all cursor-pointer border border-theme-800/50 hover:border-theme-500 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)]">
                            <IconFloppyDown width="16" height="16" />
                            <input
                              type="file"
                              accept=".json,.zip"
                              className="hidden"
                              onChange={handleImport}
                            />
                          </label>
                          <button
                            onClick={() => {
                              setShowGlobalSettings(false);
                              setPurgeConfirm(true);
                            }}
                            className="flex-1 flex items-center justify-center h-10 bg-red-950/20 text-red-500 hover:text-white hover:bg-red-600/40 rounded-xl transition-all border border-red-900/50 hover:border-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                          >
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
            <div className="absolute inset-y-0 left-3 flex items-center text-theme-400/80 pointer-events-none">
              <IconSearch />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="bg-theme-950/40 border border-theme-500/40 rounded-full py-2 pl-10 pr-4 text-sm text-theme-100 outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)] focus:bg-theme-900/50 placeholder-theme-300/50 w-full transition-all duration-300 shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.2)]"
            />
          </div>
        </header>

        {showTags && !isSelectionMode && search.length < 2 && (
          <div
            className="flex-none flex items-center gap-2 p-3 bg-black/50 border-b border-theme-900/50 animate-in overflow-x-auto shelf-scroll"
            style={{
              paddingLeft: "max(12px, env(safe-area-inset-left))",
              paddingRight: "max(12px, env(safe-area-inset-right))",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-theme-400/60 flex-none pl-1">
              Trier par:
            </span>
            <button
              onClick={() => {
                setSortOrder("group");
                setSafeStorage("mangaHubSortOrder", "group");
              }}
              className={`flex-none px-3 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors ${sortOrder === "group" ? "bg-theme-600/30 text-theme-200 border-theme-500" : "bg-transparent text-theme-400/70 border-transparent hover:bg-white/10"}`}
            >
              Auteur
            </button>
            <button
              onClick={() => {
                setSortOrder("lastRead");
                setSafeStorage("mangaHubSortOrder", "lastRead");
              }}
              className={`flex-none px-3 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors ${sortOrder === "lastRead" ? "bg-theme-600/30 text-theme-200 border-theme-500" : "bg-transparent text-theme-400/70 border-transparent hover:bg-white/10"}`}
            >
              Dernière Lecture
            </button>
            <button
              onClick={() => {
                setSortOrder("dateAdded");
                setSafeStorage("mangaHubSortOrder", "dateAdded");
              }}
              className={`flex-none px-3 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors ${sortOrder === "dateAdded" ? "bg-theme-600/30 text-theme-200 border-theme-500" : "bg-transparent text-theme-400/70 border-transparent hover:bg-white/10"}`}
            >
              Date d'Ajout
            </button>
            <div className="flex-none w-px h-5 bg-white/10 mx-1"></div>
            <button
              onClick={() => setShowBookmarksOnly((p) => !p)}
              className={`flex-none px-3 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors flex items-center gap-1.5 ${showBookmarksOnly ? "bg-amber-600/30 text-amber-200 border-amber-500" : "bg-transparent text-amber-400/70 border-transparent hover:bg-white/10"}`}
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill={showBookmarksOnly ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Marque-pages
            </button>
          </div>
        )}

        {search.length > 1 ? (
          <div className="flex-1 relative bg-black/30 overflow-y-auto custom-scrollbar animate-fade-fast">
            {searchResults.length === 0 ? (
              <div className="text-center p-12 text-white/50 font-bold">
                <div className="text-5xl mb-4">🤷</div>
                Aucun résultat pour{" "}
                <span className="text-theme-300">"{search}"</span>
              </div>
            ) : (
              <ul className="max-w-3xl mx-auto p-4 sm:p-6 space-y-3">
                {searchResults.map((m) => (
                  <li
                    key={m.id}
                    onClick={(e) => {
                      setSearch("");
                      setInspectingManga(m, e);
                    }}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/50 hover:bg-slate-800/70 cursor-pointer transition-colors border border-slate-800 hover:border-theme-500/50 shadow-md"
                  >
                    <div
                      id={`search-book-${m.id}`}
                      className="manga-cover-image w-16 h-24 flex-none rounded-lg overflow-hidden bg-black shadow-lg border border-black/50"
                    >
                      <StackThumbnail file={m.cover} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-black text-white truncate text-base">
                        {m.title}
                      </h4>
                      <p className="text-xs text-theme-300/80 truncate font-bold mt-1">
                        {m.group || "Volume Indépendant"}
                      </p>
                      {m.artist && (
                        <p className="text-[10px] text-theme-200/60 truncate font-bold mt-0.5">
                          🎨 {m.artist}
                        </p>
                      )}
                      {m.tags.length > 0 && (
                        <p className="text-[10px] text-theme-400/70 font-bold uppercase tracking-wider truncate mt-2">
                          {m.tags.join(" • ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <main
            className="flex-1 flex flex-col overflow-hidden relative bg-black"
            style={{
              paddingLeft: "max(0px, env(safe-area-inset-left))",
              paddingRight: "max(0px, env(safe-area-inset-right))",
            }}
          >
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
              <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[1200px] max-h-[1200px] bg-theme-600 rounded-full mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-30 aura-blob-1 gpu-accelerated"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] max-w-[1500px] max-h-[1500px] bg-theme-800 rounded-full mix-blend-screen filter blur-[80px] md:blur-[150px] opacity-40 aura-blob-2 gpu-accelerated"></div>
              <div className="absolute top-[20%] right-[20%] w-[50vw] h-[50vw] max-w-[1000px] max-h-[1000px] bg-theme-400 rounded-full mix-blend-screen filter blur-[50px] md:blur-[100px] opacity-20 aura-blob-3 gpu-accelerated"></div>
            </div>

            {showTags && !isSelectionMode && (
              <div className="flex-none flex flex-col gap-0 relative z-20 animate-in bg-black/80 border-b border-theme-900/50">
                {/* Reset global */}
                {(activeAuthors.length > 0 || activeSeries.length > 0 || activeTags.length > 0) && (
                  <div className="flex justify-end px-6 pt-2">
                    <button
                      onClick={() => { setActiveAuthors([]); setActiveSeries([]); setActiveTags([]); }}
                      className="text-[9px] font-black uppercase tracking-widest text-theme-400 hover:text-white border border-theme-600/40 hover:border-theme-400 rounded-full px-3 py-1 transition-all"
                    >
                      Tout réinitialiser
                    </button>
                  </div>
                )}
                {/* Auteurs */}
                {allAvailableOptions.allAvailableAuthors.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto px-6 lg:px-10 pt-3 pb-1 custom-scrollbar">
                    <span className="flex-none text-[9px] font-black uppercase tracking-widest text-theme-400/50 w-12">Auteur {activeAuthors.length > 0 && <span className="text-theme-300">({activeAuthors.length})</span>}</span>
                    {allAvailableOptions.allAvailableAuthors.map((a, idx) => {
                      const isActive = activeAuthors.includes(a);
                      const next = isActive ? activeAuthors.filter(x => x !== a) : [...activeAuthors, a];
                      return (
                        <button
                          key={a}
                          onClick={() => { console.log("CLICK auteur:", a, "avant:", activeAuthors, "après:", next); setActiveAuthors(next); }}
                          className={`flex-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all animate-tag-pop ${isActive ? "bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]" : "bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/30"}`}
                          style={{ animationDelay: `${idx * 20}ms` }}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Séries */}
                {allAvailableOptions.allAvailableSeries.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto px-6 lg:px-10 pt-2 pb-1 custom-scrollbar">
                    <span className="flex-none text-[9px] font-black uppercase tracking-widest text-theme-400/50 w-12">Série</span>
                    {allAvailableOptions.allAvailableSeries.map((s, idx) => {
                      const isActive = activeSeries.includes(s);
                      const next = isActive ? activeSeries.filter(x => x !== s) : [...activeSeries, s];
                      return (
                        <button
                          key={s}
                          onClick={() => setActiveSeries(next)}
                          className={`flex-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all animate-tag-pop ${isActive ? "bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]" : "bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/30"}`}
                          style={{ animationDelay: `${idx * 20}ms` }}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Tags */}
                {allAvailableOptions.allAvailableTags.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto px-6 lg:px-10 pt-2 pb-3 custom-scrollbar">
                    <span className="flex-none text-[9px] font-black uppercase tracking-widest text-theme-400/50 w-12">Tags</span>
                    {allAvailableOptions.allAvailableTags.map((t, idx) => {
                      const isActive = activeTags.includes(t);
                      const next = isActive ? activeTags.filter(x => x !== t) : [...activeTags, t];
                      return (
                        <button
                          key={t}
                          onClick={() => setActiveTags(next)}
                          className={`flex-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all animate-tag-pop ${isActive ? "bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]" : "bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/30"}`}
                          style={{ animationDelay: `${idx * 20}ms` }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div
              ref={mainContainerRef}
              className="relative flex-1 w-full min-h-0 z-10 bg-[#050810]"
              style={{
                "--row-pt": "clamp(15px, 2vh, 30px)",
                "--row-book-h": "clamp(180px, 32vh, 360px)",
                "--board-h": "clamp(20px, 3vh, 35px)",
                "--pillar-w": "clamp(12px, 2.5vw, 30px)",
                "--row-total":
                  "calc(var(--row-pt) + var(--row-book-h) + var(--board-h))",
              }}
            >
              {["left-0", "right-0"].map((pos) => {
                const t = SHELF_THEMES[shelfTheme] || SHELF_THEMES.mahogany;
                return (
                  <div
                    key={pos}
                    className={`absolute top-0 bottom-0 ${pos} z-[25] pointer-events-none transition-all duration-500`}
                    style={{ width: "var(--pillar-w)", ...t.board }}
                  >
                    {t.texture && (
                      <div
                        className={`absolute inset-0 ${t.texture} pointer-events-none`}
                      ></div>
                    )}
                  </div>
                );
              })}

              {libraryStructure.flattened.length === 0 && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none select-none px-8"
                  style={{ minHeight: "60vh" }}
                >
                  <div className="text-[64px] opacity-20">📚</div>
                  <div className="text-center">
                    <p
                      className="text-theme-400 font-black uppercase tracking-widest text-sm mb-2"
                      style={{
                        textShadow: "0 0 15px rgba(var(--theme-rgb),0.6)",
                      }}
                    >
                      Bibliothèque vide
                    </p>
                    <p className="text-white/30 text-xs font-bold">
                      Appuie sur <span className="text-theme-400">+</span> pour
                      ajouter ton premier manga
                    </p>
                  </div>
                </div>
              )}
              {layout.height > 0 && libraryStructure.flattened.length > 0 && (
                <FixedSizeList
                  height={layout.height}
                  width={layout.width}
                  itemCount={virtualRows.length}
                  itemSize={layout.rowHeight}
                  itemData={{
                    virtualRows,
                    pillarWidth: layout.pillarWidth,
                    bookWidth: layout.bookWidth,
                    shelfTheme,
                    isSelectionMode,
                    selectedMangas,
                    inspectingMangaId,
                    deletingMangas,
                    handleBookPointerEnter,
                    toggleMangaSelection,
                    setInspectingManga,
                    handleReorderManga,
                  }}
                  initialScrollOffset={initialScrollOffset}
                  onScroll={handleScroll}
                >
                  {Row}
                </FixedSizeList>
              )}
            </div>
          </main>
        )}

        {isSelectionMode && search.length < 2 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-theme-500/50 shadow-[0_20px_50px_rgba(var(--theme-rgb),0.5)] px-6 py-4 rounded-2xl flex items-center gap-6 z-[100] animate-slide-up">
            <span className="font-black text-white text-sm whitespace-nowrap drop-shadow-[0_0_8px_rgba(var(--theme-rgb),0.8)]">
              {selectedMangas.size} sélectionné(s)
            </span>
            <div className="flex items-center gap-3">
              <button
                disabled={selectedMangas.size === 0}
                onClick={() => setShowBatchEditModal(true)}
                className="p-2.5 bg-theme-600 text-white rounded-xl hover:scale-105 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition"
              >
                <IconSettings width="20" height="20" />
              </button>
              <button
                disabled={selectedMangas.size === 0}
                onClick={() => setBatchDeleteConfirm(true)}
                className="p-2.5 bg-red-600 text-white rounded-xl hover:scale-105 hover:shadow-[0_0_15px_rgba(220,38,38,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition"
              >
                <IconTrash width="20" height="20" />
              </button>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2.5 bg-theme-600 text-white hover:bg-theme-500 transition font-black text-xs uppercase tracking-widest rounded-xl border border-theme-400 active:scale-95 shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)]"
              >
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <div className="w-px h-8 bg-theme-800/80 mx-1"></div>
              <button
                onClick={toggleSelectionMode}
                className="px-4 py-2.5 text-theme-400 hover:text-theme-200 transition font-black text-xs uppercase tracking-widest bg-theme-950/50 rounded-xl border border-theme-800/50 active:scale-95"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        {showIosBanner && (
          <div
            className="fixed bottom-0 left-0 right-0 z-[200] animate-slide-up"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-4 mb-4 bg-slate-900/98 backdrop-blur-xl border border-theme-500/50 rounded-2xl p-5 shadow-[0_-10px_40px_rgba(var(--theme-rgb),0.4)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-theme-600/20 border border-theme-500/40 flex items-center justify-center flex-none text-2xl">
                  📚
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm mb-1">
                    Installer MangaHub
                  </p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Appuie sur{" "}
                    <span className="text-theme-300 font-bold">⎙ Partager</span>{" "}
                    puis{" "}
                    <span className="text-theme-300 font-bold">
                      « Sur l'écran d'accueil »
                    </span>{" "}
                    pour utiliser l'app hors-ligne.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowIosBanner(false);
                    setSafeStorage("mangaHubIosBannerDismissed", "1");
                  }}
                  className="text-white/40 hover:text-white/80 transition flex-none p-1 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="flex justify-center mt-3">
                <div className="text-theme-400 text-xs font-bold animate-bounce">
                  ↓ Bouton Partager en bas de Safari
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default HubView;
