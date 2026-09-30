import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PixelSprite from './PixelSprite';
import { useCardArt, moveSprite } from '@/cardArt';

interface CardProps {
    type: 'rock' | 'paper' | 'scissors' | 'unknown';
    count?: number; // For player's deck count
    onClick?: () => void;
    disabled?: boolean;
    selected?: boolean;
    isOpponent?: boolean; // If true, render as face-down (or face-up if revealed)
    revealed?: boolean;   // If true, show content even if isOpponent
    isWinner?: boolean;   // Highlight winner
    isLoser?: boolean;    // Dim loser
    cardBackUrl?: string; // Optional custom card back image
}

const FACE_COLORS = {
    rock: '#FFCD75',
    paper: '#73EFF7',
    scissors: '#A7F070',
    unknown: '#94B0C2'
};

// Choppy, frame-by-frame motion to match the pixel art
const steps = (n: number) => (t: number) => Math.floor(t * n) / n;

export default function Card({
    type,
    count,
    onClick,
    disabled = false,
    selected = false,
    isOpponent = false,
    revealed = false,
    isWinner = false,
    isLoser = false,
    cardBackUrl
}: CardProps) {
    const { t, i18n } = useTranslation();
    const art = useCardArt();
    const isKo = i18n.language === 'ko';
    const label = type === 'unknown' ? '' : isKo ? t(`game.moves.${type}`) : t(`game.moves.${type}`).toUpperCase();

    // Face Down Look (Card Back)
    if (isOpponent && !revealed) {
        return (
            <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: steps(3) }}
                className={`px-frame w-20 h-28 short:w-16 short:h-24 flex items-center justify-center overflow-hidden ${!cardBackUrl ? 'px-card-back' : ''}`}
            >
                {cardBackUrl ? (
                    <img src={cardBackUrl} alt="Card Back" className="w-full h-full object-cover" />
                ) : (
                    <PixelSprite name="unknown" size={32} className="short:w-6 short:h-[30px]" />
                )}
            </motion.div>
        );
    }

    // Face Up Look (flips in when an opponent card is revealed)
    return (
        <motion.button
            initial={isOpponent ? { rotateY: 90 } : false}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.3, ease: steps(4) }}
            whileHover={!disabled && !isOpponent ? { y: -8, transition: { duration: 0.12, ease: steps(2) } } : {}}
            whileTap={!disabled && !isOpponent ? { y: 2 } : {}}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            style={{ backgroundColor: FACE_COLORS[type] }}
            className={`
                px-frame relative w-24 h-36 short:w-16 short:h-24 flex flex-col items-center justify-center gap-2 short:gap-1 p-2 short:p-1
                ${selected ? 'outline-4 outline-[#FFCD75] outline-offset-8 z-10' : ''}
                ${disabled && !isWinner && !isLoser ? 'opacity-60 grayscale cursor-not-allowed' : ''}
                ${isWinner ? 'outline-4 outline-[#A7F070] outline-offset-8' : ''}
                ${isLoser ? 'opacity-40 grayscale' : ''}
            `}
        >
            <PixelSprite name={type === 'unknown' ? 'unknown' : moveSprite(type, art)} size={56} className="short:w-10 short:h-10" />
            {/* Hangul falls through to Galmuri, which is drawn for 11px */}
            <span className={`font-pixel leading-none text-[#1A1C2C] ${isKo ? 'text-[11px]' : 'text-[8px] short:text-[6px]'}`}>
                {label}
            </span>

            {/* Count Badge (Bottom Right) */}
            {count !== undefined && (
                <span className={`absolute bottom-1 right-1 font-pixel text-[8px] px-1 py-0.5 ${count > 0 ? 'bg-[#1A1C2C] text-[#F4F4F4]' : 'bg-[#B13E53] text-[#F4F4F4]'}`}>
                    x{count}
                </span>
            )}
        </motion.button>
    );
}
