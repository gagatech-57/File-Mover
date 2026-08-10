import React from 'react';
import { Lock, Cpu, Clock, FolderSync } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '30px 20px',
      textAlign: 'center',
      borderTop: '1px solid var(--border)',
      color: 'var(--text-muted)',
      fontSize: '0.875rem',
      background: 'rgba(250, 246, 240, 0.95)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexWrap: 'wrap',
        marginBottom: '12px'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={14} color="var(--primary)" /> Ephemeral Sessions
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="var(--accent-amber)" /> Auto-Purged Files
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <FolderSync size={14} color="var(--primary)" /> Fast File Mover Engine
        </span>
      </div>
      <p>© {new Date().getFullYear()} File Mover — Sender ↔ Receiver Instant File Sharing.</p>
    </footer>
  );
}
