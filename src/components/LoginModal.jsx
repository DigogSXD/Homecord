import React, { useState } from 'react';
import { Home, Sparkles } from 'lucide-react';

const AVATAR_OPTIONS = ['😎', '🤖', '👾', '🐱', '🦊', '🦁', '🐉', '🚀', '👑', '⚡'];
const COLOR_OPTIONS = ['#00f2fe', '#c084fc', '#00e676', '#ff3b5c', '#f59e0b', '#3b82f6'];

export default function LoginModal({ onJoin }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [color, setColor] = useState('#00f2fe');
  const [customStatus, setCustomStatus] = useState('Conectado no Homecord');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin({ name: name.trim(), avatar, color, customStatus });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            margin: '0 auto 12px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: '0 0 20px var(--neon-cyan-glow)'
          }}>
            🏠
          </div>
          <h2 className="modal-title" style={{ background: 'linear-gradient(90deg, #fff, var(--neon-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bem-vindo ao Homecord!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Seu servidor privado de casa • Chat HD, Voz & Transmissão
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Seu Apelido / Nome</label>
            <input
              type="text"
              className="custom-input"
              placeholder="Ex: Diogo, GamerPro, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Escolha seu Avatar</label>
            <div className="avatar-picker-grid">
              {AVATAR_OPTIONS.map((emoji) => (
                <div
                  key={emoji}
                  className={`avatar-option ${avatar === emoji ? 'selected' : ''}`}
                  onClick={() => setAvatar(emoji)}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Status Personalizado</label>
            <input
              type="text"
              className="custom-input"
              placeholder="Ex: Jogando Valorant, Ouvindo música..."
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              maxLength={40}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '12px' }}>
            Entrar no Homecord 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
