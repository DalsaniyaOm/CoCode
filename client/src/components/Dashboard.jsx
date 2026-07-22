import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
    const [roomName, setRoomName] = useState('');
    const [joinLink, setJoinLink] = useState('');
    const [recentWorkspaces, setRecentWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const { user, logout } = useContext(AuthContext) || {};
    const navigate = useNavigate();

    // Fetch the user's previously created workspaces
    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return navigate('/login');

                const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRecentWorkspaces(response.data);
            } catch (error) {
                console.error("Failed to load workspaces", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspaces();
    }, [navigate]);

    // Handle Creating a New Workspace
    const handleCreateWorkspace = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/create`,
                { roomName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Redirect the Owner directly into their newly created room
            navigate(`/workspace/${response.data.roomId}`);
        } catch (error) {
            alert(`Creation Error: ${error.response?.data?.message || error.message}`);
        }
    };

    // Handle Joining an Existing Workspace
    const handleJoinWorkspace = (e) => {
        e.preventDefault();
        if (!joinLink.trim()) return;

        // If they paste a full URL, extract just the ID from the end
        const extractedRoomId = joinLink.split('/').pop().trim();
        navigate(`/workspace/${extractedRoomId}`);
    };

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-white font-sans p-8">
            
            {/* Dashboard Header */}
            <div className="max-w-5xl mx-auto flex justify-between items-center mb-10 border-b border-gray-700 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-blue-400 mb-1">⚡ CoCode Dashboard</h1>
                    <p className="text-gray-400">Welcome back, {user?.username || 'Developer'}!</p>
                </div>
                <button 
                    onClick={() => { if (logout) logout(); navigate('/login'); }} 
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-sm font-bold transition"
                >
                    Sign Out
                </button>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: Actions */}
                <div className="flex flex-col gap-8">
                    
                    {/* Create Box */}
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                        <h2 className="text-xl font-bold text-green-400 mb-4">+ Create New Workspace</h2>
                        <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Workspace Name (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., capstone-project" 
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-green-400"
                                />
                            </div>
                            <button type="submit" className="w-full py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded transition">
                                Create Workspace
                            </button>
                        </form>
                    </div>

                    {/* Join Box */}
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                        <h2 className="text-xl font-bold text-blue-400 mb-4">🔗 Join Existing Workspace</h2>
                        <form onSubmit={handleJoinWorkspace} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Paste Link or Room ID</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., ff10691e" 
                                    value={joinLink}
                                    onChange={(e) => setJoinLink(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-400"
                                />
                            </div>
                            <button type="submit" className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded transition">
                                Join Workspace
                            </button>
                        </form>
                    </div>

                </div>

                {/* Right Column: Recent Workspaces */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                    <h2 className="text-xl font-bold text-yellow-400 mb-4">📁 Your Workspaces</h2>
                    
                    {loading ? (
                        <p className="text-gray-400">Loading your history...</p>
                    ) : recentWorkspaces.length > 0 ? (
                        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {recentWorkspaces.map((room) => (
                                <div 
                                    key={room.roomId} 
                                    onClick={() => navigate(`/workspace/${room.roomId}`)}
                                    className="p-4 bg-gray-900 rounded border border-gray-700 hover:border-yellow-400 cursor-pointer transition flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-bold text-white">{room.roomId}</div>
                                        <div className="text-xs text-gray-500">
                                            Role: <span className={room.guestRole === 'Editor' ? 'text-green-400' : 'text-gray-400'}>{room.guestRole || 'Viewer'}</span>
                                        </div>
                                    </div>
                                    <span className="text-yellow-400 text-xl">→</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500 mb-2">You haven't created any workspaces yet.</p>
                            <p className="text-sm text-gray-400">Use the panel on the left to start coding!</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;