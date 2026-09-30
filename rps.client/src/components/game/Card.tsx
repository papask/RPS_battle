import { motion } from 'framer-motion';
import PixelSprite from './PixelSprite';

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

const LABELS = {
    rock: 'ROCK',
    paper: 'PAPER',
    scissors: 'SCISSORS',
    unknown: ''
};

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

    // Face Down Look (Card Back)
    if (isOpponent && !revealed) {
        return (
            <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: steps(3) }}
                className={`px-frame w-20 h-28 flex items-center justify-center overflow-hidden ${!cardBackUrl ? 'px-card-back' : ''}`}
            >
                {cardBackUrl ? (
                    <img src={cardBackUrl} alt="Card Back" className="w-full h-full object-cover" />
                ) : (
                    <PixelSprite name="unknown" size={32} />
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
            aria-label={LABELS[type]}
            style={{ backgroundColor: FACE_COLORS[type] }}
            className={`
                px-frame relative w-24 h-36 flex flex-col items-center justify-center gap-2 p-2
                ${selected ? 'outline-4 outline-[#FFCD75] outline-offset-8 z-10' : ''}
                ${disabled && !isWinner && !isLoser ? 'opacity-60 grayscale cursor-not-allowed' : ''}
                ${isWinner ? 'outline-4 outline-[#A7F070] outline-offset-8' : ''}
                ${isLoser ? 'opacity-40 grayscale' : ''}
            `}
        >
            <PixelSprite name={type} size={56} />
            <span className="font-pixel text-[8px] leading-none text-[#1A1C2C]">
                {LABELS[type]}
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
