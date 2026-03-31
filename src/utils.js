import QuickLRU from '@alloc/quick-lru';

export const MANGA_PROPS = { faceW: 215, h: 320, spineW: 24 };

export const DB_NAME = "MangaHub_V12";
export const STORE_MANGAS = "mangas";
export const STORE_PAGES = "pages";

export const getSafeStorage = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
export const setSafeStorage = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
export const triggerHaptic = (p = 50) => { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } };

let dbInstance = null;
export const initDB = () => new Promise((res) => {
    if (dbInstance) return res(dbInstance);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_MANGAS)) db.createObjectStore(STORE_MANGAS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORE_PAGES)) db.createObjectStore(STORE_PAGES, { keyPath: "id" });
    };
    req.onsuccess = e => { dbInstance = e.target.result; res(dbInstance); };
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

export const decodeFileToIDB = async (f) => {
    if (!f || !f.data) return f;
    try {
        const res = await fetch(`data:${f.type || 'application/octet-stream'};base64,${f.data}`);
        const buf = await res.arrayBuffer();
        f.data = null;
        return { _isArrayBuffer: true, buffer: buf, type: f.type, name: f.name };
    } catch (e) {
        const bin = atob(f.data);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        f.data = null;
        return { _isArrayBuffer: true, buffer: bytes.buffer, type: f.type, name: f.name };
    }
};

export const serializeFile = async (f) => {
    if (!f) return null;
    if (f instanceof Blob || f instanceof File) {
        try {
            const buffer = await getArrayBuffer(f);
            return { _isArrayBuffer: true, buffer, type: f.type, name: f.name };
        } catch (e) {
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
        } catch (e) {
            console.error("Erreur désérialisation", e);
            return null;
        }
    }
    return f;
};

export const EXT_MIME = { png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export const optimizeImage = (file, maxWidth = 1600, quality = 0.8) => new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return resolve(file);
    if (file.type === 'image/gif') return resolve(file); // Garder l'animation des GIFs

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
            if (!blob) return resolve(file);
            blob.name = file.name ? file.name.replace(/\.[^/.]+$/, ".webp") : "image.webp";
            resolve(blob);
        }, 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
});

export const createImageUrl = (file) => {
    if (!file || !(file instanceof Blob || file instanceof File) || file.size === 0) return null;
    let b = file;
    if (!file.type) {
        const ext = (file.name || '').split('.').pop().toLowerCase();
        b = new Blob([file], { type: EXT_MIME[ext] || 'image/jpeg' });
    }
    return URL.createObjectURL(b);
};

export const globalImageCache = new QuickLRU({
    maxSize: 250, // Conserve les 250 dernières images utilisées en mémoire
    onEviction: (key, value) => {
        URL.revokeObjectURL(value); // Libère la mémoire quand une image est retirée du cache
    }
});

export const getFileKey = (file) => {
    if (!file) return null;
    if (typeof file === 'string') return file;
    const name = file.name || 'unnamed';
    const size = file.buffer ? file.buffer.byteLength : (file.size || 0);
    return `${name}_${size}`;
};

export const getCachedUrl = (file) => {
    if (!file) return null;
    const key = getFileKey(file);
    if (!key) return null;

    if (globalImageCache.has(key)) {
        return globalImageCache.get(key); // .get() marque aussi l'élément comme récemment utilisé
    }

    const blob = deserializeFile(file);
    if (!blob) return null;
    const url = createImageUrl(blob);
    if (url) globalImageCache.set(key, url); // .set() ajoute le nouvel élément
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
    birch: {
        name: "Bouleau",
        bookend: { background: 'linear-gradient(to right, #eaddc5, #c2b294)', borderLeftColor: '#fff8eb', borderTopColor: '#fff8eb' },
        board: { background: 'linear-gradient(to bottom, #d4c5ab, #a8987a)', borderTopColor: '#f5ead5' },
        text: 'text-[#4a3b2c]',
        textShadow: '1px 1px 0px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.2)',
        texture: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==")] mix-blend-overlay opacity-40'
    },
    metal: {
        name: "Acier Brossé",
        bookend: { background: 'linear-gradient(to right, #64748b, #334155)', borderLeftColor: '#f8fafc', borderTopColor: '#f8fafc' },
        board: { background: 'linear-gradient(to bottom, #475569, #1e293b)', borderTopColor: '#f8fafc' },
        text: 'text-[#f1f5f9]',
        textShadow: '0 0 10px rgba(255,255,255,0.4), 1px 1px 2px #000',
        texture: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==")] mix-blend-overlay opacity-40'
    },
    glass: {
        name: "Verre Dépoli",
        bookend: { background: 'linear-gradient(to right, rgba(255,255,255,0.3), rgba(56,189,248,0.05))', borderLeftColor: '#ffffff', borderTopColor: '#ffffff', backdropFilter: 'blur(16px)' },
        board: { background: 'linear-gradient(to bottom, rgba(56,189,248,0.2), rgba(255,255,255,0.02))', borderTopColor: '#ffffff', backdropFilter: 'blur(20px)' },
        text: 'text-[#e0f2fe]',
        textShadow: '0 0 15px rgba(56,189,248,0.9), 0 2px 5px rgba(0,0,0,0.9)',
        texture: 'bg-gradient-to-b from-white/10 to-transparent'
    }
};

export const SHELF_ENGRAVINGS = {
    none: {
        name: "Aucune",
        style: {}
    },
    vines: {
        name: "Arabesque",
        style: {
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50' viewBox='0 0 100 50'%3E%3Cpath d='M0 25 C 25 0, 25 50, 50 25 S 75 0, 100 25' stroke='%23000' stroke-width='4' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '50px',
            opacity: 0.35,
            mixBlendMode: 'multiply'
        }
    },
    scales: {
        name: "Écailles",
        style: {
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M0,10 a10,10 0 0,0 20,0 M10,20 a10,10 0 0,0 20,0 M-10,20 a10,10 0 0,0 20,0' stroke='%23000' stroke-width='2' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px',
            opacity: 0.40,
            mixBlendMode: 'multiply'
        }
    },
    diamonds: {
        name: "Losanges",
        style: {
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M10,0 L20,10 L10,20 L0,10 Z' stroke='%23000' stroke-width='2' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '20px 20px',
            opacity: 0.40,
            mixBlendMode: 'multiply'
        }
    }
};