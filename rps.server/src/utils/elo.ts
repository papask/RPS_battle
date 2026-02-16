
interface EloResult {
    newRating: number;
    ratingChange: number;
}

interface EloParams {
    currentRating: number;
    opponentRating: number;
    actualScore: number; // 1 for win, 0 for loss, 0.5 for draw (though draw is instant replay in this game, but good to have)
    kFactorModifier?: number; // e.g. 1.2 for 2:0 win
}

export const TIERS = {
    BRONZE: 0,
    SILVER: 1200,
    GOLD: 1500,
    PLATINUM: 1800,
    DIAMOND: 2100,
    MASTER: 2400
};

export const calculateElo = (
    currentRating: number,
    opponentRating: number,
    actualScore: number,
    isCleanSweep: boolean = false // 2:0 win
): EloResult => {
    // 1. Determine Base K-Factor
    let kFactor = 64;
    // Lower K for high tiers to prevent rapid fluctuation
    if (currentRating >= TIERS.DIAMOND) {
        kFactor = 20;
    }

    // 2. Apply Victory Margin Bonus (only affects winner/loser symmetry? Spec implies K changes for the calculation)
    // "2:0 Perfect Win: K-Factor * 1.2"
    if (isCleanSweep) {
        kFactor *= 1.2;
    }

    // 3. Calculate Expected Score
    // Ea = 1 / (1 + 10 ^ ((Rb - Ra) / 400))
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));

    // 4. Calculate New Rating
    // Ra' = Ra + K * (Sa - Ea)
    const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
    const newRating = Math.max(0, currentRating + ratingChange); // Prevent negative ELO

    return {
        newRating,
        ratingChange
    };
};


export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

export const getTier = (elo: number): { tier: Tier, division: number } => {
    if (elo >= TIERS.MASTER) return { tier: 'Master', division: 1 };
    if (elo >= TIERS.DIAMOND) return { tier: 'Diamond', division: calculateDivision(elo, TIERS.DIAMOND) };
    if (elo >= TIERS.PLATINUM) return { tier: 'Platinum', division: calculateDivision(elo, TIERS.PLATINUM) };
    if (elo >= TIERS.GOLD) return { tier: 'Gold', division: calculateDivision(elo, TIERS.GOLD) };
    if (elo >= TIERS.SILVER) return { tier: 'Silver', division: calculateDivision(elo, TIERS.SILVER) };
    return { tier: 'Bronze', division: calculateDivision(elo, TIERS.BRONZE) };
};

// Start of tier + 0-99 -> IV, 100-199 -> III, etc. (Approximate for now)
// Actually standard is usually 100 point steps per division if interval is 300-400?
// Let's assume 300 points per tier (e.g. Silver 1200-1500). 
// 1200-1275: IV, 1275-1350: III, 1350-1425: II, 1425-1500: I
const calculateDivision = (elo: number, base: number): number => {
    const diff = elo - base;
    const tierSpan = 300; // Average span
    const divSpan = tierSpan / 4; // 75 points per division

    if (diff < divSpan) return 4;
    if (diff < divSpan * 2) return 3;
    if (diff < divSpan * 3) return 2;
    return 1;
};
