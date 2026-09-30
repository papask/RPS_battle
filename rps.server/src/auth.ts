import User from './models/User';

// Resolves `Authorization: Bearer <privateToken>` to the DB user as req.user.
export const requireAuth = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    // typeof guard: an empty/non-string token must never reach the query
    if (typeof token !== 'string' || !token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const user = await User.findOne({ 'auth.privateToken': token });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        next();
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
