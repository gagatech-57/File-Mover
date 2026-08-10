import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Zap } from 'lucide-react';

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0.0 MB/s';
  const mbPerSec = bytesPerSec / (1024 * 1024);
  if (mbPerSec >= 1) return `${mbPerSec.toFixed(1)} MB/s`;
  const kbPerSec = bytesPerSec / 1024;
  return `${kbPerSec.toFixed(0)} KB/s`;
}

export function ProgressBar({ percent = 0, currentFile = '', speed = 0, role = 'SENDER' }) {
  const isSender = role === 'SENDER';

  return (
    <div style={{
      background: '#fffcf8',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      margin: '20px 0',
      boxShadow: '0 8px 25px rgba(255, 87, 34, 0.06)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(255, 87, 34, 0.12)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isSender ? <ArrowUpRight size={22} /> : <ArrowDownLeft size={22} />}
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {isSender ? 'Moving Files...' : 'Receiving Files...'}
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
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#d84315',
            fontFamily: 'var(--font-mono)'
          }}>
            {percent}%
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--warning)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: 'flex-end'
          }}>
            <Zap size={14} color="var(--primary)" /> {formatSpeed(speed)}
          </div>
        </div>
      </div>

      <div className="progress-container" style={{ margin: '12px 0 0 0' }}>
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
