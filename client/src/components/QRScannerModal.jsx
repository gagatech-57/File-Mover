import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

export function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scanError, setScanError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let scanner = null;

    try {
      scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Successfully scanned QR code text
          console.log('[QR Scanner] Decoded text:', decodedText);

          let token = decodedText;
          // If URL decoded, extract qrToken query parameter
          try {
            const urlObj = new URL(decodedText);
            const tokenParam = urlObj.searchParams.get('qrToken');
            if (tokenParam) token = tokenParam;
          } catch (e) {
            // Raw token string scanned
          }

          if (scanner) {
            scanner.clear().catch(console.error);
          }
          onScanSuccess(token);
        },
        (errorMessage) => {
          // Normal frame scanning error, ignore
        }
      );

      scannerRef.current = scanner;
    } catch (err) {
      console.error('[QR Scanner] Error initializing camera scanner:', err);
      setScanError('Unable to access camera. Please ensure camera permissions are allowed or use 3-Code verification.');
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '450px',
        width: '100%',
        padding: '30px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Camera size={24} color="var(--primary)" />
          <h3 style={{ fontSize: '1.3rem' }}>Scan Sender's QR Code</h3>
        </div>

        {scanError ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--danger)'
          }}>
            <AlertCircle size={32} style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '0.9rem' }}>{scanError}</p>
          </div>
        ) : (
          <div>
            <div id="qr-reader-container" style={{ borderRadius: '12px', overflow: 'hidden' }}></div>
            <p style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginTop: '16px'
            }}>
              Point your camera at the QR code shown on the Sender screen.
            </p>
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={onClose}
          style={{ width: '100%', marginTop: '20px' }}
        >
          Close Scanner
        </button>
      </div>
    </div>
  );
}
