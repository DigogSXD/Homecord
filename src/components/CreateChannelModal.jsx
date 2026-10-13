import React, { useState } from 'react';
import { Hash, Volume2, X } from 'lucide-react';

export default function CreateChannelModal({ defaultType, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(defaultType || 'text');
  const [topic, setTopic] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), type, topic: topic.trim() });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3 className="modal-title">Criar Canal</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Tipo de Canal</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${type === 'text' ? 'var(--accent-blurple)' : 'var(--border-subtle)'}`,
                  backgroundColor: type === 'text' ? 'var(--bg-active)' : 'var(--bg-darkest)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => setType('text')}
              >
                <Hash size={20} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Texto</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mensagens e imagens</div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${type === 'voice' ? 'var(--accent-blurple)' : 'var(--border-subtle)'}`,
                  backgroundColor: type === 'voice' ? 'var(--bg-active)' : 'var(--bg-darkest)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => setType('voice')}
              >
                <Volume2 size={20} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Voz</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conversas por áudio</div>
                </div>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Nome do Canal</label>
            <input
              type="text"
              className="custom-input"
              placeholder="ex: bate-papo, gameplay..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {type === 'text' && (
            <div className="input-group">
              <label className="input-label">Tópico do Canal (Opcional)</label>
              <input
                type="text"
                className="custom-input"
                placeholder="ex: Canal sobre games e lives"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Criar Canal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
