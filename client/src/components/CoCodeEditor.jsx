import React, { useEffect, useState, useContext } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { MonacoBinding } from 'y-monaco';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import '../App.css';

const CoCodeEditor = () => {
  const { roomId } = useParams();
  const [status, setStatus] = useState('Connecting...');
  const [editorInstance, setEditorInstance] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const { user, logout } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId || roomId.trim() === '') {
      navigate('/workspace/lobby');
    }
  }, [roomId, navigate]);

  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
  };

  useEffect(() => {
    if (!editorInstance) return;

    const ydoc = new Y.Doc();
    const yText = ydoc.getText('monaco');

    const provider = new SocketIOProvider(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
      roomId,
      ydoc,
      { autoConnect: true }
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
          <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '20px' }}>⚡ CoCode</h2>
          <span style={{ fontSize: '14px', color: '#888' }}>Workspace: <strong style={{ color: '#fff' }}>{roomId}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* 5. RENDER THE LIVE PARTICIPANT AVATARS */}
          <div style={{ display: 'flex', gap: '6px', marginRight: '10px' }}>
            {activeUsers.map((activeUser, index) => (
              <div 
                key={index}
                title={activeUser.name} // Shows their name when hovered
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
                {/* Display the first letter of their username */}
                {activeUser.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '13px' }}>
            Sync Status: <span style={{ color: status === 'connected' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{status.toUpperCase()}</span>
          </div>
          {user && <span style={{ fontSize: '14px', color: '#bbb' }}>Logged in as: <strong style={{ color: '#60a5fa' }}>{user.username}</strong></span>}
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
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
};

export default CoCodeEditor;