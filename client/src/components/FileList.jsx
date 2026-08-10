import React from 'react';
import { Download, FileCheck, Archive } from 'lucide-react';
import { api } from '../services/api.js';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileList({ sessionId, files }) {
  if (!files || files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const downloadAllUrl = api.getDownloadAllZipUrl(sessionId);

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h4 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={22} color="var(--success)" />
            <span>TRANSFER COMPLETE</span>
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {files.length} file{files.length > 1 ? 's' : ''} received • Total: {formatBytes(totalSize)}
          </p>
        </div>

        {files.length > 1 && (
          <a
            href={downloadAllUrl}
            download
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <Archive size={16} /> Download All (ZIP)
          </a>
        )}
      </div>

      <div className="file-list">
        {files.map((file) => {
          const downloadUrl = api.getDownloadSingleUrl(sessionId, file.id);
          return (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <div className="file-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                  <Download size={20} />
                </div>
                <div>
                  <div className="file-name">{file.originalName || file.name}</div>
                  <div className="file-size">{formatBytes(file.size)}</div>
                </div>
              </div>

              <a
                href={downloadUrl}
                download
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                <Download size={14} /> Download
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
