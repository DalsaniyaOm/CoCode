import React, { useEffect, useState, useContext } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { MonacoBinding } from 'y-monaco';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { IndexeddbPersistence } from 'y-indexeddb';
import axios from 'axios';
import ShareModal from './ShareModal';
import '../App.css';

const CoCodeEditor = () => {
  const { roomId } = useParams();
  const [status, setStatus] = useState('Connecting...');
  const [editorInstance, setEditorInstance] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const { user, logout } = useContext(AuthContext) || {};
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // 1. ADDED: State to track the user's permission level
  const [userRole, setUserRole] = useState('Viewer'); 
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // If they aren't logged in, kick them to the login page
    if (!token) {
      console.warn("🚨 Unauthenticated guest! Redirecting to login.");
      navigate(`/login`); 
      return;
    }

    if (!roomId || roomId.trim() === '') {
      navigate('/dashboard');
    }
  }, [roomId, navigate]);

  // 2. ADDED: Fetch the role from the backend using the Global Switch
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!roomId || !token) return;
    
    const fetchRole = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/${roomId}/role?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("🔒 Role assigned as:", response.data.role);
        setUserRole(response.data.role);
      } catch (error) {
        console.error("Role fetch failed. Defaulting to Viewer.", error);
        setUserRole('Viewer');
      }
    };

    fetchRole();
  }, [roomId, user]);

  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
  };

  // 3. ADDED: Force Monaco to lock/unlock dynamically if the role changes
  useEffect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({ readOnly: userRole === 'Viewer' });
    }
  }, [userRole, editorInstance]);

  useEffect(() => {
    if (!editorInstance) return;

    const ydoc = new Y.Doc();
    const yText = ydoc.getText('monaco');
    const indexeddbProvider = new IndexeddbPersistence(roomId, ydoc);
    indexeddbProvider.on('synced', () => {
      console.log(`💾 Offline cache loaded for room: ${roomId}`);
    });

    const provider = new SocketIOProvider(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
      roomId,
      ydoc,
      { 
        autoConnect: true,
        query: { roomId, userId: user?.userId || user?.id || user?._id } 
      }
    );

    provider.on('status', ({ status }) => {
      setStatus(status);
    });

    if (user) {
      provider.awareness.setLocalStateField('user', {
        name: user.username,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
      });
    }

    const binding = new MonacoBinding(
      yText,
      editorInstance.getModel(),
      new Set([editorInstance]),
      provider.awareness
    );

    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      
      const usersList = states
        .filter(state => state.user)
        .map(state => state.user);
        
      setActiveUsers(usersList);
    });

    return () => {
      binding.destroy();
      provider.disconnect();
      indexeddbProvider.destroy();
      ydoc.destroy();
    };
  }, [editorInstance, roomId, user]);

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e1e', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#121212', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              color: '#9ca3af', // Subtle gray
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0,
              
            }}
            // Simple hover effect using inline events
            onMouseOver={(e) => e.target.style.color = '#fff'}
            onMouseOut={(e) => e.target.style.color = '#9ca3af'}
          >
            ←
          </button>
          <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '20px' }}>⚡ CoCode</h2>
          <span style={{ fontSize: '14px', color: '#888' }}>Workspace: <strong style={{ color: '#fff' }}>{roomId}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* RENDER THE LIVE PARTICIPANT AVATARS */}
          <div style={{ display: 'flex', gap: '6px', marginRight: '10px' }}>
            {activeUsers.map((activeUser, index) => (
              <div 
                key={index}
                title={activeUser.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: activeUser.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#fff',
                  border: '2px solid #1e1e1e',
                  boxShadow: '0 0 0 1px #444',
                  cursor: 'default'
                }}
              >
                {activeUser.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          
          {/* OFFLINE RESILIENCE BADGE */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: status === 'connected' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.15)',
            border: `1px solid ${status === 'connected' ? '#4ade80' : '#f59e0b'}`,
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: status === 'connected' ? '#4ade80' : '#f59e0b',
              boxShadow: status === 'connected' ? '0 0 8px #4ade80' : '0 0 8px #f59e0b'
            }} />
            <span style={{ color: status === 'connected' ? '#4ade80' : '#fbbf24' }}>
              {status === 'connected' ? 'ONLINE • SYNCED' : '⚠️ OFFLINE • SAVING LOCALLY'}
            </span>
          </div>
          {user && <span style={{ fontSize: '14px', color: '#bbb' }}>Logged in as: <strong style={{ color: '#60a5fa' }}>{user.username}</strong></span>}
          
          {/* Display the active role for debugging/clarity */}
          <span style={{ fontSize: '14px', color: userRole === 'Viewer' ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
            [{userRole}]
          </span>
          <button
            onClick={() => setIsShareModalOpen(true)}
            style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Share 🔗
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Welcome to CoCode! Start typing collaboratively..."
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 15,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 16 },
            // 4. ADDED: Set the initial readOnly state
            readOnly: userRole === 'Viewer'
          }}
        />
      </div>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={roomId}
      />
    </div>
  );
};

export default CoCodeEditor;