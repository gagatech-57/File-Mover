import React from 'react';
import { FolderOutput, Shield, RefreshCw } from 'lucide-react';

export function Navbar({ onReset, sessionStatus, role }) {
  return (
    <header className="navbar">
      <a href="/" onClick={(e) => { e.preventDefault(); if (onReset) onReset(); }} className="brand-logo" style={{ flexShrink: 0 }}>
        <div className="brand-icon">
          <FolderOutput size={22} color="white" />
        </div>
        <span style={{ whiteSpace: 'nowrap' }}>
          File<span className="gradient-text"> Mover</span>
        </span>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
        {sessionStatus && (
          <div className={`status-pill ${sessionStatus === 'CONNECTED' || sessionStatus === 'COMPLETED' ? 'connected' : 'waiting'}`}>
            <span className="pulse-dot"></span>
            <span>
              {sessionStatus === 'CONNECTED' ? 'Connected ✓' : 
               sessionStatus === 'TRANSFERRING' ? 'Moving...' : 
               sessionStatus === 'COMPLETED' ? 'Complete ✓' : 
               'Waiting...'}
            </span>
          </div>
        )}

        <div className="status-pill nav-shield-pill">
          <Shield size={14} color="var(--primary)" />
          <span>No Accounts</span>
        </div>

        {onReset && role && (
          <button className="btn btn-secondary btn-sm" onClick={onReset} title="Exit session" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <RefreshCw size={14} />
            <span>New Session</span>
          </button>
        )}
      </div>
    </header>
  );
}
