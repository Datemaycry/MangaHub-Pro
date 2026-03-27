import React, { memo } from 'react';
import { IconSettings, IconFloppyDown, IconTrash } from './Icons';

export const ToastNotification = memo(({ toast }) => {
    if (!toast) return null;
    return (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase shadow-2xl animate-slide-up border backdrop-blur-xl whitespace-nowrap
            ${toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500 shadow-[0_15px_40px_rgba(16,185,129,0.4)]' : 
              toast.type === 'error' ? 'bg-red-950/90 text-red-400 border-red-500 shadow-[0_15px_40px_rgba(220,38,38,0.4)]' : 
              'bg-theme-950/90 text-theme-300 border-theme-500 shadow-[0_15px_40px_rgba(var(--theme-rgb),0.4)]'}`}
        >
            {toast.msg}
        </div>
    );
});

export const LoadingOverlay = memo(({ loading, importProgress }) => {
    if (!loading) return null;
    return (
        <div className="fixed inset-0 z-[700] flex flex-col items-center justify-center bg-black/95 animate-fade backdrop-blur-sm">
            <div className="relative"><div className="absolute inset-0 bg-theme-500/40 blur-[30px] rounded-full"></div><div className="w-20 h-20 border-4 border-theme-500 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_15px_rgba(var(--theme-rgb),0.8)] relative z-10"></div></div>
            <p className="mt-8 text-xs font-black text-theme-300 uppercase tracking-widest" style={{ textShadow: '0 0 15px rgba(var(--theme-rgb),0.8)' }}>{importProgress ? `Traitement... ${importProgress}` : 'Optimisation...'}</p>
        </div>
    );
});

export const ConfirmModal = memo(({ isOpen, onConfirm, onCancel, title = "Confirmer ?" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 animate-fade backdrop-blur-md">
            <div className="bg-slate-900/95 rounded-[32px] p-8 md:p-10 border border-red-600/40 shadow-[0_0_40px_rgba(220,38,38,0.3)] max-w-sm w-full text-center animate-in">
                <h3 className="text-xl font-black text-red-400 mb-6 uppercase tracking-widest" style={{ textShadow: '0 0 15px rgba(220,38,38,0.8)' }}>{title}</h3>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 sm:py-5 bg-black text-theme-400 border border-theme-600/40 font-black text-xs rounded-2xl uppercase transition hover:bg-theme-950/30">NON</button>
                    <button onClick={onConfirm} className="flex-1 py-4 sm:py-5 bg-red-950/40 text-red-400 border border-red-600/50 font-black text-xs rounded-2xl uppercase transition shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.7)] hover:bg-red-900/50">OUI</button>
                </div>
            </div>
        </div>
    );
});

export const MangaActionsModal = memo(({ activeCardMenu, onClose, onEdit, onExport, onDelete }) => {
    if (!activeCardMenu) return null;
    return (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 transition-all animate-fade backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 border border-theme-600/40 shadow-[0_-10px_40px_rgba(var(--theme-rgb),0.3)] animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-1.5 bg-theme-600/50 rounded-full mx-auto mb-8 sm:hidden"></div>
                <h3 className="text-center font-black text-white text-xl mb-2 truncate px-4">{activeCardMenu.title}</h3>
                <div className="text-center text-[10px] sm:text-xs text-theme-400 uppercase tracking-widest mb-8 border-b border-theme-600/30 pb-4">Actions du Manga</div>

                <div className="flex flex-col gap-4">
                    <button onClick={() => onEdit(activeCardMenu)} className="w-full py-4 sm:py-5 bg-black text-white rounded-2xl flex items-center justify-center gap-3 border border-theme-600/40 hover:bg-theme-900/50 hover:border-theme-400 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] transition-all font-bold text-sm sm:text-base">
                        <IconSettings width="20" height="20" className="text-theme-400" /> Modifier les informations
                    </button>
                    <div className="flex gap-4">
                        <button onClick={(e) => onExport(activeCardMenu, 'zip', e)} className="flex-1 py-4 sm:py-5 bg-emerald-950/40 text-emerald-100 rounded-2xl flex items-center justify-center gap-2 border border-emerald-600/50 hover:bg-emerald-900/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all font-bold text-sm sm:text-base">
                            <IconFloppyDown width="18" height="18" /> Exporter ZIP
                        </button>
                        <button onClick={(e) => onExport(activeCardMenu, 'cbz', e)} className="flex-1 py-4 sm:py-5 bg-theme-950/40 text-theme-100 rounded-2xl flex items-center justify-center gap-2 border border-theme-600/50 hover:bg-theme-900/60 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)] transition-all font-bold text-sm sm:text-base">
                            <IconFloppyDown width="18" height="18" /> Exporter CBZ
                        </button>
                    </div>
                    <button onClick={() => onDelete(activeCardMenu.id)} className="w-full py-4 sm:py-5 mt-2 bg-red-950/40 text-red-500 rounded-2xl flex items-center justify-center gap-3 border border-red-900/50 hover:bg-red-900/60 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all font-bold text-sm sm:text-base">
                        <IconTrash width="20" height="20" /> Supprimer ce manga
                    </button>
                </div>
            </div>
        </div>
    );
});