import React, { useEffect, useState, useContext } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { MonacoBinding } from 'y-monaco';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ShareModal from './ShareModal';
import { io } from 'socket.io-client';
import '../App.css';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

const CoCodeEditor = () => {
  const { roomId } = useParams();
  const [status, setStatus] = useState('Connecting...');
  const [editorInstance, setEditorInstance] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const { user, logout } = useContext(AuthContext) || {};
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const [terminalOutput, setTerminalOutput] = useState("Ready...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [userRole, setUserRole] = useState('Viewer'); 

  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/login`); 
      return;
    }
    if (!roomId || roomId.trim() === '') {
      navigate('/dashboard');
    }
  }, [roomId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!roomId || !token) return;
    
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/${roomId}/role?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => setUserRole(response.data.role))
    .catch(() => setUserRole('Viewer'));
  }, [roomId, user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!roomId || !token) return;

    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/${roomId}/files`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      const fetchedFiles = response.data.files || [];
      setFiles(fetchedFiles);
      
      const firstFile = fetchedFiles.find(f => f.type === 'file');
      if (firstFile) {
        setActiveFileId(firstFile.fileId);
      }
    })
    .catch(error => console.error("Failed to fetch files:", error));
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;
    
    socket.emit('join-room', roomId);

    socket.on('receive-output', (output) => {
        setTerminalOutput(output);
    });

    socket.on('files-updated', (updatedFiles) => {
        setFiles(updatedFiles);
    });

    return () => {
      socket.off('receive-output');
      socket.off('files-updated');
    };
  }, [roomId]);

  useEffect(() => {
    if (!editorInstance || !activeFileId) return;

    const ydoc = new Y.Doc();
    const yText = ydoc.getText(activeFileId);

    const provider = new SocketIOProvider(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
      `${roomId}-${activeFileId}`,
      ydoc,
      { 
        autoConnect: true,
        query: { roomId, fileId: activeFileId, userId: user?.userId || user?.id || user?._id } 
      }
    );

    provider.on('status', ({ status }) => setStatus(status));

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
      const usersList = states.filter(state => state.user).map(state => state.user);
      setActiveUsers(usersList);
    });

    return () => {
      binding.destroy();
      provider.disconnect();
      ydoc.destroy();
    };
  }, [editorInstance, roomId, activeFileId, user]);

  const handleEditorDidMount = (editor) => {
    setEditorInstance(editor);
  };

  useEffect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({ readOnly: userRole === 'Viewer' });
    }
  }, [userRole, editorInstance]);

  // Combined Creation Handler (Files & Folders)
  const handleCreateItem = async (type) => {
    const itemName = prompt(`Enter ${type} name:`);
    if (!itemName) return;

    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/workspace/${roomId}/files`, 
        { fileName: itemName, language, type, parentId: selectedFolderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedFilesList = response.data.files;
      setFiles(updatedFilesList);

      if (type === 'file') {
        setActiveFileId(response.data.file.fileId);
      } else {
        // Auto-expand the newly created folder and select it
        setExpandedFolders(prev => ({ ...prev, [response.data.file.fileId]: true }));
        setSelectedFolderId(response.data.file.fileId);
      }

      socket.emit('update-files', { roomId, files: updatedFilesList });
    } catch (error) {
      alert(`Failed to create ${type}: ` + (error.response?.data?.message || error.message));
    }
  };

  const handleRunCode = async () => {
    const currentCode = editorInstance ? editorInstance.getValue() : ""; 
    if (!currentCode.trim()) return;

    setIsExecuting(true);
    setTerminalOutput("Running...");
    socket.emit('broadcast-output', { roomId, output: "Running..." });

    try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/execute`, 
            { code: currentCode, language: language },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );

        const result = response.data.output || "Execution finished with no output.";
        setTerminalOutput(result);
        socket.emit('broadcast-output', { roomId, output: result });
    } catch (error) {
        const errorMsg = "Error: " + (error.response?.data?.message || error.message);
        setTerminalOutput(errorMsg);
        socket.emit('broadcast-output', { roomId, output: errorMsg });
    } finally {
        setIsExecuting(false);
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    setSelectedFolderId(folderId);
  };

  const selectFile = (fileId, parentId) => {
    setActiveFileId(fileId);
    setSelectedFolderId(parentId);
  };

  // The Recursive File Tree Renderer
  const renderFileTree = (parentId = null, level = 0) => {
    return files
      .filter(f => f.parentId === parentId)
      .sort((a, b) => {
        // Folders render first, then alphabetized
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      })
      .map(item => {
        if (item.type === 'folder') {
          const isExpanded = expandedFolders[item.fileId];
          const isSelected = selectedFolderId === item.fileId;
          return (
            <React.Fragment key={item.fileId}>
              <div
                onClick={() => toggleFolder(item.fileId)}
                style={{
                  padding: `6px 16px 6px ${level * 15 + 16}px`,
                  fontSize: '13px',
                  color: isSelected ? '#fff' : '#9ca3af',
                  backgroundColor: isSelected ? '#2a2a2a' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  userSelect: 'none'
                }}
              >
                <span style={{ fontSize: '10px', width: '12px' }}>{isExpanded ? '▼' : '▶'}</span> 📁 {item.name}
              </div>
              {isExpanded && renderFileTree(item.fileId, level + 1)}
            </React.Fragment>
          );
        } else {
          const isActive = activeFileId === item.fileId;
          return (
            <div
              key={item.fileId}
              onClick={() => selectFile(item.fileId, item.parentId)}
              style={{
                padding: `6px 16px 6px ${level * 15 + 34}px`, // Indented to align cleanly under folders
                fontSize: '13px',
                color: isActive ? '#fff' : '#9ca3af',
                backgroundColor: isActive ? '#2a2a2a' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none'
              }}
            >
              📄 {item.name}
            </div>
          );
        }
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e1e', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: '#121212', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', fontSize: '14px' }}>←</button>
          <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '18px' }}>⚡ CoCode</h2>
          <span style={{ fontSize: '13px', color: '#888' }}>Room: <strong style={{ color: '#fff' }}>{roomId}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {activeUsers.map((activeUser, index) => (
              <div key={index} title={activeUser.name} style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: activeUser.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff', border: '2px solid #1e1e1e' }}>
                {activeUser.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          <span style={{ fontSize: '12px' }}>Sync: <span style={{ color: status === 'connected' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{status.toUpperCase()}</span></span>
          <span style={{ fontSize: '13px', color: userRole === 'Viewer' ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>[{userRole}]</span>

          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '5px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', fontSize: '12px' }}>
              <option value="javascript">JavaScript</option>
          </select>

          <button onClick={() => setIsShareModalOpen(true)} style={{ padding: '5px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Share 🔗</button>
          <button onClick={handleRunCode} disabled={isExecuting} className={`px-3 py-1.5 font-bold rounded text-xs text-white transition ${isExecuting ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>
              {isExecuting ? '⏳ Running...' : '▶ Run Code'}
          </button>
          <button onClick={handleLogout} style={{ padding: '5px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Sign Out</button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Advanced File Explorer Sidebar */}
        <div style={{ width: '220px', backgroundColor: '#181818', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 'bold', color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a', letterSpacing: '0.05em' }}>
            <span>EXPLORER</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleCreateItem('file')} title="New File" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '14px' }}>📄</button>
              <button onClick={() => handleCreateItem('folder')} title="New Folder" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '14px' }}>📁</button>
              <button onClick={() => setSelectedFolderId(null)} title="Deselect (Create at Root)" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '14px' }}>⨯</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }} onClick={(e) => {
            // Clicking empty space in the sidebar deselects any folder, defaulting new items to the root
            if (e.target === e.currentTarget) setSelectedFolderId(null);
          }}>
            {renderFileTree(null, 0)}
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Editor
            height="100%"
            defaultLanguage={language}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 16 },
              readOnly: userRole === 'Viewer'
            }}
          />
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="h-40 w-full bg-black border-t border-gray-700 p-3 overflow-y-auto font-mono text-xs shadow-inner">
        <div className="text-gray-500 mb-1 font-bold tracking-wider uppercase">Terminal Output</div>
        <pre className={`whitespace-pre-wrap ${terminalOutput.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
          {terminalOutput}
        </pre>
      </div>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} roomId={roomId} />
    </div>
  );
};

export default CoCodeEditor;