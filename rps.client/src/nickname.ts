// Same rule as rps.server/src/auth.ts (keep in sync; the server has the final say).
export const NICKNAME_RE = /^[가-힣A-Za-z0-9_]{2,12}$/;

export const normalizeNickname = (raw: string) => raw.trim().normalize('NFC');

// idle: nothing typed · checking: asking the server · ok: available · others: why not
export type NicknameStatus = 'idle' | 'checking' | 'ok' | 'invalid' | 'reserved' | 'taken';
