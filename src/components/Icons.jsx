import React from 'react';

// Fonction utilitaire pour générer les icônes
const mkIcon = (w, h, sw, extra, children) => (props) => {
    const { className, style, title, onClick, width, height } = props || {};
    return <svg viewBox="0 0 24 24" width={width||w} height={height||h} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} title={title} onClick={onClick} {...extra}>{children}</svg>;
};

// Export de toutes tes icônes
export const IconTrash        = mkIcon(18,18,2.5,{},<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>);
export const IconSettings     = mkIcon(18,18,2.5,{},<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>);
export const IconSearch       = mkIcon(18,18,3,{},<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>);
export const IconChevronLeft  = mkIcon(20,20,3,{},<polyline points="15 18 9 12 15 6"/>);
export const IconChevronRight = mkIcon(20,20,3,{},<polyline points="9 18 15 12 9 6"/>);
export const IconUpload       = mkIcon(20,20,2.5,{},<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>);
export const IconLibrary      = mkIcon(18,18,2.5,{},<><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>);
export const IconBookPlus     = mkIcon(18,18,2.5,{},<><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></>);
export const IconBookmarkOutline = mkIcon(20,20,2.5,{},<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>);
export const IconBookmarkFilled  = mkIcon(20,20,2.5,{fill:'currentColor'},<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2 2h10a2 2 0 0 1 2 2z"/>);
export const IconMoon         = mkIcon(20,20,2.5,{},<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>);
export const IconSun          = mkIcon(20,20,2.5,{},<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>);
export const IconSinglePage   = mkIcon(20,20,2.5,{},<rect x="6" y="3" width="12" height="18" rx="2" ry="2"/>);
export const IconDoublePage   = mkIcon(20,20,2.5,{},<><path d="M2 3h8v18H2z"/><path d="M14 3h8v18h-8z"/></>);
export const IconFloppyUp     = mkIcon(18,18,2.5,{},<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M12 17v-7"/><polyline points="9 13 12 10 15 13"/></>);
export const IconFloppyDown   = mkIcon(18,18,2.5,{},<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M12 10v7"/><polyline points="9 14 12 17 15 14"/></>);
export const IconMoreVertical = mkIcon(20,20,2.5,{},<><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>);
export const IconPlay         = mkIcon(24,24,2,{fill:'currentColor'},<polygon points="5 3 19 12 5 21 5 3"/>);
export const IconMaximize     = mkIcon(20,20,2.5,{},<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>);
export const IconMinimize     = mkIcon(20,20,2.5,{},<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>);
export const IconCheck        = mkIcon(24,24,2.5,{},<polyline points="20 6 9 17 4 12"/>);
export const IconCheckSquare  = mkIcon(24,24,2.5,{},<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>);
export const IconFilter       = mkIcon(24,24,2.5,{},<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>);
export const IconReverse      = mkIcon(24,24,2.5,{},<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></>);
export const IconFlag         = mkIcon(20,20,2.5,{},<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>);
export const IconAward        = mkIcon(20,20,2.5,{},<><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>);