import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { connectSocket } from '../services/socket.js';
import { WebRTCManager } from '../services/webrtc.js';
import { CodeDisplay } from '../components/CodeDisplay.jsx';
import { QRCodeDisplay } from '../components/QRCodeDisplay.jsx';
import { FilePicker } from '../components/FilePicker.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { CheckCircle2, Loader2, Send, Users, PlusCircle, AlertCircle, RefreshCw, Zap, WifiOff } from 'lucide-react';

export function SenderPage({ showToast, onReset }) {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [receiverConnected, setReceiverConnected] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Transfer states
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [totalFilesSent, setTotalFilesSent] = useState(0);

  // WebRTC State
  const [connectionType, setConnectionType] = useState('WebRTC Connecting...');
  const webrtcRef = useRef(null);

  const initSenderSession = async () => {
    let socketInstance = null;
    try {
      setIsInitializing(true);
      setInitError(null);

      // Check if browser is offline
      if (!navigator.onLine) {
        throw new Error('Your browser is currently Offline. Please check your internet connection or turn off DevTools Offline mode.');
      }

      const res = await api.createSession(20);

      if (!res || !res.sessionId) {
        throw new Error('Server returned invalid session data');
      }

      setSession(res);

      // Connect Socket.IO
      socketInstance = connectSocket();
      
      socketInstance.emit('join_session', {
        sessionId: res.sessionId,
        role: 'SENDER',
        authToken: res.authToken
      });

      // Initialize WebRTC Manager
      const rtcManager = new WebRTCManager(socketInstance, res.sessionId, 'SENDER');
      webrtcRef.current = rtcManager;

      rtcManager.onChannelStateChange = (isOpen) => {
        if (isOpen) {
          setConnectionType(rtcManager.connectionType);
          showToast('WebRTC DataChannel Connected ⚡ (Ultra-Fast P2P Ready)', 'success');
        }
      };

      socketInstance.on('peer_connected', (data) => {
        if (data.receiverConnected || data.role === 'RECEIVER') {
          setReceiverConnected(true);
          showToast('Receiver Connected ✓', 'success');
          // Sender initiates WebRTC offer
          setTimeout(() => {
            rtcManager.createOffer();
          }, 300);
        }
      });

      socketInstance.on('session_state', (data) => {
        if (data.receiverConnected) {
          setReceiverConnected(true);
          setTimeout(() => {
            rtcManager.createOffer();
          }, 300);
        }
      });

      socketInstance.on('peer_disconnected', (data) => {
        if (data.role === 'RECEIVER') {
          setReceiverConnected(false);
          showToast('Receiver disconnected. Waiting for a new receiver...', 'info');
        }
      });

      setIsInitializing(false);
    } catch (err) {
      console.error('[Sender] Init error:', err);
      const isNetworkErr = !navigator.onLine || err.message?.includes('fetch') || err.message?.includes('INTERNET_DISCONNECTED');
      const friendlyMsg = isNetworkErr
        ? 'Internet Connection Disconnected 🌐. Please turn off DevTools "Offline" mode or connect to internet, then click Retry.'
        : (err.message || 'Failed to initialize sharing session');
      
      setInitError(friendlyMsg);
      showToast(friendlyMsg, 'error');
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initSenderSession();

    // Listen for online event
    const handleOnline = () => {
      if (!session) initSenderSession();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (webrtcRef.current) {
        webrtcRef.current.destroy();
      }
      const socketInstance = connectSocket();
      if (socketInstance) {
        socketInstance.off('peer_connected');
        socketInstance.off('session_state');
        socketInstance.off('peer_disconnected');
      }
    };
  }, []);

  // Status Polling Fallback to guarantee instant Receiver detection
  useEffect(() => {
    if (!session || receiverConnected) return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await api.getSessionStatus(session.sessionId);
        if (statusRes.receiverConnected) {
          setReceiverConnected(true);
          if (webrtcRef.current) {
            webrtcRef.current.createOffer();
          }
        }
      } catch (err) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [session, receiverConnected]);

  const handleRegenerateQR = async () => {
    if (!session) return;
    try {
      const res = await api.regenerateQR(session.sessionId);
      setSession((prev) => ({ ...prev, qrToken: res.qrToken }));
      showToast('QR Code regenerated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to regenerate QR Code', 'error');
    }
  };

  const handleSendFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showToast('Please select at least one file to send', 'error');
      return;
    }

    try {
      setIsTransferring(true);
      setTransferProgress(0);
      setIsComplete(false);

      const socket = connectSocket();
      const rtc = webrtcRef.current;

      // Signal transfer start to Receiver
      socket.emit('transfer_start', {
        sessionId: session.sessionId,
        fileList: selectedFiles.map(f => ({ name: f.name, size: f.size })),
        totalBytes: selectedFiles.reduce((acc, f) => acc + f.size, 0)
      });

      const processedFiles = [];

      // Primary Attempt: Transfer over direct WebRTC DataChannel if open
      if (rtc && rtc.isChannelOpen) {
        setConnectionType(rtc.connectionType);
        rtc.onProgress = (prog) => {
          setTransferProgress(prog.percent);
          setTransferSpeed(prog.speed);
          setCurrentFileName(prog.fileName);
        };

        for (const file of selectedFiles) {
          setCurrentFileName(file.name);
          const result = await rtc.sendFile(file);
          processedFiles.push({
            id: result.id,
            originalName: file.name,
            size: file.size
          });
        }
      } else {
        // Fallback: Upload via HTTP server endpoint if WebRTC DataChannel is blocked
        setConnectionType('HTTP Server Fallback');
        showToast('WebRTC DataChannel unavailable, using HTTP Server fallback...', 'info');

        setCurrentFileName(selectedFiles[0].name);

        const response = await api.uploadFiles(
          session.sessionId,
          session.authToken,
          selectedFiles,
          (progress) => {
            setTransferProgress(progress.percent);
            setTransferSpeed(progress.speed);

            socket.emit('transfer_progress', {
              sessionId: session.sessionId,
              fileId: 'file_active',
              bytesTransferred: progress.loaded,
              totalBytes: progress.total,
              speed: progress.speed,
              percent: progress.percent
            });
          }
        );

        if (response && response.files) {
          processedFiles.push(...response.files);
        }
      }

      // Signal completion to room peers
      socket.emit('transfer_complete', {
        sessionId: session.sessionId,
        newFiles: processedFiles,
        files: processedFiles
      });

      setIsTransferring(false);
      setIsComplete(true);
      setTotalFilesSent(processedFiles.length);
      showToast(`${selectedFiles.length} file(s) sent via ${connectionType} ✓`, 'success');
    } catch (err) {
      console.error('[Sender] Send error:', err);
      setIsTransferring(false);
      showToast(err.message || 'Transfer failed', 'error');
    }
  };

  const handleSendMore = () => {
    setIsComplete(false);
    setSelectedFiles([]);
  };

  if (isInitializing) {
    return (
      <div style={{ textCenter: 'center', padding: '100px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={48} className="spin" color="var(--primary)" style={{ marginBottom: '20px' }} />
        <h2>Generating Secure Sharing Session...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Creating cryptographically secure 6-digit codes and QR token...</p>
      </div>
    );
  }

  if (initError || !session) {
    const isOffline = !navigator.onLine || initError?.includes('Offline') || initError?.includes('Disconnected');
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '30px 20px' }}>
          {isOffline ? (
            <WifiOff size={56} color="var(--danger)" style={{ marginBottom: '16px' }} />
          ) : (
            <AlertCircle size={56} color="var(--danger)" style={{ marginBottom: '16px' }} />
          )}
          <h2 style={{ fontSize: '1.6rem', marginBottom: '10px' }}>
            {isOffline ? 'Internet Connection Disconnected' : 'Session Connection Error'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
            {initError || 'Unable to connect to the File Mover backend server.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={initSenderSession}>
              <RefreshCw size={18} /> Retry Connection
            </button>
            <button className="btn btn-secondary" onClick={onReset}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine current active step
  const activeStep = isComplete ? 4 : isTransferring ? 4 : receiverConnected ? 3 : 2;

  return (
    <div style={{ maxWidth: '750px', margin: '40px auto', padding: '0 16px', width: '100%' }}>
      {/* Wizard Header Steps */}
      <div className="steps-container">
        <div className={`step-item completed`}>
          <div className="step-number">✓</div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Create Session</span>
        </div>
        <div className="step-divider" />
        <div className={`step-item ${activeStep >= 2 ? (receiverConnected ? 'completed' : 'active') : ''}`}>
          <div className="step-number">{receiverConnected ? '✓' : '2'}</div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Connect Receiver</span>
        </div>
        <div className="step-divider" />
        <div className={`step-item ${activeStep >= 3 ? (selectedFiles.length > 0 ? 'completed' : 'active') : ''}`}>
          <div className="step-number">{selectedFiles.length > 0 && activeStep > 3 ? '✓' : '3'}</div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Files</span>
        </div>
        <div className="step-divider" />
        <div className={`step-item ${activeStep >= 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Transfer</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '36px' }}>
        {/* STEP 2: CREDENTIALS & WAITING FOR RECEIVER */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.4rem)' }}>Sharing Credentials</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Share these 3 codes or let the Receiver scan the QR code.
              </p>
            </div>

            <div className={`status-pill ${receiverConnected ? 'connected' : 'waiting'}`} style={{ flexShrink: 0 }}>
              <Users size={16} />
              <span>{receiverConnected ? 'Connected ✓' : 'Waiting...'}</span>
            </div>
          </div>

          <CodeDisplay codes={session?.codes || []} showToast={showToast} />
          
          <QRCodeDisplay
            qrToken={session?.qrToken || ''}
            onRegenerateQR={handleRegenerateQR}
            showToast={showToast}
          />
        </div>

        {/* STEP 3: FILE PICKER */}
        {!isTransferring && !isComplete && (
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
              Select Files to Share
            </h3>

            <FilePicker
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              showToast={showToast}
            />

            {selectedFiles.length > 0 && (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSendFiles}
                style={{ width: '100%', marginTop: '24px' }}
              >
                <Zap size={20} />
                SEND {selectedFiles.length} FILE(S) VIA WEBRTC PEER-TO-PEER
              </button>
            )}
          </div>
        )}

        {/* STEP 4: TRANSFER PROGRESS */}
        {isTransferring && (
          <ProgressBar
            percent={transferProgress}
            speed={transferSpeed}
            currentFile={currentFileName}
            role="SENDER"
          />
        )}

        {/* STEP 4 COMPLETE */}
        {isComplete && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(46, 125, 50, 0.08)',
            border: '1px solid rgba(46, 125, 50, 0.3)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <CheckCircle2 size={56} color="var(--success)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>TRANSFER COMPLETE ✓</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              {totalFilesSent} total file(s) successfully delivered via {connectionType}.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleSendMore}>
                <PlusCircle size={18} /> + Add & Send More Files
              </button>
              <button className="btn btn-secondary" onClick={onReset}>
                Exit Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
