import express from 'express';
import User from '../models/User';

const router = express.Router();

// Use Item
router.post('/use', async (req: any, res: any) => {
    try {
        const { userId, itemId } = req.body;

        if (!userId || !itemId) {
            return res.status(400).json({ error: 'Missing userId or itemId' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const inventoryItem = user.inventory.find((i: any) => i.itemId === itemId);

        if (!inventoryItem || inventoryItem.count <= 0) {
            return res.status(400).json({ error: 'Item not in inventory' });
        }

        // Logic for specific items

        // Shield
        if (itemId === 'item_shield') {
            const now = new Date();

            // Check Cooldown
            if (user.cooldowns?.shield) {
                const lastUsed = new Date(user.cooldowns.shield);
                const diff = now.getTime() - lastUsed.getTime();
                const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
                if (diff < COOLDOWN) {
                    return res.status(400).json({ error: 'Shield is on cooldown (1 per day)' });
                }
            }

            // Check if already active
            if (user.activeEffects && user.activeEffects.includes('shield')) {
                return res.status(400).json({ error: 'Shield is already active' });
            }

            // Activate Shield
            if (!user.activeEffects) user.activeEffects = [];
            user.activeEffects.push('shield');

            // Update Cooldown
            if (!user.cooldowns) user.cooldowns = {};
            user.cooldowns.shield = now;

            // Decrement Inventory
            inventoryItem.count -= 1;
            if (inventoryItem.count <= 0) {
                user.inventory = user.inventory.filter((i: any) => i.itemId !== itemId);
            }

            await user.save();

            // ---------------------------------------------------------
            // REAL-TIME UPDATE: Notify Client via Socket
            // ---------------------------------------------------------
            if (req.roomManager && req.io) {
                const roomManager = req.roomManager;
                const memoryUser = roomManager.findUserByDbId(user._id.toString());

                if (memoryUser) {
                    // Update memory state
                    memoryUser.inventory = user.inventory;
                    memoryUser.activeEffects = user.activeEffects;
                    memoryUser.cooldowns = user.cooldowns;

                    // Emit update
                    req.io.to(memoryUser.id).emit('user_updated', memoryUser);
                }
            }
            // ---------------------------------------------------------

            return res.json({
                success: true,
                activeEffects: user.activeEffects,
                inventory: user.inventory
            });
        }

        // Hint logic handled via Socket.
        if (itemId === 'item_hint') {
            return res.status(400).json({ error: 'Hints are used in-game via socket' });
        }

        res.json({ success: true });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
