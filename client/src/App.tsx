import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import CoCodeEditor from './components/CoCodeEditor';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: 'white', margin: 0, padding: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginForm />} />

    
            <Route path="/workspace/:roomId" element={<CoCodeEditor />} />

           
            <Route path="/workspace" element={<Navigate to="/workspace/lobby" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;