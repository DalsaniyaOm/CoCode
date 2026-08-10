const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    default: 'file'
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  parentId: {
    type: String,
    default: null
  },
  content: {
    type: String,
    default: '// Welcome to CoCode! Start typing collaboratively...'
  },
  documentState: {
    type: Buffer,
    default: null
  }
});

const workspaceSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: [true, 'A roomId is required'],
      unique: true,
      trim: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    guestRole: {
      type: String,
      enum: ['Editor', 'Viewer'],
      default: 'Viewer'
    },
    files: {
      type: [itemSchema],
      default: () => [
        {
          fileId: 'root-main-file',
          type: 'file',
          name: 'main.js',
          parentId: null,
          content: '// Welcome to CoCode! Start typing collaboratively...'
        }
      ]
    },
    lastBackedUp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Workspace', workspaceSchema);