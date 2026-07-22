import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ShareModal = ({ isOpen, onClose, roomId }) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [selectedRole, setSelectedRole] = useState('Viewer');
    const [isOwner, setIsOwner] = useState(false);
    const { user } = useContext(AuthContext) || {};

    const shareableLink = `${window.location.origin}/workspace/${roomId}`;

    // Fetch current setting on open
    useEffect(() => {
        if (!isOpen) return;
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/${roomId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setSelectedRole(data.guestRole || 'Viewer');
                
                const actualUserId = user?.userId || user?.id || user?._id;
                setIsOwner(data.ownerId?._id === actualUserId || data.ownerId === actualUserId);
            } catch (error) {
                console.error("Failed to load settings", error);
            }
        };
        fetchSettings();
    }, [isOpen, roomId, user]);

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(shareableLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleSaveSettings = async () => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/${roomId}/settings`, 
                { guestRole: selectedRole },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            onClose();
        } catch (error) {
            alert("Error saving settings. Are you the owner?");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-white font-sans">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-blue-400">Share Workspace</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
                </div>

                <div className="mb-6">
                    <label className="block text-sm text-gray-300 mb-2">Shareable Link</label>
                    <div className="flex bg-gray-800 border border-gray-600 rounded">
                        <input type="text" readOnly value={shareableLink} className="flex-grow px-3 py-2 bg-transparent text-sm outline-none" />
                        <button onClick={handleCopyLink} className={`px-4 py-2 text-sm font-bold ${copySuccess ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                            {copySuccess ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm text-gray-300 mb-2">General Access Role</label>
                    <select 
                        value={selectedRole} 
                        onChange={(e) => setSelectedRole(e.target.value)} 
                        disabled={!isOwner}
                        className={`w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white outline-none ${!isOwner && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <option value="Viewer">Viewer (Read-only)</option>
                        <option value="Editor">Editor (Can type)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Anyone with the link will join with this role.</p>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-700 pt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">Cancel</button>
                    {isOwner && (
                        <button onClick={handleSaveSettings} className="px-4 py-2 text-sm font-bold bg-blue-500 hover:bg-blue-600 rounded text-white">
                            Save Settings
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;