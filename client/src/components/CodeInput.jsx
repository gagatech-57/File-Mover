import React, { useRef } from 'react';

export function CodeInput({ codes, setCodes, onSubmit, isLoading }) {
  const inputRefs = [useRef(null), useRef(null), useRef(null)];

  const handleChange = (index, value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    const newCodes = [...codes];
    newCodes[index] = numericValue;
    setCodes(newCodes);

    // Auto-focus next input when 6 digits reached
    if (numericValue.length === 6 && index < 2) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Jump to previous box on backspace if current box is empty
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    // Submit on Enter if all fields filled
    if (e.key === 'Enter' && codes.every(c => c.length === 6)) {
      onSubmit();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted.length === 18) {
      // 3 full codes pasted together (e.g. 483921716304259817)
      const c1 = pasted.slice(0, 6);
      const c2 = pasted.slice(6, 12);
      const c3 = pasted.slice(12, 18);
      setCodes([c1, c2, c3]);
      inputRefs[2].current?.focus();
    } else if (pasted.length >= 6) {
      // Paste into current input box
      handleChange(0, pasted.slice(0, 6));
    }
  };

  const isFormValid = codes.every(c => c.length === 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px'
      }}>
        {[0, 1, 2].map((idx) => (
          <div key={idx}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '6px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              Code {idx + 1}
            </label>
            <input
              ref={inputRefs[idx]}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={codes[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="code-input-box"
              disabled={isLoading}
            />
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary btn-lg"
        onClick={onSubmit}
        disabled={!isFormValid || isLoading}
        style={{ width: '100%', marginTop: '10px' }}
      >
        {isLoading ? 'Verifying Codes...' : 'Connect to Session'}
      </button>
    </div>
  );
}
