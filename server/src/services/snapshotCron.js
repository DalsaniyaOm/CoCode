const cron = require('node-cron');
const Y = require('yjs');
const Workspace = require('../models/Workspace');

const initSnapshotCron = (ySocketIO) => {
    if (process.env.NODE_ENV === 'test') {
        console.log('🔄 [CRON] Skipped initialization for Jest testing environment.');
        return;
    }

    cron.schedule('*/5 * * * *', async () => {
        console.log('🔄 [CRON] Initiating Yjs state vector snapshot backup...');

        if (ySocketIO.documents.size === 0) {
            console.log('🔄 [CRON] No active workspaces to back up.');
            return;
        }

        ySocketIO.documents.forEach(async (doc, roomName) => {
            try {
                const stateVector = Y.encodeStateAsUpdate(doc);

                const buffer = Buffer.from(stateVector);

                await Workspace.findOneAndUpdate(
                    { roomId: roomName },
                    {
                        documentState: buffer,
                        lastBackedUp: new Date()
                    },
                    { upsert: true }
                );

                console.log(`✅ [CRON] Snapshot saved for Workspace: ${roomName}`);
            } catch (error) {
                console.error(`❌ [CRON] Failed to save snapshot for room ${roomName}:`, error);
            }
        });
    });
};

module.exports = { initSnapshotCron };