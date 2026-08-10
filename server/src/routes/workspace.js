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
      guestRole: 'Viewer'
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

    const userId = req.user.userId || req.user.id || req.user._id;

    if (workspace.ownerId && workspace.ownerId.toString() === userId.toString()) {
      return res.status(200).json({ role: 'Owner' });
    }

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

    workspace.guestRole = guestRole;
    await workspace.save();

    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. GET ALL FILES FOR A WORKSPACE
// ==========================================
router.get('/:roomId/files', protect, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ roomId: req.params.roomId });
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    res.status(200).json({ files: workspace.files });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching files', error: error.message });
  }
});

// ==========================================
// 6. CREATE A NEW ITEM (FILE OR FOLDER)
// ==========================================
router.post('/:roomId/files', protect, async (req, res) => {
  try {
    const { fileName, language, type = 'file', parentId = null } = req.body;
    const workspace = await Workspace.findOne({ roomId: req.params.roomId });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const newItem = {
      fileId: crypto.randomUUID().slice(0, 8),
      type: type,
      name: fileName || (type === 'folder' ? 'New Folder' : 'untitled.js'),
      parentId: parentId,
      content: type === 'folder' ? '' : '// Start coding here...',
    };

    workspace.files.push(newItem);
    await workspace.save();

    res.status(201).json({ message: `${type} created successfully`, file: newItem, files: workspace.files });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating item', error: error.message });
  }
});

// ==========================================
// 7. UPDATE A SPECIFIC FILE CONTENT/NAME
// ==========================================
router.put('/:roomId/files/:fileId', protect, async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const { content, name } = req.body;

    const workspace = await Workspace.findOne({ roomId });
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const file = workspace.files.id(fileId) || workspace.files.find(f => f.fileId === fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (content !== undefined) file.content = content;
    if (name !== undefined) file.name = name;

    await workspace.save();
    res.status(200).json({ message: 'File updated successfully', file });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating file', error: error.message });
  }
});

// ==========================================
// 8. DELETE A FILE FROM WORKSPACE
// ==========================================
router.delete('/:roomId/files/:fileId', protect, async (req, res) => {
  try {
    const { roomId, fileId } = req.params;

    const workspace = await Workspace.findOne({ roomId });
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (workspace.files.length <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last remaining file.' });
    }

    workspace.files = workspace.files.filter(f => f.fileId !== fileId && f._id?.toString() !== fileId);
    await workspace.save();

    res.status(200).json({ message: 'File deleted successfully', files: workspace.files });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting file', error: error.message });
  }
});

// ==========================================
// 9. GET WORKSPACE METADATA (Must be near bottom)
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

module.exports = router;