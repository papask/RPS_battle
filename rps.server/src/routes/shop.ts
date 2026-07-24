import express from 'express';
import User from '../models/User';
import Item from '../models/Item';

const router = express.Router();

// Get Shop Items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find({});
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Buy Item
router.post('/buy', async (req: any, res: any) => {
    try {
        const { userId, itemId } = req.body;

        if (!userId || !itemId) {
            return res.status(400).json({ error: 'Missing userId or itemId' });
        }

        const user = await User.findById(userId);
        const item = await Item.findOne({ id: itemId });

        if (!user || !item) {
            return res.status(404).json({ error: 'User or Item not found' });
        }

        if (user.assets.tokens < item.cost) {
            return res.status(400).json({ error: 'Not enough tokens' });
        }

        // Deduct Tokens
        user.assets.tokens -= item.cost;

        // Add to Inventory
        const existingItem = user.inventory.find((i: any) => i.itemId === itemId);
        if (existingItem) {
            existingItem.count += 1;
        } else {
            user.inventory.push({ itemId, count: 1 });
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
                memoryUser.tokens = user.assets.tokens;
                memoryUser.inventory = user.inventory;

                // Emit update
                req.io.to(memoryUser.id).emit('user_updated', memoryUser);
            }
        }
        // ---------------------------------------------------------

        res.json({
            success: true,
            tokens: user.assets.tokens,
            inventory: user.inventory
        });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
