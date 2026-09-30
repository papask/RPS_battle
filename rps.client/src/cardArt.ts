import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { SpriteName } from './components/game/PixelSprite';

// How rock/paper/scissors are drawn on *this* device: cartoon-glove hands or objects.
// Not a skin: skins only change the card back and are seen by the opponent.
export type CardArt = 'glove' | 'object';

const STORAGE_KEY = 'rps_card_art';
const CHANGE_EVENT = 'rps-card-art';

const readSaved = (): CardArt | null => {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'glove' || v === 'object' ? v : null;
    } catch {
        return null;
    }
};

const subscribe = (onChange: () => void) => {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange); // other tabs
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
};

export const setCardArt = (art: CardArt) => {
    try { localStorage.setItem(STORAGE_KEY, art); } catch { }
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

// Explicit choice wins; otherwise Korean shows hands (가위바위보 is played with hands), others show objects.
export function useCardArt(): CardArt {
    const { i18n } = useTranslation();
    const saved = useSyncExternalStore(subscribe, readSaved, () => null);
    return saved ?? (i18n.language === 'ko' ? 'glove' : 'object');
}

const GLOVES = { rock: 'gloveRock', paper: 'glovePaper', scissors: 'gloveScissors' } as const;

export const moveSprite = (move: 'rock' | 'paper' | 'scissors', art: CardArt): SpriteName =>
    art === 'glove' ? GLOVES[move] : move;
