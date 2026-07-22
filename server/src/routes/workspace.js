const express = require('express');
const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// 1. CREATE WORKSPACE (Must be at the top!)
// ==========================================
router.post('/create', protect, async (req, res) => {
  try {
    const roomId = req.body.roomName?.trim().toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID().slice(0, 8);
    
    if (await Workspace.exists({ roomId })) {
      return res.status(400).json({ message: 'Room name taken.' });
    }

    const userId = req.user.userId || req.user.id || req.user._id;

    const newWorkspace = await Workspace.create({
      roomId,
      ownerId: userId,
      guestRole: 'Viewer' // Defaults to safe read-only mode
    });

    res.status(201).json({ message: 'Created', roomId: newWorkspace.roomId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. LIST RECENT WORKSPACES (For Dashboard)
// ==========================================
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    
    // Shows only rooms this user owns
    const workspaces = await Workspace.find({ ownerId: userId })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: 'Server error listing workspaces', error: error.message });
  }
});

// ==========================================
// 3. GET ROLE (For WebSocket & UI Permissions)
// ==========================================
router.get('/:roomId/role', protect, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ roomId: req.params.roomId });
    if (!workspace) return res.status(404).json({ message: 'Not found' });

    // Safely extract ID from your JWT payload
    const userId = req.user.userId || req.user.id || req.user._id;

    // Are you the Owner?
    if (workspace.ownerId && workspace.ownerId.toString() === userId.toString()) {
      return res.status(200).json({ role: 'Owner' });
    }

    // If not, you get whatever the global switch is set to
    return res.status(200).json({ role: workspace.guestRole || 'Viewer' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. SETTINGS (Owner flipping the Global Switch)
// ==========================================
router.put('/:roomId/settings', protect, async (req, res) => {
  try {
    const { guestRole } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    const workspace = await Workspace.findOne({ roomId: req.params.roomId });
    if (!workspace) return res.status(404).json({ message: 'Not found' });

    if (workspace.ownerId && workspace.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the owner can change settings.' });
    }

    // Save the new setting
    workspace.guestRole = guestRole;
    await workspace.save();

    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. GET WORKSPACE METADATA (Must be near bottom)
// ==========================================
router.get('/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const workspace = await Workspace.findOne({ roomId }).populate('ownerId', 'username email');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace does not exist' });
    }

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching workspace', error: error.message });
  }
});

// ==========================================
// 6. SAVE WORKSPACE CONTENT (If you still need this)
// ==========================================
router.put('/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ message: 'Content field is required' });
    }

    const workspace = await Workspace.findOneAndUpdate(
      { roomId },
      { content },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: 'Server error while saving workspace', error: error.message });
  }
});

module.exports = router;