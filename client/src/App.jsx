import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { Toast } from './components/Toast.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { SenderPage } from './pages/SenderPage.jsx';
import { ReceiverPage } from './pages/ReceiverPage.jsx';
import { disconnectSocket } from './services/socket.js';
import './styles/index.css';

export function App() {
  const [role, setRole] = useState('LANDING'); // 'LANDING' | 'SENDER' | 'RECEIVER'
  const [toasts, setToasts] = useState([]);
  const [sessionStatus, setSessionStatus] = useState(null);

  // Auto-route to Receiver mode if qrToken query parameter is present in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('qrToken')) {
      setRole('RECEIVER');
    }
  }, []);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetSession = () => {
    disconnectSocket();
    setRole('LANDING');
    setSessionStatus(null);
    // Clear URL parameters if any
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  return (
    <div className="app-container">
      <Navbar
        onReset={role !== 'LANDING' ? handleResetSession : null}
        sessionStatus={sessionStatus}
        role={role}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {role === 'LANDING' && (
          <LandingPage onSelectRole={(selectedRole) => setRole(selectedRole)} />
        )}

        {role === 'SENDER' && (
          <SenderPage
            showToast={showToast}
            onReset={handleResetSession}
          />
        )}

        {role === 'RECEIVER' && (
          <ReceiverPage
            showToast={showToast}
            onReset={handleResetSession}
          />
        )}
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
      <Footer />
    </div>
  );
}

export default App;
