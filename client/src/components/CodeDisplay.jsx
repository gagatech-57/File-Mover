import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CodeDisplay({ codes = [], showToast }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const safeCodes = Array.isArray(codes) ? codes : [];

  const handleCopySingle = (code, index) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    if (showToast) showToast(`Code ${index + 1} copied!`, 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    if (safeCodes.length === 0) return;
    const fullText = safeCodes.join(' ');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    if (showToast) showToast('All verification codes copied!', 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (safeCodes.length === 0) {
    return (
      <div style={{ margin: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Connecting to backend engine...</p>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          3 VERIFICATION CODES
        </span>

        <button className="copy-badge" onClick={handleCopyAll}>
          {copiedAll ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedAll ? 'Copied All' : 'Copy All Codes'}</span>
        </button>
      </div>

      <div className="codes-grid">
        {safeCodes.map((code, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Code {idx + 1}
            </div>

            <div
              className="code-box"
              onClick={() => handleCopySingle(code, idx)}
              title="Click to copy single code"
            >
              {code}
            </div>

            <button
              onClick={() => handleCopySingle(code, idx)}
              style={{
                marginTop: '6px',
                background: 'transparent',
                border: 'none',
                color: copiedIndex === idx ? 'var(--success)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
