const express = require('express');
const Workspace = require('../models/Workspace');

const router = express.Router();

// GET /api/workspace
// List recent workspaces
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find()
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({
      message: 'Server error while listing workspaces',
      error: error.message
    });
  }
});

// GET /api/workspace/:roomId
// Load a workspace or create it if it does not exist
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    let workspace = await Workspace.findOne({ roomId });

    if (!workspace) {
      workspace = await Workspace.create({ roomId });
    }

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({
      message: 'Server error while fetching workspace',
      error: error.message
    });
  }
});

// PUT /api/workspace/:roomId
// Save or update workspace content
router.put('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({
        message: 'Content field is required'
      });
    }

    const workspace = await Workspace.findOneAndUpdate(
      { roomId },
      { content },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true
      }
    );

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({
      message: 'Server error while saving workspace',
      error: error.message
    });
  }
});

module.exports = router;