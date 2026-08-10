import React from 'react';
import { FolderOutput, Download, ShieldCheck, Zap, Lock, QrCode } from 'lucide-react';

export function LandingPage({ onSelectRole }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="hero-section">
        <div className="hero-badge">
          <ShieldCheck size={16} /> Zero Login • Instant File Mover
        </div>

        <h1 className="hero-title">
          Move your files instantly.<br />
          <span className="gradient-text">No login. No account.</span>
        </h1>

        <p className="hero-subtitle">
          Connect Sender and Receiver using three 6-digit verification codes or a QR scan.
          Move files safely with automatic expiration and zero permanent logs.
        </p>

        <div className="hero-cards-grid">
          {/* SENDER CARD */}
          <div className="glass-card action-card">
            <div>
              <div className="action-card-icon">
                <FolderOutput size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Send Files</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
                Generate three 6-digit codes or a QR code. Select your files and send directly to your receiver.
              </p>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={() => onSelectRole('SENDER')}
              style={{ width: '100%' }}
            >
              <FolderOutput size={20} /> SEND FILES
            </button>
          </div>

          {/* RECEIVER CARD */}
          <div className="glass-card action-card">
            <div>
              <div className="action-card-icon" style={{ background: 'rgba(255, 143, 0, 0.12)', color: 'var(--accent-amber)' }}>
                <Download size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Receive Files</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
                Enter the 3 verification codes provided by the Sender or scan their QR code to download files.
              </p>
            </div>

            <button
              className="btn btn-secondary btn-lg"
              onClick={() => onSelectRole('RECEIVER')}
              style={{ width: '100%' }}
            >
              <Download size={20} /> RECEIVE FILES
            </button>
          </div>
        </div>

        {/* Feature Pill Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          marginTop: '60px',
          flexWrap: 'wrap',
          color: 'var(--text-muted)',
          fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--primary)" /> Fast Realtime Transfer
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={18} color="var(--accent-amber)" /> Instant QR Connect
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--success)" /> Auto-Purged Storage
          </div>
        </div>
      </div>
    </div>
  );
}
