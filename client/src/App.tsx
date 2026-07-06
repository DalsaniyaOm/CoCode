// @ts-ignore: JavaScript module without type declarations
// import TestEditor from './components/TestEditor';

// function App() {
//   return (
//     <div style={{ minHeight: '100vh', backgroundColor: '#1e1e1e', color: 'white' }}>
//       {/* This is where Diya will eventually put the <Navbar /> 
//         and Archi's <LoginModal />. For now, we just render the editor! 
//       */}
//       <TestEditor />
//     </div>
//   );
// }

// export default App;

import React from 'react';
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
            
            <Route path="/workspace" element={<CoCodeEditor roomId="capstone-sprint-2" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;