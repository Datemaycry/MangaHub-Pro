import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { MANGA_PROPS } from './utils';

export const use3DBook = ({
    manga,
    onRead,
    onClose,
    startClosing,
    uiRef,
    bookContainerRef,
    rotatingBookRef
}) => {
    const isRTL = manga?.direction === 'rtl';
    const spineIsRight = isRTL;

    // --- State ---
    const [rotY, setRotY] = useState(() => startClosing ? (isRTL ? 25 : -25) : (isRTL ? -90 : 90));
    const [rotX, setRotX] = useState(() => startClosing ? 5 : 0);
    const [isDragging, setIsDragging] = useState(false);
    const [autoSpin, setAutoSpin] = useState(!startClosing);
    const [spinDirection, setSpinDirection] = useState(isRTL ? -1 : 1);
    const [isOpening, setIsOpening] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // --- Refs ---
    const dragInfo = useRef({ startX: 0, startY: 0, initRotY: 0, initRotX: 0, hasDragged: false });
    const spinTimeoutRef = useRef(null);
    const isFirstMount = useRef(true);

    // --- Effects ---

    // Reset state on manga change
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        setRotY(isRTL ? -15 : 15);
        setRotX(0);
        setIsOpening(false);
        setAutoSpin(true);
    }, [manga?.id, isRTL]);

    // Auto-spin animation
    useEffect(() => {
        if (!autoSpin || !rotatingBookRef.current) return;

        let animationFrameId;
        let lastTime = performance.now();
        const speedPerMs = (360 / 16000) * spinDirection;

        const animate = (time) => {
            if (!rotatingBookRef.current) return;
            const delta = time - lastTime;
            lastTime = time;
            const newRotY = (parseFloat(rotatingBookRef.current.dataset.rotY || '0') + (delta * speedPerMs));
            rotatingBookRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${newRotY}deg)`;
            rotatingBookRef.current.dataset.rotY = newRotY;
            animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [autoSpin, spinDirection, rotX, rotatingBookRef]);

    // Nouvelle animation d'entrée : Glissement depuis le bas
    useLayoutEffect(() => {
        if (startClosing || !bookContainerRef.current || !uiRef.current) return;

        // État initial de l'animation
        bookContainerRef.current.style.transition = 'none';
        bookContainerRef.current.style.opacity = '0';
        bookContainerRef.current.style.transform = 'translateY(100px)';
        uiRef.current.style.transition = 'none';
        uiRef.current.style.opacity = '0';

        void bookContainerRef.current.offsetHeight;

        requestAnimationFrame(() => {
            if (!bookContainerRef.current || !uiRef.current) return;
            bookContainerRef.current.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out';
            bookContainerRef.current.style.opacity = '1';
            bookContainerRef.current.style.transform = 'translateY(0)';

            uiRef.current.style.transition = 'opacity 0.4s ease 0.2s';
            uiRef.current.style.opacity = '1';

            setRotY(isRTL ? -15 : 15);
        });
    }, [startClosing, isRTL, bookContainerRef, uiRef]);


    // --- Callbacks ---

    const onPointerDown = useCallback((e) => {
        setAutoSpin(false);
        if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
        setIsDragging(true);
        const currentRotY = parseFloat(rotatingBookRef.current?.dataset.rotY || rotY);
        const currentRotX = parseFloat(rotatingBookRef.current?.dataset.rotX || rotX);
        dragInfo.current = { startX: e.clientX, startY: e.clientY, initRotY: currentRotY, initRotX: currentRotX, hasDragged: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [rotY, rotX, rotatingBookRef]);

    const onPointerMove = useCallback((e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragInfo.current.startX;
        const deltaY = e.clientY - dragInfo.current.startY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) dragInfo.current.hasDragged = true;

        const newRotY = dragInfo.current.initRotY + deltaX * 0.6;
        const newRotX = Math.max(-60, Math.min(60, dragInfo.current.initRotX - deltaY * 0.6));

        if (rotatingBookRef.current) {
            rotatingBookRef.current.style.transform = `rotateX(${newRotX}deg) rotateY(${newRotY}deg)`;
            rotatingBookRef.current.dataset.rotY = newRotY;
            rotatingBookRef.current.dataset.rotX = newRotX;
        }
    }, [isDragging, rotatingBookRef]);

    const onPointerUp = useCallback((e) => {
        setIsDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        if (rotatingBookRef.current) {
            setRotY(parseFloat(rotatingBookRef.current.dataset.rotY || '0'));
            setRotX(parseFloat(rotatingBookRef.current.dataset.rotX || '0'));
        }
        if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = setTimeout(() => setAutoSpin(true), 1500);
    }, [isDragging, rotatingBookRef]);

    const handleReadClick = useCallback((e) => {
        if (e) e.stopPropagation();
        if (dragInfo.current?.hasDragged) { dragInfo.current.hasDragged = false; return; }
        if (isOpening) return;

        setAutoSpin(false);
        setRotX(5);
        setRotY(spineIsRight ? 25 : -25);
        setIsOpening(true);

        if (uiRef.current) {
            uiRef.current.style.transition = 'opacity 0.2s ease-out';
            uiRef.current.style.opacity = '0';
            uiRef.current.style.pointerEvents = 'none';
        }

        if (typeof window.triggerHaptic === 'function') window.triggerHaptic(50);

        setTimeout(() => {
            onRead(manga, null, true);
        }, 800);
    }, [dragInfo, isOpening, spineIsRight, onRead, uiRef, manga]);

    const handleClose = useCallback((e) => {
        if (e) e.stopPropagation();
        if (isClosing) return;

        setIsClosing(true);
        setAutoSpin(false);
        setRotX(0);

        // Animation de sortie : Glissement vers le bas
        if (bookContainerRef.current && uiRef.current) {
            uiRef.current.style.transition = 'opacity 0.2s ease';
            uiRef.current.style.opacity = '0';

            bookContainerRef.current.style.transition = 'opacity 0.3s ease, transform 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
            bookContainerRef.current.style.opacity = '0';
            bookContainerRef.current.style.transform = 'translateY(100px)';
        }

        setTimeout(() => {
            onClose();
        }, 500);
    }, [isClosing, onClose, bookContainerRef, uiRef]);

    // Trigger closing animation
    useEffect(() => {
        if (startClosing) {
            const timer = setTimeout(() => {
                requestAnimationFrame(() => {
                    handleClose();
                });
            }, 50);
            return () => cancelAnimationFrame(timer);
        }
    }, [startClosing, handleClose]);

    // --- Return values ---
    return {
        rotY,
        rotX,
        isOpening,
        isClosing,
        isDragging,
        spinDirection,
        setSpinDirection,
        setAutoSpin,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        handleReadClick,
        handleClose,
    };
};