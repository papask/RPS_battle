import { createHash, randomBytes } from 'crypto';
import User, { NICKNAME_COLLATION } from './models/User';

// --- Session tokens -------------------------------------------------------
// The client keeps the raw token; the DB only stores its sha256, so a DB leak doesn't hand out sessions.
// (Unsalted sha256 is fine here: tokens are 256 random bits, not guessable passwords.)

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Resolves a raw token to its user. Accounts from before hashing still hold the plaintext
// token; they are moved to the hash on first use.
export async function findUserByToken(token: unknown) {
    if (typeof token !== 'string' || !token) return null; // never let an object reach the query
    const tokenHash = hashToken(token);
    const user = await User.findOne({ 'auth.tokenHash': tokenHash });
    if (user) return user;

    const legacy = await User.findOne({ 'auth.privateToken': token });
    if (legacy) {
        legacy.auth.tokenHash = tokenHash;
        legacy.auth.privateToken = undefined;
        await legacy.save();
    }
    return legacy;
}

// Resolves `Authorization: Bearer <token>` to the DB user as req.user.
export const requireAuth = async (req: any, res: any, next: any) => {
    try {
        const user = await findUserByToken(req.headers.authorization?.replace(/^Bearer /, ''));
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        next();
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

// --- Nicknames ------------------------------------------------------------
// Keep in sync with rps.client/src/nickname.ts (client shows the same rule while typing).

const NICKNAME_RE = /^[가-힣A-Za-z0-9_]{2,12}$/;
const RESERVED = new Set(['bot', 'admin', 'system']);

export const normalizeNickname = (raw: unknown) => (typeof raw === 'string' ? raw.trim().normalize('NFC') : '');

export type NicknameProblem = 'invalid' | 'reserved' | 'taken' | null;

export async function nicknameProblem(nickname: string): Promise<NicknameProblem> {
    if (!NICKNAME_RE.test(nickname)) return 'invalid';
    if (RESERVED.has(nickname.toLowerCase())) return 'reserved';
    const taken = await User.exists({ 'profile.nickname': nickname }).collation(NICKNAME_COLLATION);
    return taken ? 'taken' : null;
}
