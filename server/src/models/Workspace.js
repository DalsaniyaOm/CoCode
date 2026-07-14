const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: [true, 'A roomId is required'],
      unique: true,
      trim: true
    },
    content: {
      type: String,
      default: '// Welcome to CoCode! Start typing collaboratively...'
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Workspace', workspaceSchema);