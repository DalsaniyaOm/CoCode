import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const LoginForm = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const { login, register } = auth || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!register) throw new Error('Registration is currently unavailable.');
        await register(username, email, password);
      } else {
        if (!login) throw new Error('Login is currently unavailable.');
        await login(email, password);
      }

      const safeRoomId = roomName.trim() || 'lobby';
      navigate(`/workspace/${safeRoomId}`);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#121212',
      fontFamily: 'sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        color: '#ffffff',
        border: '1px solid #2d2d2d'
      }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', color: '#60a5fa', fontSize: '24px' }}>
          {isRegistering ? 'Create CoCode Account' : 'Welcome Back'}
        </h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: '14px', margin: '0 0 24px 0' }}>
          {isRegistering ? 'Register to start collaborating' : 'Sign in to access your collaborative workspaces'}
        </p>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegistering && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginBottom: '6px', letterSpacing: '0.5px' }}>
                USERNAME
              </label>
              <input
                type="text"
                placeholder="e.g. Diya_Dev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isRegistering}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  backgroundColor: '#2d2d2d',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginBottom: '6px', letterSpacing: '0.5px' }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="developer@cocode.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #333',
                backgroundColor: '#2d2d2d',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginBottom: '6px', letterSpacing: '0.5px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #333',
                backgroundColor: '#2d2d2d',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginBottom: '6px', letterSpacing: '0.5px' }}>
              WORKSPACE ROOM <span style={{ fontWeight: 'normal', color: '#666', textTransform: 'none' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. team-alpha (leave blank to join lobby)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #333',
                backgroundColor: '#2d2d2d',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Processing...' : isRegistering ? 'Register & Enter' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888' }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Sign In' : 'Create one'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;