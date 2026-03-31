import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import {
    IconSettings, IconUpload, IconChevronLeft, IconChevronRight,
    IconTrash, IconCheck, IconFlag, IconAward
} from './Icons';
import {
    initDB, serializeFile, triggerHaptic, EXT_MIME,
    STORE_MANGAS, STORE_PAGES, optimizeImage, deserializeFile
} from '../utils';
import StackThumbnail from './StackThumbnail';

const SingleSelectChipInput = memo(({ existingItems = [], value, onChange, name, placeholder, inputClass = "rounded-xl px-4 py-4 text-sm" }) => {
    const [val, setVal] = useState(value || "");

    useEffect(() => {
        if (value !== undefined) setVal(value);
    }, [value]);

    const handleChange = useCallback((newVal) => {
        if (onChange) onChange(newVal);
        else setVal(newVal);
    }, [onChange]);

    const toggleItem = useCallback((item) => {
        handleChange(val === item ? "" : item);
    }, [val, handleChange]);

    const baseClass = `w-full bg-black border border-theme-600/40 text-theme-300 font-bold text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)] ${inputClass}`;

    return (
        <div className="w-full flex flex-col gap-2">
            <input name={name} value={val} onChange={e => handleChange(e.target.value)} placeholder={placeholder} className={baseClass} />
            {existingItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-1 max-h-24 overflow-y-auto custom-scrollbar p-1">
                    {existingItems.map(item => {
                        const isSelected = val === item;
                        return (
                            <button type="button" key={item} onClick={() => toggleItem(item)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors border active:scale-95 ${isSelected ? 'bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]' : 'bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/40'}`}>
                                {item}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

export const GroupInput = memo(({ existingGroups = [], ...props }) => <SingleSelectChipInput {...props} existingItems={existingGroups} placeholder={props.placeholder || "Série / Pile (Optionnel)"} />);
export const ArtistInput = memo(({ existingArtists = [], ...props }) => <SingleSelectChipInput {...props} existingItems={existingArtists} placeholder={props.placeholder || "Artiste / Auteur (Optionnel)"} />);

export const TagInput = memo(({ existingTags = [], value, defaultValue, onChange, name, placeholder, className }) => {
    const [val, setVal] = useState(value !== undefined ? value : (defaultValue || ""));

    useEffect(() => {
        if (value !== undefined) setVal(value);
    }, [value]);

    const handleChange = useCallback((newVal) => {
        if (onChange) onChange(newVal);
        else setVal(newVal);
    }, [onChange]);

    const currentTagsSet = useMemo(() => new Set(val.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)), [val]);

    const toggleTag = useCallback((tag) => {
        const currentTags = Array.from(currentTagsSet);
        if (currentTags.includes(tag)) {
            handleChange(currentTags.filter(t => t !== tag).join(', '));
        } else {
            handleChange([...currentTags, tag].join(', '));
        }
    }, [currentTagsSet, handleChange]);

    return (
        <div className="w-full flex flex-col gap-2">
            <input name={name} value={val} onChange={e => handleChange(e.target.value)} placeholder={placeholder} className={className} />
            {existingTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-1 max-h-24 overflow-y-auto custom-scrollbar p-1">
                    {existingTags.map(t => {
                        const isSelected = currentTagsSet.has(t);
                        return (
                            <button type="button" key={t} onClick={() => toggleTag(t)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors border active:scale-95 ${isSelected ? 'bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]' : 'bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/40'}`}>
                                {t}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

export const ChapterTitleModal = memo(({ initialValue = "", onConfirm, onCancel }) => {
    const [val, setVal] = useState(initialValue);
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
            <div className="bg-slate-900 border border-theme-500/50 p-6 rounded-[24px] w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in">
                <h3 className="text-theme-400 font-black uppercase text-center mb-4 tracking-widest text-sm">Nom du Chapitre</h3>
                <input
                    autoFocus
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    placeholder="Ex: Chapitre 1, Combat..."
                    className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-3 text-theme-300 font-bold text-sm text-center outline-none focus:border-theme-400 mb-6"
                    onKeyDown={e => { if (e.key === 'Enter') onConfirm(val); if (e.key === 'Escape') onCancel(); }}
                />
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 text-[10px] font-black uppercase text-theme-500 border border-theme-800 rounded-xl hover:bg-white/5">Annuler</button>
                    <button onClick={() => onConfirm(val)} className="flex-1 py-3 text-[10px] font-black uppercase bg-theme-600 text-white rounded-xl shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)]">Valider</button>
                </div>
            </div>
        </div>
    );
});

export const ManualPageManageModal = memo(({ pages, chapters = [], onSave, onCancel, isImport = true }) => {
    const [orderedPages, setOrderedPages] = useState(pages);
    const [selectedPages, setSelectedPages] = useState(new Set());
    const [localChapters, setLocalChapters] = useState(chapters); // [{ name, startIndex }]
    const [editingChapter, setEditingChapter] = useState(null); // { index, name }

    const handleDragStart = (e, index) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', index); };
    const handleDragOver = (e, index) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, index) => {
        e.preventDefault(); e.stopPropagation();
        const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(draggedIdx) && draggedIdx !== index) {
            const newPages = [...orderedPages];
            const item = newPages.splice(draggedIdx, 1)[0];
            newPages.splice(index, 0, item);

            // On ajuste les chapitres si nécessaire (ou on les invalide si c'est trop complexe, mais restons simple : on les garde liés à la page visuelle)
            setOrderedPages(newPages);
        }
    };

    const togglePageSelection = (e, index) => {
        e.preventDefault(); e.stopPropagation();
        setSelectedPages(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const toggleChapter = (index) => {
        const existing = localChapters.find(c => c.startIndex === index);
        setEditingChapter({ index, name: existing ? existing.name : "" });
    };

    const confirmChapter = (name) => {
        if (!name.trim()) {
            setLocalChapters(prev => prev.filter(c => c.startIndex !== editingChapter.index));
        } else {
            setLocalChapters(prev => {
                const filtered = prev.filter(c => c.startIndex !== editingChapter.index);
                return [...filtered, { name: name.trim(), startIndex: editingChapter.index }].sort((a, b) => a.startIndex - b.startIndex);
            });
        }
        setEditingChapter(null);
    };

    return (
        <div className="fixed inset-0 z-[400] bg-black/95 p-4 sm:p-8 lg:p-12 flex flex-col animate-fade backdrop-blur-md overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-theme-600/30 pb-6 flex-none animate-in w-full mx-auto md:px-8">
                <div>
                    <h3 className="text-lg sm:text-2xl font-black uppercase text-theme-400 tracking-widest" style={{ textShadow: '0 0 15px rgba(var(--theme-rgb),0.8)' }}>
                        {isImport ? "Ordre & Chapitres" : "Modifier les Chapitres"}
                    </h3>
                    <p className="text-xs text-theme-300/60 uppercase mt-2 font-bold">Signet 🔖 pour créer un chapitre</p>
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="hidden sm:block px-6 py-3 border border-theme-800 text-theme-500 rounded-2xl text-[10px] font-black uppercase hover:bg-white/5 active:scale-95">Annuler</button>
                    <button type="button" onClick={() => onSave(orderedPages, localChapters)} className="bg-theme-600 text-white border border-theme-400 px-6 py-3 sm:px-8 sm:py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] hover:scale-105 active:scale-95">
                        {isImport ? "TERMINER" : "SAUVEGARDER"}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-32 animate-in w-full mx-auto md:px-8">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 sm:gap-6 lg:gap-8">
                    {orderedPages.map((f, i) => {
                        const isSelected = selectedPages.has(i);
                        const chapter = localChapters.find(c => c.startIndex === i);
                        return (
                            <div key={f.name || i} draggable onDragStart={(e) => handleDragStart(e, i)} onDragOver={(e) => handleDragOver(e, i)} onDrop={(e) => handleDrop(e, i)}
                                className={`relative aspect-[3/4.5] bg-black rounded-2xl overflow-hidden border transition-all cursor-move group select-none touch-none ${chapter ? 'border-theme-400 ring-2 ring-theme-500/30' : 'border-theme-600/40'} ${isSelected ? 'opacity-80 scale-[0.98]' : ''}`}
                            >
                                <div className="absolute inset-0 pointer-events-none"><StackThumbnail file={f} /></div>
                                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-theme-400 font-black text-[10px] min-w-[24px] h-[24px] flex items-center justify-center rounded-lg border border-theme-500/50 shadow-[0_0_10px_rgba(var(--theme-rgb),0.4)] z-10 pointer-events-none">{i + 1}</div>

                                {chapter && (
                                    <div className="absolute top-2 right-2 left-10 bg-theme-600/90 backdrop-blur-md text-white font-black text-[9px] uppercase h-[24px] flex items-center px-3 rounded-lg border border-theme-400 shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)] z-10 truncate translate-x-0 animate-slide-in">
                                        🔖 {chapter.name}
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); toggleChapter(i); }} title="Définir un chapitre" className={`p-3 rounded-2xl border transition-all active:scale-90 ${chapter ? 'bg-theme-600 border-theme-400 text-white' : 'bg-black/60 border-white/20 text-white hover:bg-theme-600 hover:border-theme-400'}`}>
                                        <IconFlag width="20" height="20" />
                                    </button>
                                    {isImport && (
                                        <button onClick={(e) => togglePageSelection(e, i)} className={`p-3 rounded-2xl border transition-all active:scale-90 ${isSelected ? 'bg-red-600 border-red-400 text-white' : 'bg-black/60 border-white/20 text-white hover:bg-red-600 hover:border-red-400'}`}>
                                            <IconTrash width="20" height="20" />
                                        </button>
                                    )}
                                </div>

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-8 pointer-events-none z-10">
                                    <p className="text-[9px] text-theme-100 font-bold truncate text-center opacity-70 group-hover:opacity-100">{f.name}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedPages.size > 0 && isImport && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-red-500/50 shadow-[0_20px_50px_rgba(220,38,38,0.5)] px-6 py-4 rounded-2xl items-center gap-6 z-[500] animate-slide-up flex">
                    <span className="font-black text-white text-sm whitespace-nowrap">{selectedPages.size} sélectionnée(s)</span>
                    <button onClick={() => { setOrderedPages(prev => prev.filter((_, idx) => !selectedPages.has(idx))); setSelectedPages(new Set()); }} className="p-3 bg-red-600 text-white rounded-xl active:scale-95 transition"><IconTrash width="20" height="20" /></button>
                    <button onClick={() => setSelectedPages(new Set())} className="px-4 py-2 text-theme-400 font-black text-xs uppercase">Annuler</button>
                </div>
            )}

            {editingChapter && (
                <ChapterTitleModal
                    initialValue={editingChapter.name}
                    onConfirm={confirmChapter}
                    onCancel={() => setEditingChapter(null)}
                />
            )}
        </div>
    );
});

export const EditMangaModal = memo(({ editingManga, onClose, onSubmit, existingGroups = [], existingTags = [], existingArtists = [] }) => {
    const [isEditingChapters, setIsEditingChapters] = useState(false);
    const [existingPages, setExistingPages] = useState([]);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [currentChapters, setCurrentChapters] = useState(editingManga?.chapters || []);
    const [modifiedPages, setModifiedPages] = useState(null);

    if (!editingManga) return null;

    const handleOpenChapters = async () => {
        setIsLoadingPages(true);
        const db = await initDB();
        db.transaction(STORE_PAGES).objectStore(STORE_PAGES).get(editingManga.id).onsuccess = (e) => {
            if (e.target.result) {
                const pages = e.target.result.pages.map(p => deserializeFile(p));
                setExistingPages(pages);
                setIsEditingChapters(true);
            }
            setIsLoadingPages(false);
        };
    };

    // Sauvegarde les pages et chapitres modifiés depuis la modale de gestion manuelle
    const handleSaveChapters = (newPages, newChapters) => {
        setCurrentChapters(newChapters);
        // Compare la nouvelle liste de pages avec l'ancienne pour voir si l'ordre a changé.
        // Une simple comparaison de noms de fichiers suffit ici.
        if (JSON.stringify(existingPages.map(p => p.name)) !== JSON.stringify(newPages.map(p => p.name))) {
            setModifiedPages(newPages);
        }
        setIsEditingChapters(false);
    };

    // Soumission finale du formulaire de modification
    const handleFinalSubmit = (e) => {
        e.preventDefault();
        onSubmit(e, currentChapters, modifiedPages);
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 animate-fade backdrop-blur-md">
            <div className="bg-slate-900/95 w-full max-w-lg rounded-[32px] p-8 border border-theme-600/40 shadow-[0_0_40px_rgba(var(--theme-rgb),0.3)] relative animate-in">
                <h2 className="text-xl font-black mb-8 text-center uppercase text-theme-400" style={{ textShadow: '0 0 10px rgba(var(--theme-rgb),0.8)' }}>Modifier</h2>
                <form onSubmit={handleFinalSubmit} className="space-y-5">
                    <input name="title" defaultValue={editingManga.title} required className="w-full bg-black border border-theme-600/40 rounded-2xl px-5 py-4 text-theme-300 font-bold text-base text-center outline-none focus:border-theme-400 focus:shadow-[0_0_20px_rgba(var(--theme-rgb),0.4)] transition-all" />

                    <div className="grid grid-cols-2 gap-4">
                        <ArtistInput existingArtists={existingArtists} value={editingManga.artist || ""} name="artist" inputClass="rounded-2xl px-5 py-4 text-sm" />
                        <GroupInput existingGroups={existingGroups} value={editingManga.group || ""} name="group" inputClass="rounded-2xl px-5 py-4 text-sm" />
                    </div>

                    <TagInput existingTags={existingTags} name="tags" defaultValue={(editingManga.tags || []).join(', ')} placeholder="Tags (Ex: Shonen, Action...)" className="w-full bg-black border border-theme-600/40 rounded-2xl px-5 py-4 text-theme-300 font-bold text-sm text-center outline-none transition-all" />

                    <button type="button" onClick={handleOpenChapters} disabled={isLoadingPages} className={`w-full py-5 rounded-2xl bg-theme-600/10 border border-theme-500/50 text-theme-100 font-black uppercase text-xs transition-all hover:bg-theme-600/20 active:scale-95 flex items-center justify-center gap-2 ${isLoadingPages ? 'opacity-50 pointer-events-none' : ''}`}>
                        <IconFlag width="18" height="18" /> {isLoadingPages ? 'Chargement...' : 'Gérer les Chapitres'}
                        {currentChapters.length > 0 && <span className="bg-theme-600 px-2 py-0.5 rounded-full text-[10px] ml-2">{currentChapters.length}</span>}
                    </button>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 sm:py-5 bg-black text-theme-400 border border-theme-600/40 font-black text-xs rounded-2xl uppercase transition hover:bg-theme-950/30">Annuler</button>
                        <button type="submit" className="flex-1 py-4 sm:py-5 bg-theme-600 text-white font-black text-xs rounded-2xl uppercase transition shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] hover:scale-105">Valider</button>
                    </div>
                </form>
            </div>
            {isEditingChapters && (
                <ManualPageManageModal
                    pages={existingPages}
                    chapters={currentChapters}
                    onSave={handleSaveChapters}
                    onCancel={() => setIsEditingChapters(false)}
                    isImport={false}
                />
            )}
        </div>
    );
});

export const BatchEditModal = memo(({ isOpen, count, onClose, onSubmit, existingTags = [], existingGroups = [], existingArtists = [] }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 animate-fade backdrop-blur-md">
            <div className="bg-slate-900/95 w-full max-w-lg rounded-[32px] p-8 border border-theme-600/40 shadow-[0_0_40px_rgba(var(--theme-rgb),0.3)] relative animate-in">
                <h2 className="text-xl font-black mb-2 text-center uppercase text-theme-400" style={{ textShadow: '0 0 10px rgba(var(--theme-rgb),0.8)' }}>Action en lot</h2>
                <p className="text-center text-xs text-theme-300/70 mb-8 font-bold uppercase tracking-widest">{count} mangas sélectionnés</p>
                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="bg-black/50 p-4 rounded-2xl border border-theme-800/50">
                        <label className="block text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2">Définir la Série / Pile</label>
                        <GroupInput existingGroups={existingGroups} name="group" placeholder="Taper 'CLEAR' pour retirer de la pile" inputClass="rounded-xl px-4 py-3 text-sm" />
                    </div>
                    <div className="bg-black/50 p-4 rounded-2xl border border-theme-800/50">
                        <label className="block text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2">Définir l'Artiste</label>
                        <ArtistInput existingArtists={existingArtists} name="artist" placeholder="Taper 'CLEAR' pour retirer" inputClass="rounded-xl px-4 py-3 text-sm" />
                    </div>
                    <div className="bg-black/50 p-4 rounded-2xl border border-theme-800/50">
                        <label className="block text-[10px] text-theme-400 font-black uppercase tracking-widest mb-2">Ajouter des Tags</label>
                        <TagInput existingTags={existingTags} name="tags" placeholder="Ex: Shonen, Terminé... (Laisser vide pour ignorer)" className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-3 text-theme-300 font-bold text-sm outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] transition-all" />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 sm:py-5 bg-black text-theme-400 border border-theme-600/40 font-black text-xs rounded-2xl uppercase transition hover:bg-theme-950/30">Annuler</button>
                        <button type="submit" className="flex-1 py-4 sm:py-5 bg-theme-600/20 text-theme-300 border border-theme-500 font-black text-xs rounded-2xl uppercase transition shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)]">Appliquer</button>
                    </div>
                </form>
            </div>
        </div>
    );
});

const CoverPicker = memo(({ preview, label, sublabel, isRequired, height = "h-40", onFile }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleChange = (e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const commonProps = {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
    };

    const previewClass = `relative rounded-2xl border cursor-pointer active:scale-95 transition-all ${height} overflow-hidden shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] block group bg-black ${isDraggingOver ? 'border-theme-400 scale-105 ring-4 ring-theme-500/50' : 'border-theme-500'}`;
    const emptyClass = `relative bg-black hover:bg-theme-950/30 rounded-2xl border p-4 text-center cursor-pointer active:scale-95 transition-all flex flex-col items-center justify-center ${height} shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.3)] group ${isDraggingOver ? 'border-theme-400 scale-105 bg-theme-900/50' : 'border-theme-600/40 hover:border-theme-400'}`;

    return preview ? (
        <label {...commonProps} className={previewClass}>
            {isDraggingOver && <div className="absolute inset-0 bg-theme-600/50 backdrop-blur-sm z-30 flex items-center justify-center text-white font-black text-lg uppercase tracking-widest">Déposer</div>}
            <img src={preview} className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl z-10" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-3 px-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <span className="text-[10px] text-white font-black uppercase drop-shadow-[0_0_5px_rgba(0,0,0,1)]">{label}</span>
                <span className="bg-theme-600/80 border border-theme-400 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-md">MODIFIER</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </label>
    ) : (
        <label {...commonProps} className={emptyClass}>
            <span className="text-xs text-theme-200 uppercase font-black mb-1 group-hover:text-theme-100 transition-colors">{label}</span>
            {sublabel && <span className="text-theme-700 text-[9px] font-bold uppercase mb-2">{sublabel}</span>}
            <span className={`font-black text-[10px] px-3 py-1.5 rounded-lg transition-all border ${isRequired ? 'text-theme-400 bg-theme-900/40 border-theme-500/30 group-hover:bg-theme-600/30 group-hover:border-theme-400' : 'text-theme-500 bg-theme-950 border-theme-800/50 group-hover:bg-theme-900/50 group-hover:border-theme-600'}`}>+ AJOUTER</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </label>
    );
});

export const AddChapterModal = memo(({ onClose, onSuccess, setLoading, setImportProgress, showToast, existingGroups = [], existingTags = [], existingArtists = [] }) => {
    const [formTitle, setFormTitle] = useState("");
    const [formGroup, setFormGroup] = useState("");
    const [formArtist, setFormArtist] = useState("");
    const [formMangaDir, setFormMangaDir] = useState('rtl');
    const [formTags, setFormTags] = useState("");

    const [coverStartFile, setCoverStartFile] = useState(null);
    const [coverStartPreview, setCoverStartPreview] = useState(null);
    const [coverEndFile, setCoverEndFile] = useState(null);
    const [coverEndPreview, setCoverEndPreview] = useState(null);
    const [coverDoubleFile, setCoverDoubleFile] = useState(null);
    const [coverDoublePreview, setCoverDoublePreview] = useState(null);

    const [chapters, setChapters] = useState([]);
    const [orderedPages, setOrderedPages] = useState([]);
    const [rawPages, setRawPages] = useState([]);
    const [isManualSorting, setIsManualSorting] = useState(false);
    const [sortMethod, setSortMethod] = useState('name-asc');
    const [selectedPages, setSelectedPages] = useState(new Set());

    useEffect(() => {
        return () => {
            if (coverStartPreview) URL.revokeObjectURL(coverStartPreview);
            if (coverEndPreview) URL.revokeObjectURL(coverEndPreview);
            if (coverDoublePreview) URL.revokeObjectURL(coverDoublePreview);
        };
    }, [coverStartPreview, coverEndPreview, coverDoublePreview]);

    useEffect(() => {
        if (!rawPages.length || sortMethod === 'custom') return;
        let files = [...rawPages];
        if (sortMethod === 'name-asc') files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        else if (sortMethod === 'date-asc') files.sort((a, b) => a.lastModified - b.lastModified);
        else if (sortMethod === 'date-desc') files.sort((a, b) => b.lastModified - a.lastModified);
        setOrderedPages(files);
    }, [rawPages, sortMethod]);

    const handlePagesSelection = (e) => { if (e.target.files && e.target.files.length > 0) { setRawPages(Array.from(e.target.files)); setSortMethod('name-asc'); setIsManualSorting(false); } };

    const handleZipImport = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setCoverStartFile(null); setCoverStartPreview(null); setCoverEndFile(null); setCoverEndPreview(null); setCoverDoubleFile(null); setCoverDoublePreview(null);
        setLoading(true); setImportProgress("Lecture archive...");
        try {
            const zip = new JSZip(); await zip.loadAsync(file);
            let metadata = null; if (zip.file("metadata.json")) { try { metadata = JSON.parse(await zip.file("metadata.json").async("string")); } catch (e) { } }
            const filesMap = {};
            const zipEntries = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && !relativePath.includes('__MACOSX') && !relativePath.endsWith('metadata.json')) {
                    zipEntries.push({ relativePath, zipEntry });
                }
            });

            for (let i = 0; i < zipEntries.length; i++) {
                if (i % 5 === 0) {
                    setImportProgress(`Extraction fichier ${i + 1}/${zipEntries.length}...`);
                    await new Promise(r => setTimeout(r, 0)); // Permet à l'UI de s'actualiser
                }
                const { relativePath, zipEntry } = zipEntries[i];
                const buffer = await zipEntry.async('arraybuffer');
                const fileName = relativePath.split('/').pop();
                const ext = fileName.split('.').pop().toLowerCase();
                const blob = new Blob([buffer], { type: EXT_MIME[ext] || 'image/jpeg' });
                blob.name = fileName;
                filesMap[relativePath] = blob;
            }
            if (metadata) {
                setImportProgress("Restauration...");
                setFormTitle(metadata.title || "");
                setFormMangaDir(metadata.direction || "rtl");
                if (metadata.group) setFormGroup(metadata.group);
                if (metadata.artist) setFormArtist(metadata.artist);
                const importedTags = new Set((metadata.tags || []).map(t => t.toUpperCase()));
                setFormTags(Array.from(importedTags).join(', '));

                if (metadata.coverStart && filesMap[metadata.coverStart]) { setCoverStartFile(filesMap[metadata.coverStart]); setCoverStartPreview(URL.createObjectURL(filesMap[metadata.coverStart])); }
                if (metadata.coverEnd && filesMap[metadata.coverEnd]) { setCoverEndFile(filesMap[metadata.coverEnd]); setCoverEndPreview(URL.createObjectURL(filesMap[metadata.coverEnd])); }
                if (metadata.coverDouble && filesMap[metadata.coverDouble]) { setCoverDoubleFile(filesMap[metadata.coverDouble]); setCoverDoublePreview(URL.createObjectURL(filesMap[metadata.coverDouble])); }
                const pages = (metadata.pages || []).map(p => filesMap[p]).filter(Boolean);
                setOrderedPages(pages); setRawPages(pages);
            } else {
                const images = Object.values(filesMap).filter(f => f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                if (images.length === 0) throw new Error("Archive vide");
                setFormTitle(file.name.replace(/\.(zip|cbz)$/i, '')); setOrderedPages(images); setRawPages(images);
                setCoverStartFile(images[0]); setCoverStartPreview(URL.createObjectURL(images[0]));
            }
            setLoading(false); setImportProgress(null);
        } catch (error) { console.error("Erreur zip:", error); showToast("Erreur de lecture de l'archive.", "error"); setLoading(false); setImportProgress(null); }
        e.target.value = '';
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!orderedPages.length || (!coverStartFile && !coverDoubleFile)) { showToast("Couverture et pages requises !", "error"); return; }
        setLoading(true); setImportProgress("Préparation des fichiers...");
        try {
            const mangaId = "m_" + Date.now();
            const newTags = formTags.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
            const finalGroup = formGroup.trim() || null;
            const finalArtist = formArtist.trim() || null;

            // Optimisation des couvertures (max 1600px, qualité 85%)
            const optCoverDouble = coverDoubleFile ? await optimizeImage(coverDoubleFile, 1600, 0.85) : null;
            const optCoverStart = coverStartFile ? await optimizeImage(coverStartFile, 1600, 0.85) : null;
            const optCoverEnd = coverEndFile ? await optimizeImage(coverEndFile, 1600, 0.85) : null;
            const optCoverFallback = optCoverStart || optCoverDouble;

            const sCoverDouble = await serializeFile(optCoverDouble);
            const sCoverStart = await serializeFile(optCoverStart);
            const sCoverEnd = await serializeFile(optCoverEnd);
            const sCover = await serializeFile(optCoverFallback);

            setImportProgress(`Traitement de ${orderedPages.length} pages...`);

            // Optimisation et sérialisation des pages en parallèle pour une meilleure performance
            const pageProcessingPromises = orderedPages.map(page =>
                optimizeImage(page, 1600, 0.80).then(serializeFile)
            );
            const sOrderedPages = await Promise.all(pageProcessingPromises);

            const db = await initDB();
            const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");

            tx.objectStore(STORE_MANGAS).add({
                id: mangaId, title: formTitle || "Sans titre", group: finalGroup, artist: finalArtist, direction: formMangaDir, tags: newTags,
                coverDouble: sCoverDouble,
                coverStart: sCoverStart,
                coverEnd: sCoverEnd,
                cover: sCover,
                totalPages: sOrderedPages.length, progress: 0, date: Date.now(),
                chapters: chapters
            });

            tx.objectStore(STORE_PAGES).add({ id: mangaId, pages: sOrderedPages });

            tx.oncomplete = () => { setLoading(false); setImportProgress(null); triggerHaptic(100); onSuccess(); };
        } catch (error) { console.error(error); setLoading(false); setImportProgress(null); showToast("Erreur lors de l'importation.", "error"); }
    };

    const togglePageSelection = (e, index) => {
        e.preventDefault(); e.stopPropagation();
        setSelectedPages(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const deleteSelectedPages = () => {
        const newPages = orderedPages.filter((_, i) => !selectedPages.has(i));
        setOrderedPages(newPages);
        setSelectedPages(new Set());
        setSortMethod('custom');
    };

    const handleMoveStep = (e, index, direction) => {
        e.preventDefault(); e.stopPropagation();
        const toIndex = index + direction;
        if (toIndex < 0 || toIndex >= orderedPages.length) return;
        const newPages = [...orderedPages];
        const item = newPages.splice(index, 1)[0];
        newPages.splice(toIndex, 0, item);
        setOrderedPages(newPages);
        setSortMethod('custom');
    };
    const toggleSelectAll = () => {
        if (selectedPages.size === orderedPages.length) {
            setSelectedPages(new Set());
        } else {
            setSelectedPages(new Set(orderedPages.map((_, i) => i)));
        }
    };

    const handleSaveManual = (newPages, newChapters) => {
        setOrderedPages(newPages);
        setChapters(newChapters);
        setIsManualSorting(false);
    };

    return (
        <>
            <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 animate-fade backdrop-blur-md">
                <form onSubmit={handleAdd} className="bg-slate-900/95 w-full max-w-2xl rounded-[32px] p-6 sm:p-8 border border-theme-600/40 shadow-[0_0_50px_rgba(var(--theme-rgb),0.3)] flex flex-col max-h-[90vh] relative overflow-hidden animate-in">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-theme-600/20 blur-[60px] rounded-full pointer-events-none"></div>
                    <h2 className="text-theme-400 font-black mb-6 uppercase text-center tracking-widest text-base sm:text-lg flex-none relative z-10" style={{ textShadow: '0 0 15px rgba(var(--theme-rgb),0.8)' }}>Nouveau Manga</h2>

                    <div className="overflow-y-auto flex-1 pr-2 pb-2 relative z-10 custom-scrollbar">
                        <div className="mb-6 bg-black border border-theme-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[inset_0_0_20px_rgba(var(--theme-rgb),0.1)]">
                            <span className="text-theme-400 font-black text-xs uppercase tracking-widest mb-3" style={{ textShadow: '0 0 8px rgba(var(--theme-rgb),0.5)' }}>Import Rapide ZIP/CBZ</span>
                            <label id="tutorial-import-zip" className="bg-theme-600/20 text-theme-300 border border-theme-500 px-6 py-3 rounded-xl text-xs font-black uppercase cursor-pointer active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] hover:bg-theme-600/40"><IconUpload className="w-5 h-5" /> SÉLECTIONNER UNE ARCHIVE<input type="file" accept=".zip,.cbz" className="hidden" onChange={handleZipImport} /></label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Titre du manga" required className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-4 text-theme-300 font-bold text-sm text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] placeholder-theme-800 transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)]" />
                            <ArtistInput existingArtists={existingArtists} value={formArtist} onChange={setFormArtist} name="artist" inputClass="rounded-xl px-4 py-4 text-sm placeholder-theme-800" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <GroupInput existingGroups={existingGroups} value={formGroup} onChange={setFormGroup} name="group" inputClass="rounded-xl px-4 py-4 text-sm" />
                                <TagInput existingTags={existingTags} value={formTags} onChange={setFormTags} placeholder="Tags (Action, Terminé...)" className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-4 text-theme-300 font-bold text-sm text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] placeholder-theme-800 transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)]" />
                            </div>
                        </div>

                        <div className="mb-6">
                            <select value={formMangaDir} onChange={e => setFormMangaDir(e.target.value)} className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-4 text-xs text-theme-300 font-black uppercase tracking-widest outline-none focus:border-theme-400 transition-all appearance-none text-center">
                                <option value="rtl">Lecture Manga (Droite à Gauche)</option>
                                <option value="ltr">Lecture BD (Gauche à Droite)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <CoverPicker
                                preview={coverDoublePreview} label="Jaquette Complète"
                                sublabel="Optionnel - Pour l'effet 3D" height="h-32"
                                onFile={f => { if (coverDoublePreview) URL.revokeObjectURL(coverDoublePreview); setCoverDoubleFile(f); setCoverDoublePreview(URL.createObjectURL(f)); }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <CoverPicker
                                preview={coverStartPreview} label="Cover Début" sublabel="Requis" isRequired={true}
                                onFile={f => { if (coverStartPreview) URL.revokeObjectURL(coverStartPreview); setCoverStartFile(f); setCoverStartPreview(URL.createObjectURL(f)); }}
                            />
                            <CoverPicker
                                preview={coverEndPreview} label="Cover Fin" sublabel="Optionnel" isRequired={false}
                                onFile={f => { if (coverEndPreview) URL.revokeObjectURL(coverEndPreview); setCoverEndFile(f); setCoverEndPreview(URL.createObjectURL(f)); }}
                            />
                        </div>

                        <div className={`relative rounded-2xl border text-center transition-all h-32 mb-2 group ${orderedPages.length > 0 ? 'bg-theme-950/30 border-theme-500 shadow-[0_0_20px_rgba(var(--theme-rgb),0.3)]' : 'bg-black hover:bg-theme-950/30 border-theme-600/40 shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.3)] hover:border-theme-400'}`}>
                            <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center z-10 active:scale-95">
                                <span className={`text-xs uppercase font-black mb-2 transition-colors ${orderedPages.length > 0 ? 'text-theme-300' : 'text-theme-200 group-hover:text-theme-100'}`}>Pages Intérieures</span>
                                <span className="text-theme-700 text-[10px] font-bold uppercase mb-3">Sélection Multiple</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handlePagesSelection} />
                                {orderedPages.length > 0 ? (
                                    <span className="text-theme-100 font-black text-[10px] bg-theme-600/40 border border-theme-400 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(var(--theme-rgb),0.5)]">✓ {orderedPages.length} PAGES</span>
                                ) : (
                                    <span className="text-theme-400 font-black text-[10px] bg-theme-900/40 border border-theme-500/30 px-3 py-1.5 rounded-lg group-hover:bg-theme-600/30 group-hover:border-theme-400 transition-all">+ SÉLECTIONNER</span>
                                )}
                                {orderedPages.length > 0 && (<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsManualSorting(true); }} className="absolute top-3 right-3 p-2 bg-theme-600/40 text-theme-100 hover:text-white rounded-xl border border-theme-400 hover:bg-theme-500 transition-all z-20 shadow-[0_0_15px_rgba(var(--theme-rgb),0.6)]" title="Ordre & Chapitres"><IconSettings width="20" height="20" /></button>)}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-4 pt-6 border-t border-theme-600/30 flex-none relative z-10">
                        <button type="button" onClick={onClose} className="flex-1 py-4 sm:py-5 text-theme-500 hover:text-theme-300 hover:bg-theme-950/30 font-black uppercase text-[10px] sm:text-xs rounded-2xl transition-all border border-transparent hover:border-theme-600/40">Annuler</button>
                        <button type="submit" disabled={(!coverStartFile && !coverDoubleFile) || orderedPages.length === 0} className={`flex-1 py-4 sm:py-5 rounded-2xl font-black uppercase text-[10px] sm:text-xs transition-all shadow-lg border ${((!coverStartFile && !coverDoubleFile) || orderedPages.length === 0) ? 'bg-black text-theme-800 border-theme-900/30 shadow-none cursor-not-allowed' : 'bg-theme-600 text-white border-theme-400 hover:scale-[1.02] shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] active:scale-95'}`}>Lancer l'import</button>
                    </div>
                </form>
            </div>
            {isManualSorting && (
                <ManualPageManageModal
                    pages={orderedPages}
                    chapters={chapters}
                    onSave={handleSaveManual}
                    onCancel={() => setIsManualSorting(false)}
                />
            )}
        </>
    );
});