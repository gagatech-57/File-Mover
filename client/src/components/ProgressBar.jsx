import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Zap } from 'lucide-react';

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec === 0) return '0.0 MB/s';
  const mbPerSec = bytesPerSec / (1024 * 1024);
  return `${mbPerSec.toFixed(1)} MB/s`;
}

export function ProgressBar({ percent = 0, currentFile = '', speed = 0, role = 'SENDER' }) {
  const isSender = role === 'SENDER';

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.7)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      margin: '20px 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isSender ? 'rgba(99, 102, 241, 0.2)' : 'rgba(6, 182, 212, 0.2)',
            color: isSender ? 'var(--primary)' : 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isSender ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {isSender ? 'Sending Files...' : 'Receiving Files...'}
            </span>
            {currentFile && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {currentFile}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: isSender ? '#a5b4fc' : '#67e8f9',
            fontFamily: 'var(--font-mono)'
          }}>
            {percent}%
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: 'flex-end'
          }}>
            <Zap size={12} color="var(--warning)" /> {formatSpeed(speed)}
          </div>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
