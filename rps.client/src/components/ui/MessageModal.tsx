'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface MessageModalProps {
    message: string | null; // null = closed
    title?: string;
    onClose: () => void;
    // Confirm mode (window.confirm replacement): shows Cancel + a red confirm button
    onConfirm?: () => void;
    confirmLabel?: string;
}

// In-app replacement for window.alert()/confirm(): overlay + card, closes on OK/Cancel, Esc or backdrop click.
export default function MessageModal({ message, title, onClose, onConfirm, confirmLabel }: MessageModalProps) {
    const { t } = useTranslation();
    const okRef = useRef<HTMLButtonElement>(null); // alert: OK, confirm: Cancel (the safe choice gets focus)
    // Rendered into <body>: inside a transformed parent (e.g. the game room's header drawer)
    // `position: fixed` would be relative to that parent instead of the screen
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!message) return;
        okRef.current?.focus();
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [message, onClose]);

    if (!mounted) return null;
    return createPortal(
        <AnimatePresence>
            {message && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="message-modal-title"
                        aria-describedby="message-modal-body"
                        className="w-full max-w-xs bg-white rounded-[2rem] border-4 border-white shadow-2xl p-6 text-center"
                        initial={{ scale: 0.85, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.85, y: 20 }}
                        transition={{ type: 'spring', bounce: 0.4, duration: 0.35 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="message-modal-title" className="text-xl font-black text-[#FF6B6B] mb-2">
                            {title ?? t('common.notice')}
                        </h2>
                        <p id="message-modal-body" className="text-gray-600 font-bold mb-6 break-keep">
                            {message}
                        </p>
                        {onConfirm ? (
                            <div className="flex gap-3">
                                <button
                                    ref={okRef}
                                    onClick={onClose}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-black text-lg border-b-4 border-gray-300 active:translate-y-1 active:border-b-0 focus-visible:outline-4 focus-visible:outline-[#2B2D42] focus-visible:outline-offset-2"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 bg-[#E0445A] hover:bg-[#c93a4e] text-white py-3 rounded-xl font-black text-lg border-b-4 border-red-800 active:translate-y-1 active:border-b-0 focus-visible:outline-4 focus-visible:outline-[#2B2D42] focus-visible:outline-offset-2"
                                >
                                    {confirmLabel ?? t('common.ok')}
                                </button>
                            </div>
                        ) : (
                            <button
                                ref={okRef}
                                onClick={onClose}
                                className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white py-3 rounded-xl font-black text-lg border-b-4 border-red-700 active:translate-y-1 active:border-b-0 focus-visible:outline-4 focus-visible:outline-[#2B2D42] focus-visible:outline-offset-2"
                            >
                                {t('common.ok')}
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
