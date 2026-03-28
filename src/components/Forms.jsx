import React, { useState, useEffect, memo } from 'react';
import JSZip from 'jszip';
import { IconSettings, IconUpload, IconChevronLeft, IconChevronRight, IconTrash, IconCheck } from './Icons';
import { 
    initDB, serializeFile, triggerHaptic, EXT_MIME, 
    STORE_MANGAS, STORE_PAGES, getCachedUrl, optimizeImage
} from '../utils';

const StackThumbnail = memo(({ file, contain = false, className = "" }) => {
    const url = getCachedUrl(file);
    return url ? <img src={url} loading="lazy" decoding="async" className={`w-full h-full gpu-accelerated ${contain ? 'object-contain' : 'object-cover'} ${className}`} /> : null;
});

export const GroupInput = memo(({ existingGroups = [], value, onChange, name, placeholder, inputClass = "rounded-xl px-4 py-4 text-sm" }) => {
    const [val, setVal] = useState(value || "");

    useEffect(() => {
        if (value !== undefined) setVal(value);
    }, [value]);

    const handleChange = (newVal) => {
        if (onChange) onChange(newVal);
        setVal(newVal);
    };

    const toggleGroup = (group) => {
        if (val === group) handleChange("");
        else handleChange(group);
    };

    const baseClass = `w-full bg-black border border-theme-600/40 text-theme-300 font-bold text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)] ${inputClass}`;

    return (
        <div className="w-full flex flex-col gap-2">
            <input name={name} value={val} onChange={e => handleChange(e.target.value)} placeholder={placeholder || "Série / Pile (Optionnel)"} className={baseClass} />
            {existingGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-1 max-h-24 overflow-y-auto custom-scrollbar p-1">
                    {existingGroups.map(g => {
                        const isSelected = val === g;
                        return (
                            <button type="button" key={g} onClick={() => toggleGroup(g)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors border active:scale-95 ${isSelected ? 'bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]' : 'bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/40'}`}>
                                {g}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

export const ArtistInput = memo(({ existingArtists = [], value, onChange, name, placeholder, inputClass = "rounded-xl px-4 py-4 text-sm" }) => {
    const [val, setVal] = useState(value || "");

    useEffect(() => {
        if (value !== undefined) setVal(value);
    }, [value]);

    const handleChange = (newVal) => {
        if (onChange) onChange(newVal);
        setVal(newVal);
    };

    const toggleArtist = (artist) => {
        if (val === artist) handleChange("");
        else handleChange(artist);
    };

    const baseClass = `w-full bg-black border border-theme-600/40 text-theme-300 font-bold text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)] ${inputClass}`;

    return (
        <div className="w-full flex flex-col gap-2">
            <input name={name} value={val} onChange={e => handleChange(e.target.value)} placeholder={placeholder || "Artiste / Auteur (Optionnel)"} className={baseClass} />
            {existingArtists.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-1 max-h-24 overflow-y-auto custom-scrollbar p-1">
                    {existingArtists.map(a => {
                        const isSelected = val === a;
                        return (
                            <button type="button" key={a} onClick={() => toggleArtist(a)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors border active:scale-95 ${isSelected ? 'bg-theme-600 text-white border-theme-400 shadow-[0_0_10px_rgba(var(--theme-rgb),0.5)]' : 'bg-black text-theme-400 border-theme-600/40 hover:bg-theme-900/40'}`}>
                                {a}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

export const TagInput = memo(({ existingTags = [], value, defaultValue, onChange, name, placeholder, className }) => {
    const [val, setVal] = useState(value !== undefined ? value : (defaultValue || ""));

    useEffect(() => {
        if (value !== undefined) setVal(value);
    }, [value]);

    const handleChange = (newVal) => {
        if (onChange) onChange(newVal);
        else setVal(newVal);
    };

    const toggleTag = (tag) => {
        const currentTags = val.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
        if (currentTags.includes(tag)) {
            handleChange(currentTags.filter(t => t !== tag).join(', '));
        } else {
            handleChange([...currentTags, tag].join(', '));
        }
    };

    const currentTagsSet = new Set(val.split(',').map(t => t.trim().toUpperCase()).filter(Boolean));

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

export const EditMangaModal = memo(({ editingManga, onClose, onSubmit, existingGroups = [], existingTags = [], existingArtists = [] }) => {
    if (!editingManga) return null;
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 animate-fade backdrop-blur-md">
            <div className="bg-slate-900/95 w-full max-w-lg rounded-[32px] p-8 border border-theme-600/40 shadow-[0_0_40px_rgba(var(--theme-rgb),0.3)] relative animate-in">
                <h2 className="text-xl font-black mb-8 text-center uppercase text-theme-400" style={{ textShadow: '0 0 10px rgba(var(--theme-rgb),0.8)' }}>Modifier</h2>
                <form onSubmit={onSubmit} className="space-y-5">
                    <input name="title" defaultValue={editingManga.title} required className="w-full bg-black border border-theme-600/40 rounded-2xl px-5 py-4 text-theme-300 font-bold text-base text-center outline-none focus:border-theme-400 focus:shadow-[0_0_20px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)] transition-all" />
                    <ArtistInput existingArtists={existingArtists} value={editingManga.artist || ""} name="artist" inputClass="rounded-2xl px-5 py-4 text-base" />
                    <GroupInput existingGroups={existingGroups} value={editingManga.group || ""} name="group" inputClass="rounded-2xl px-5 py-4 text-base" />
                    <TagInput existingTags={existingTags} name="tags" defaultValue={(editingManga.tags || []).join(', ')} placeholder="Tags (Ex: Shonen, Action...)" className="w-full bg-black border border-theme-600/40 rounded-2xl px-5 py-4 text-theme-300 font-bold text-base text-center outline-none focus:border-theme-400 focus:shadow-[0_0_20px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)] transition-all" />
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 sm:py-5 bg-black text-theme-400 border border-theme-600/40 font-black text-xs rounded-2xl uppercase transition hover:bg-theme-950/30">Annuler</button>
                        <button type="submit" className="flex-1 py-4 sm:py-5 bg-theme-600/20 text-theme-300 border border-theme-500 font-black text-xs rounded-2xl uppercase transition shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)]">Valider</button>
                    </div>
                </form>
            </div>
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
    const handleChange = (e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
    };
    const previewClass = `relative rounded-2xl border border-theme-500 cursor-pointer active:scale-95 transition-all ${height} overflow-hidden shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] block group bg-black`;
    const emptyClass   = `relative bg-black hover:bg-theme-950/30 rounded-2xl border border-theme-600/40 p-4 text-center cursor-pointer active:scale-95 transition-all flex flex-col items-center justify-center ${height} shadow-[inset_0_0_15px_rgba(var(--theme-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.3)] hover:border-theme-400 group`;
    return preview ? (
        <label className={previewClass}>
            <img src={preview} className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl z-10" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-3 px-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <span className="text-[10px] text-white font-black uppercase drop-shadow-[0_0_5px_rgba(0,0,0,1)]">{label}</span>
                <span className="bg-theme-600/80 border border-theme-400 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-md">MODIFIER</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </label>
    ) : (
        <label className={emptyClass}>
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
            let metadata = null; if (zip.file("metadata.json")) { try { metadata = JSON.parse(await zip.file("metadata.json").async("string")); } catch(e) {} }
            const filesMap = {}; 
            const zipEntries = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && !relativePath.includes('__MACOSX') && !relativePath.endsWith('metadata.json')) {
                    zipEntries.push({ relativePath, zipEntry });
                }
            });
            
            for (let i = 0; i < zipEntries.length; i++) {
                if (i % 5 === 0) {
                    setImportProgress(`Extraction fichier ${i+1}/${zipEntries.length}...`);
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
            const mangaId = "m_"+Date.now();
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
            
            const sOrderedPages = [];
            for(let i=0; i<orderedPages.length; i++){
                setImportProgress(`Optimisation page ${i+1}/${orderedPages.length}`);
                const optimizedPage = await optimizeImage(orderedPages[i], 1600, 0.80);
                sOrderedPages.push(await serializeFile(optimizedPage));
            }
            
            const db = await initDB();
            const tx = db.transaction([STORE_MANGAS, STORE_PAGES], "readwrite");
            
            tx.objectStore(STORE_MANGAS).add({
                id: mangaId, title: formTitle || "Sans titre", group: finalGroup, artist: finalArtist, direction: formMangaDir, tags: newTags, 
                coverDouble: sCoverDouble, coverStart: sCoverStart, coverEnd: sCoverEnd, cover: sCover,
                totalPages: orderedPages.length, progress: 0, date: Date.now()
            });
            
            tx.objectStore(STORE_PAGES).add({ id: mangaId, pages: sOrderedPages });
            
            tx.oncomplete = () => { setLoading(false); setImportProgress(null); triggerHaptic(100); onSuccess(); };
        } catch (error) { console.error(error); setLoading(false); setImportProgress(null); showToast("Erreur lors de l'importation.", "error"); }
    };

    const handleDragStart = (e, index) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', index); };
    const handleDragOver = (e, index) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, index) => {
        e.preventDefault(); e.stopPropagation();
        const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(draggedIdx) && draggedIdx !== index) {
            const newPages = [...orderedPages];
            const item = newPages.splice(draggedIdx, 1)[0];
            newPages.splice(index, 0, item);
            setOrderedPages(newPages);
            setSortMethod('custom');
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

    return (
        <>
            <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 animate-fade backdrop-blur-md">
                <form onSubmit={handleAdd} className="bg-slate-900/95 w-full max-w-2xl rounded-[32px] p-6 sm:p-8 border border-theme-600/40 shadow-[0_0_50px_rgba(var(--theme-rgb),0.3)] flex flex-col max-h-[90vh] relative overflow-hidden animate-in">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-theme-600/20 blur-[60px] rounded-full pointer-events-none"></div>
                    <h2 className="text-theme-400 font-black mb-6 uppercase text-center tracking-widest text-base sm:text-lg flex-none relative z-10" style={{ textShadow: '0 0 15px rgba(var(--theme-rgb),0.8)' }}>Nouveau Chapitre</h2>
                    
                    <div className="overflow-y-auto flex-1 pr-2 pb-2 relative z-10 custom-scrollbar">
                        <div className="mb-6 bg-black border border-theme-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[inset_0_0_20px_rgba(var(--theme-rgb),0.1)]">
                            <span className="text-theme-400 font-black text-xs uppercase tracking-widest mb-3" style={{ textShadow: '0 0 8px rgba(var(--theme-rgb),0.5)' }}>Import Rapide ZIP/CBZ</span>
                            <label className="bg-theme-600/20 text-theme-300 border border-theme-500 px-6 py-3 rounded-xl text-xs font-black uppercase cursor-pointer active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.6)] hover:bg-theme-600/40"><IconUpload className="w-5 h-5" /> SÉLECTIONNER UNE ARCHIVE<input type="file" accept=".zip,.cbz" className="hidden" onChange={handleZipImport} /></label>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Titre du chapitre" required className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-4 text-theme-300 font-bold text-sm text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] placeholder-theme-800 transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)]" />
                            <ArtistInput existingArtists={existingArtists} value={formArtist} onChange={setFormArtist} name="artist" inputClass="rounded-xl px-4 py-4 text-sm placeholder-theme-800" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <GroupInput existingGroups={existingGroups} value={formGroup} onChange={setFormGroup} name="group" inputClass="rounded-xl px-4 py-4 text-sm" />
                                <TagInput existingTags={existingTags} value={formTags} onChange={setFormTags} placeholder="Tags (Action, Terminé...)" className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-4 text-theme-300 font-bold text-sm text-center outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] placeholder-theme-800 transition-all [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)]" />
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <select value={formMangaDir} onChange={e => setFormMangaDir(e.target.value)} className="w-full bg-black border border-theme-600/40 rounded-xl px-4 py-4 text-xs text-theme-300 font-black uppercase tracking-widest outline-none focus:border-theme-400 focus:shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)] shadow-[inset_0_0_10px_rgba(var(--theme-rgb),0.1)] transition-all appearance-none text-center [text-shadow:0_0_10px_rgba(var(--theme-rgb),0.8)]">
                                <option value="rtl">Lecture Manga (Droite à Gauche)</option>
                                <option value="ltr">Lecture BD (Gauche à Droite)</option>
                            </select>
                        </div>

                        {/* Jaquette Complète (Wraparound) */}
                        <div className="mb-4">
                            <CoverPicker
                                preview={coverDoublePreview} label="Jaquette Complète (Wraparound)"
                                sublabel="Optionnel - Pour l'effet 3D Parfait" height="h-32"
                                onFile={f => { if (coverDoublePreview) URL.revokeObjectURL(coverDoublePreview); setCoverDoubleFile(f); setCoverDoublePreview(URL.createObjectURL(f)); }}
                            />
                        </div>

                        <div className="flex items-center justify-center gap-4 mb-4 opacity-50">
                            <div className="h-px flex-1 bg-theme-600/50"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-theme-400">OU (Couvertures Simples)</span>
                            <div className="h-px flex-1 bg-theme-600/50"></div>
                        </div>
                        
                        {/* Couvertures Simples Début / Fin */}
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
                            </label>
                            {orderedPages.length > 0 && (<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsManualSorting(true); }} className="absolute top-3 right-3 p-2 bg-theme-600/40 text-theme-100 hover:text-white rounded-xl border border-theme-400 hover:bg-theme-500 transition-all z-20 shadow-[0_0_15px_rgba(var(--theme-rgb),0.6)] active:scale-95" title="Modifier l'ordre"><IconSettings width="20" height="20" /></button>)}
                        </div>
                    </div>
                    
                    <div className="flex gap-4 mt-4 pt-6 border-t border-theme-600/30 flex-none relative z-10">
                        <button type="button" onClick={onClose} className="flex-1 py-4 sm:py-5 text-theme-500 hover:text-theme-300 hover:bg-theme-950/30 font-black uppercase text-[10px] sm:text-xs rounded-2xl transition-all border border-transparent hover:border-theme-600/40">Annuler</button>
                        <button type="submit" disabled={(!coverStartFile && !coverDoubleFile) || orderedPages.length === 0} className={`flex-1 py-4 sm:py-5 rounded-2xl font-black uppercase text-[10px] sm:text-xs transition-all shadow-lg border ${((!coverStartFile && !coverDoubleFile) || orderedPages.length === 0) ? 'bg-black text-theme-800 border-theme-900/30 shadow-none cursor-not-allowed' : 'bg-theme-600 text-white border-theme-400 hover:scale-[1.02] shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] active:scale-95'}`}>Lancer l'import</button>
                    </div>
                </form>
            </div>
            {isManualSorting && (
                <div className="fixed inset-0 z-[400] bg-black/95 p-4 sm:p-8 lg:p-12 flex flex-col animate-fade backdrop-blur-md">
                    <div className="flex justify-between items-center mb-8 border-b border-theme-600/30 pb-6 flex-none animate-in w-full mx-auto md:px-8">
                        <div><h3 className="text-lg sm:text-2xl font-black uppercase text-theme-400 tracking-widest" style={{ textShadow: '0 0 15px rgba(var(--theme-rgb),0.8)' }}>Ordre manuel</h3><p className="text-xs text-theme-300/60 uppercase mt-2 font-bold">Maintenez appuyé pour glisser-déposer</p></div>
                        <button type="button" onClick={() => { setIsManualSorting(false); setSelectedPages(new Set()); }} className="bg-theme-600 text-white border border-theme-400 px-6 py-3 sm:px-8 sm:py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)] hover:shadow-[0_0_30px_rgba(var(--theme-rgb),0.8)] hover:scale-105 active:scale-95">TERMINER</button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20 animate-in w-full mx-auto md:px-8">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 sm:gap-6 lg:gap-8">
                            {orderedPages.map((f, i) => {
                                const isSelected = selectedPages.has(i);
                                return (
                                <div key={f.name} draggable onDragStart={(e) => handleDragStart(e, i)} onDragOver={(e) => handleDragOver(e, i)} onDrop={(e) => handleDrop(e, i)}
                                    className={`relative aspect-[3/4.5] bg-black rounded-xl sm:rounded-2xl overflow-hidden border border-theme-600/40 shadow-[0_0_15px_rgba(var(--theme-rgb),0.2)] hover:shadow-[0_0_25px_rgba(var(--theme-rgb),0.5)] hover:border-theme-400 transition-all cursor-move group select-none touch-none ${isSelected ? 'ring-2 ring-red-500 opacity-80 scale-[0.98]' : ''}`}
                                    style={{ WebkitTouchCallout: 'none' }}
                                >
                                    <div className="absolute inset-0 pointer-events-none"><StackThumbnail file={f} /></div>
                                    <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md text-theme-400 font-black text-[10px] sm:text-xs min-w-[24px] h-[24px] flex items-center justify-center rounded-lg border border-theme-500/50 shadow-[0_0_10px_rgba(var(--theme-rgb),0.4)] z-10 pointer-events-none">{i + 1}</div>
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-8 pointer-events-none z-10"><p className="text-[9px] sm:text-[10px] text-theme-100 font-bold truncate text-center drop-shadow-[0_0_5px_rgba(0,0,0,1)] opacity-70 group-hover:opacity-100">{f.name}</p></div>
                                    
                                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => togglePageSelection(e, i)} className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-20 pointer-events-auto shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isSelected ? 'border-red-500 bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'border-white/50 bg-black/50 text-transparent hover:border-red-400 hover:text-red-400'}`}>
                                        {isSelected ? <IconCheck width="12" height="12" strokeWidth="3" /> : <IconTrash width="12" height="12" />}
                                    </button>

                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleMoveStep(e, i, -1)} disabled={i === 0} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/80 text-white flex items-center justify-center border border-white/20 disabled:opacity-0 active:scale-95 shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-auto"><IconChevronLeft width="16" height="16" /></button>
                                        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleMoveStep(e, i, 1)} disabled={i === orderedPages.length - 1} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/80 text-white flex items-center justify-center border border-white/20 disabled:opacity-0 active:scale-95 shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-auto"><IconChevronRight width="16" height="16" /></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                    {selectedPages.size > 0 && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-red-500/50 shadow-[0_20px_50px_rgba(220,38,38,0.5)] px-6 py-4 rounded-2xl flex items-center gap-6 z-[500] animate-slide-up">
                            <span className="font-black text-white text-sm whitespace-nowrap drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]">{selectedPages.size} sélectionnée(s)</span>
                            <div className="flex items-center gap-3">
                                <button onClick={deleteSelectedPages} className="p-2.5 bg-red-600 text-white rounded-xl hover:scale-105 hover:shadow-[0_0_15px_rgba(220,38,38,0.6)] transition" title="Supprimer les pages sélectionnées"><IconTrash width="20" height="20" /></button>
                                <button onClick={toggleSelectAll} className="px-4 py-2.5 bg-theme-600 text-white hover:bg-theme-500 transition font-black text-xs uppercase tracking-widest rounded-xl border border-theme-400 active:scale-95 shadow-[0_0_15px_rgba(var(--theme-rgb),0.4)]">{selectedPages.size === orderedPages.length ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
                                <div className="w-px h-8 bg-theme-800/80 mx-1"></div>
                                <button onClick={() => setSelectedPages(new Set())} className="px-4 py-2.5 text-theme-400 hover:text-theme-200 transition font-black text-xs uppercase tracking-widest bg-theme-950/50 rounded-xl border border-theme-800/50 active:scale-95">Annuler</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
});