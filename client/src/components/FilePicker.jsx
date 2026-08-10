import React, { useRef, useState } from 'react';
import { UploadCloud, File, Trash2, Plus } from 'lucide-react';
import { LIMITS } from '../config/constants.js';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FilePicker({ selectedFiles, setSelectedFiles, showToast }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesAdded = (incomingFiles) => {
    const newFileList = Array.from(incomingFiles);

    // Validate maximum file count
    if (selectedFiles.length + newFileList.length > LIMITS.MAX_FILES) {
      if (showToast) showToast(`Maximum ${LIMITS.MAX_FILES} files allowed per session`, 'error');
      return;
    }

    // Validate maximum size per file
    const oversized = newFileList.find(f => f.size > LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized) {
      if (showToast) showToast(`File ${oversized.name} exceeds ${LIMITS.MAX_FILE_SIZE_MB}MB limit`, 'error');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newFileList]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div>
      <div
        className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFilesAdded(e.target.files);
              e.target.value = '';
            }
          }}
        />

        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <UploadCloud size={32} />
        </div>

        <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
          Drag & Drop Files Here
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
          or click to browse from device (up to 500MB per file)
        </p>

        <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}>
          <Plus size={16} /> Add Files
        </button>
      </div>

      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              FILES READY ({selectedFiles.length})
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
              Total: {formatBytes(totalSize)}
            </span>
          </div>

          <div className="file-list">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="file-item">
                <div className="file-info">
                  <div className="file-icon">
                    <File size={22} />
                  </div>
                  <div>
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{formatBytes(file.size)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Remove file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
