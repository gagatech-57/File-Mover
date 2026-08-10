import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { connectSocket } from '../services/socket.js';
import { CodeInput } from '../components/CodeInput.jsx';
import { QRScannerModal } from '../components/QRScannerModal.jsx';
import { FileList } from '../components/FileList.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { QrCode, KeyRound, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

/**
 * Helper to trigger automatic browser download for incoming files
 */
function triggerAutoDownload(downloadUrl, filename) {
  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('[Auto Download Error]', err);
  }
}

/**
 * Trigger staggered automatic downloads for batch files to prevent popup blocking
 */
function triggerBatchAutoDownloads(sessionId, filesToDownload) {
  if (!Array.isArray(filesToDownload) || filesToDownload.length === 0) return;

  filesToDownload.forEach((file, index) => {
    setTimeout(() => {
      const url = api.getDownloadSingleUrl(sessionId, file.id);
      triggerAutoDownload(url, file.originalName || file.name);
    }, index * 400); // 400ms staggering
  });
}

export function ReceiverPage({ showToast, onReset }) {
  const [activeTab, setActiveTab] = useState('CODES'); // 'CODES' | 'QR'
  const [codes, setCodes] = useState(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Session verification state
  const [connectedSession, setConnectedSession] = useState(null);
  const [senderConnected, setSenderConnected] = useState(true);

  // Receiving state
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [receiveSpeed, setReceiveSpeed] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [isComplete, setIsComplete] = useState(false);

  // Auto-connect if qrToken parameter is present in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrTokenFromUrl = urlParams.get('qrToken');

    if (qrTokenFromUrl) {
      handleVerify({ qrToken: qrTokenFromUrl });
    }
  }, []);

  const handleVerify = async (payload) => {
    try {
      setIsLoading(true);
      const res = await api.verifySession(payload);

      setConnectedSession(res);
      showToast('Connected to Sharing Session ✓', 'success');

      // Fetch any existing files in session immediately
      try {
        const fileRes = await api.getSessionFiles(res.sessionId);
        if (fileRes.files && fileRes.files.length > 0) {
          setReceivedFiles(fileRes.files);
          setIsComplete(true);
        }
      } catch (err) {
        console.log('[Receiver] Pre-fetch files notice:', err.message);
      }

      // Connect Socket.IO
      const socket = connectSocket();
      socket.emit('join_session', {
        sessionId: res.sessionId,
        role: 'RECEIVER',
        authToken: res.authToken
      });

      // Socket event listeners
      socket.on('session_state', (data) => {
        if (data.files && data.files.length > 0) {
          setReceivedFiles(data.files);
          setIsComplete(true);
        }
      });

      socket.on('peer_connected', (data) => {
        if (data.role === 'SENDER') {
          setSenderConnected(true);
          showToast('Sender Connected ✓', 'info');
        }
      });

      socket.on('peer_disconnected', (data) => {
        if (data.role === 'SENDER') {
          setSenderConnected(false);
          showToast('Sender disconnected. Session no longer available.', 'error');
        }
      });

      socket.on('transfer_start', (data) => {
        setIsReceiving(true);
        setReceiveProgress(0);
        setIsComplete(false);
        if (data.fileList && data.fileList.length > 0) {
          setCurrentFile(data.fileList[0].name);
        }
      });

      socket.on('transfer_progress', (data) => {
        setReceiveProgress(data.percent);
        setReceiveSpeed(data.speed);
      });

      socket.on('transfer_complete', (data) => {
        setIsReceiving(false);
        setIsComplete(true);

        const allFiles = data.files || [];
        const incomingFiles = data.newFiles || data.files || [];

        setReceivedFiles(allFiles);

        // AUTOMATICALLY TRIGGER DOWNLOAD FOR INCOMING FILES!
        triggerBatchAutoDownloads(res.sessionId, incomingFiles);

        showToast(`${incomingFiles.length} file(s) received & auto-download started! ✓`, 'success');
      });

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      showToast(err.message || 'Connection failed', 'error');
    }
  };

  const handleCodeSubmit = () => {
    if (!codes.every(c => c.length === 6)) {
      showToast('Please enter all three 6-digit codes', 'error');
      return;
    }
    handleVerify({ codes });
  };

  const handleScanSuccess = (qrToken) => {
    setIsScannerOpen(false);
    handleVerify({ qrToken });
  };

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
      {!connectedSession ? (
        /* CONNECT SCREEN: CODE ENTRY OR QR SCAN */
        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Receive Files</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Connect to the Sender using three 6-digit codes or by scanning their QR code.
            </p>
          </div>

          {/* TAB TOGGLE BUTTONS */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '30px'
          }}>
            <button
              onClick={() => setActiveTab('CODES')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'CODES' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'CODES' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <KeyRound size={18} /> Option A — Enter Codes
            </button>

            <button
              onClick={() => setActiveTab('QR')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'QR' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'QR' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <QrCode size={18} /> Option B — Scan QR
            </button>
          </div>

          {/* OPTION A: ENTER 3 CODES */}
          {activeTab === 'CODES' && (
            <CodeInput
              codes={codes}
              setCodes={setCodes}
              onSubmit={handleCodeSubmit}
              isLoading={isLoading}
            />
          )}

          {/* OPTION B: SCAN QR CODE BUTTON */}
          {activeTab === 'QR' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <QrCode size={40} />
              </div>

              <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Scan QR Code with Camera</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                Click below to launch camera scanner and scan the QR code on the Sender screen.
              </p>

              <button
                className="btn btn-primary btn-lg"
                onClick={() => setIsScannerOpen(true)}
                style={{ width: '100%' }}
              >
                <QrCode size={20} /> Open QR Scanner
              </button>
            </div>
          )}

          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={handleScanSuccess}
          />
        </div>
      ) : (
        /* CONNECTED & TRANSFER STATE SCREEN */
        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={24} color="var(--success)" />
                <h2 style={{ fontSize: '1.6rem' }}>CONNECTED ✓</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Session: {connectedSession.sessionId}
              </p>
            </div>

            <div className={`status-pill ${senderConnected ? 'connected' : 'waiting'}`}>
              <Clock size={14} />
              <span>{senderConnected ? 'Sender Online' : 'Sender Disconnected'}</span>
            </div>
          </div>

          {!senderConnected && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <AlertTriangle size={24} />
              <div>
                <strong style={{ display: 'block' }}>Sender Disconnected</strong>
                <span style={{ fontSize: '0.85rem' }}>This sharing session is no longer available.</span>
              </div>
            </div>
          )}

          {/* WAITING FOR SENDER TO SELECT/SEND FILES */}
          {!isReceiving && receivedFiles.length === 0 && senderConnected && (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div className="pulse-dot" style={{ width: '20px', height: '20px', margin: '0 auto 20px auto', background: 'var(--primary)' }}></div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Waiting for Sender...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                The Sender is currently selecting files to transfer. Files will appear here automatically.
              </p>
            </div>
          )}

          {/* REALTIME RECEIVING PROGRESS */}
          {isReceiving && (
            <ProgressBar
              percent={receiveProgress}
              speed={receiveSpeed}
              currentFile={currentFile}
              role="RECEIVER"
            />
          )}

          {/* RECEIVED FILES & DOWNLOAD BUTTONS */}
          {receivedFiles.length > 0 && (
            <FileList
              sessionId={connectedSession.sessionId}
              files={receivedFiles}
            />
          )}

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={onReset}>
              Exit Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
