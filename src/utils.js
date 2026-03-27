export const MANGA_PROPS = { faceW: 215, h: 320, spineW: 24 };

export const DB_NAME = "MangaHub_V12";
export const STORE_MANGAS = "mangas";
export const STORE_PAGES = "pages";

export const getSafeStorage = (k, d) => { try { return localStorage.getItem(k) || d; } catch(e) { return d; } };
export const setSafeStorage = (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} };
export const triggerHaptic = (p = 50) => { if (navigator.vibrate) try { navigator.vibrate(p); } catch(e) {} };

export const initDB = () => new Promise((res) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_MANGAS)) db.createObjectStore(STORE_MANGAS, {keyPath: "id"});
        if (!db.objectStoreNames.contains(STORE_PAGES)) db.createObjectStore(STORE_PAGES, {keyPath: "id"});
    };
    req.onsuccess = e => res(e.target.result);
});

export const blobToBase64Async = (blob) => new Promise((resolve) => {
    if (!blob) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
});

const getArrayBuffer = (blob) => new Promise((resolve, reject) => {
    if (blob.arrayBuffer) { blob.arrayBuffer().then(resolve).catch(reject); return; }
    const r = new FileReader();
    r.onload = () => resolve(r.result); r.onerror = reject; r.readAsArrayBuffer(blob);
});

export const decodeFileToIDB = (f) => {
    if (!f || !f.data) return f;
    const bin = atob(f.data);
    const buf = new ArrayBuffer(bin.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
    f.data = null;
    return { _isArrayBuffer: true, buffer: buf, type: f.type, name: f.name };
};

export const serializeFile = async (f) => {
    if (!f) return null;
    if (f instanceof Blob || f instanceof File) {
        try {
            const buffer = await getArrayBuffer(f);
            return { _isArrayBuffer: true, buffer, type: f.type, name: f.name };
        } catch(e) {
            console.error("Erreur sérialisation", e);
            return null;
        }
    }
    return f;
};

export const deserializeFile = (f) => {
    if (!f) return null;
    if (f._isArrayBuffer && f.buffer) {
        try {
            const blob = new Blob([f.buffer], { type: f.type || 'image/jpeg' });
            blob.name = f.name;
            return blob;
        } catch(e) {
            console.error("Erreur désérialisation", e);
            return null;
        }
    }
    return f; 
};

export const EXT_MIME = { png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export const createImageUrl = (file) => {
    if (!file || !(file instanceof Blob || file instanceof File) || file.size === 0) return null;
    let b = file;
    if (!file.type) {
        const ext = (file.name || '').split('.').pop().toLowerCase();
        b = new Blob([file], { type: EXT_MIME[ext] || 'image/jpeg' });
    }
    return URL.createObjectURL(b);
};

export const globalImageCache = new Map();

export const clearImageCache = () => {
    globalImageCache.forEach(url => URL.revokeObjectURL(url));
    globalImageCache.clear();
};

export const getCachedUrl = (file) => {
    if (!file) return null;
    if (globalImageCache.has(file)) return globalImageCache.get(file);
    const blob = deserializeFile(file);
    if (!blob) return null;
    const url = createImageUrl(blob);
    if (url) globalImageCache.set(file, url);
    return url;
};

export const SHELF_THEMES = {
    mahogany: {
        name: "Acajou",
        bookend: { background: 'linear-gradient(to right, #4a1d15, #2a0f0a)', borderLeftColor: '#7a3122', borderTopColor: '#7a3122' },
        board: { background: 'linear-gradient(to bottom, #5c2419, #210c08)', borderTopColor: '#8a3c2b' },
        text: 'text-[#e8b688]',
        textShadow: '1px 1px 0px rgba(255,255,255,0.15), -1px -1px 0px rgba(0,0,0,0.8)',
        texture: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==")] mix-blend-overlay opacity-20'
    },
    oak: {
        name: "Chêne",
        bookend: { background: 'linear-gradient(to right, #d4a373, #92400e)', borderLeftColor: '#fef08a', borderTopColor: '#fef08a' },
        board: { background: 'linear-gradient(to bottom, #ca8a04, #713f12)', borderTopColor: '#fde047' },
        text: 'text-[#422006]',
        textShadow: '1px 1px 0px rgba(255,255,255,0.4)',
        texture: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==")] mix-blend-overlay opacity-30'
    },
    metal: {
        name: "Métal",
        bookend: { background: 'linear-gradient(to right, #475569, #1e293b)', borderLeftColor: '#94a3b8', borderTopColor: '#94a3b8' },
        board: { background: 'linear-gradient(to bottom, #334155, #0f172a)', borderTopColor: '#94a3b8' },
        text: 'text-[#f8fafc]',
        textShadow: '0 0 10px rgba(255,255,255,0.4), 1px 1px 2px #000',
        texture: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==")] opacity-50'
    },
    glass: {
        name: "Verre",
        bookend: { background: 'linear-gradient(to right, rgba(255,255,255,0.15), rgba(255,255,255,0.02))', borderLeftColor: 'rgba(255,255,255,0.3)', borderTopColor: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)' },
        board: { background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', borderTopColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)' },
        text: 'text-white',
        textShadow: '0 0 15px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.8)',
        texture: ''
    }
};