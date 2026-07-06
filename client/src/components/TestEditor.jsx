import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';

const TestEditor = () => {
  const [status, setStatus] = useState('Disconnected');
  const [text, setText] = useState('');
  
  const yDocRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    yDocRef.current = ydoc;

    const yText = ydoc.getText('collaborative-code-block');

    const provider = new SocketIOProvider(
      'http://localhost:5000', 
      'test-room-1234', 
      ydoc,
      { autoConnect: true }
    );
    providerRef.current = provider;


    provider.on('status', ({ status }) => {
      setStatus(status);
    });

    yText.observe(() => {
      setText(yText.toString());
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, []);

  const handleTyping = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    const yText = yDocRef.current.getText('collaborative-code-block');
    yText.delete(0, yText.length);
    yText.insert(0, newText);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>CRDT WebSocket Test</h2>
      <p>Status: <span style={{ color: status === 'connected' ? 'green' : 'red' }}>{status}</span></p>
      
      <textarea 
        value={text}
        onChange={handleTyping}
        placeholder="Start typing to test real-time sync..."
        style={{ 
          width: '100%', 
          height: '300px', 
          fontSize: '16px', 
          padding: '15px',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          border: '2px solid #444',
          borderRadius: '8px',
          outline: 'none'
        }}
      />
    </div>
  );
};

export default TestEditor;