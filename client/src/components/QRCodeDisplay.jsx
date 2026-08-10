import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, Copy, Check, QrCode } from 'lucide-react';

export function QRCodeDisplay({ qrToken, onRegenerateQR, showToast }) {
  const canvasRef = useRef(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Construct direct share URL containing qrToken parameter
  const shareUrl = `${window.location.origin}/?qrToken=${qrToken}`;

  useEffect(() => {
    if (canvasRef.current && qrToken) {
      QRCode.toCanvas(
        canvasRef.current,
        shareUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR Generation error:', error);
        }
      );
    }
  }, [qrToken, shareUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    if (showToast) showToast('Direct QR Share link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerate = async () => {
    if (onRegenerateQR) {
      setIsRegenerating(true);
      await onRegenerateQR();
      setIsRegenerating(false);
    }
  };

  return (
    <div style={{
      textAlign: 'center',
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      margin: '20px 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: '16px',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}>
        <QrCode size={16} color="var(--primary)" />
        <span>Scan QR Code to Connect</span>
      </div>

      <div className="qr-wrapper">
        <canvas ref={canvasRef} />
      </div>

      <div style={{
        marginTop: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
          {copiedLink ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
        </button>

        <button className="btn btn-secondary btn-sm" onClick={handleRegenerate} disabled={isRegenerating}>
          <RefreshCw size={14} className={isRegenerating ? 'spin' : ''} />
          <span>Regenerate QR</span>
        </button>
      </div>
    </div>
  );
}
