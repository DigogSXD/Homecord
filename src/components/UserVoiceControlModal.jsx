import React from 'react';
import { X, Volume2, VolumeX, MicOff, MoveRight, Monitor, Shield } from 'lucide-react';

export default function UserVoiceControlModal({
  member,
  currentChannel,
  voiceChannels = [],
  currentUser,
  volume = 100,
  isLocallyMuted = false,
  onVolumeChange,
  onToggleLocalMute,
  onForceMuteMic,
  onMoveChannel,
  onWatchStream,
  onClose
}) {
  if (!member) return null;

  const isSelf = member.user?.id === currentUser?.id || member.socketId === currentUser?.id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ width: '420px', gap: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: member.user?.color || '#5865F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              border: member.isStreaming ? '2px solid var(--neon-red)' : '1px solid var(--border-subtle)'
            }}>
              {member.user?.avatar || '👤'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="modal-title" style={{ fontSize: '18px' }}>{member.user?.name}</span>
                {member.isStreaming && <span className="live-badge">AO VIVO</span>}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--accent-green)' }}>
                🔊 Conectado em {currentChannel?.name || 'Voz'}
              </span>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Section 1: User Audio Control (Volume & Local Mute) */}
        {!isSelf && (
          <div style={{ background: 'var(--bg-darkest)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-subtle)' }}>
            <div className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={15} style={{ color: 'var(--neon-cyan)' }} /> Volume do Usuário para Você
              </span>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{isLocallyMuted ? 'MUDO (0%)' : `${volume}%`}</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={isLocallyMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--neon-cyan)',
                cursor: 'pointer'
              }}
            />

            <button
              className={`btn-secondary ${isLocallyMuted ? 'active-danger' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px' }}
              onClick={onToggleLocalMute}
            >
              {isLocallyMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {isLocallyMuted ? 'Desmutar Usuário para Mim' : 'Mutar Usuário para Mim'}
            </button>
          </div>
        )}

        {/* Section 2: Server Moderation (Mute Mic & Move Channel) */}
        <div style={{ background: 'var(--bg-darkest)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-subtle)' }}>
          <div className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={15} style={{ color: 'var(--neon-purple)' }} /> Ações do Canal de Voz
          </div>

          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 12px', fontSize: '13px', color: 'var(--neon-red)', borderColor: 'rgba(255, 59, 92, 0.3)' }}
            onClick={onForceMuteMic}
          >
            <MicOff size={16} />
            Mutar Microfone de {member.user?.name}
          </button>

          {/* Move to another voice channel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mover {member.user?.name} para outro canal:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {voiceChannels
                .filter(vc => vc.id !== currentChannel?.id)
                .map(vc => (
                  <button
                    key={vc.id}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => onMoveChannel(vc.id)}
                  >
                    <MoveRight size={12} style={{ color: 'var(--neon-cyan)' }} />
                    {vc.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Section 3: Watch Stream if Streaming */}
        {member.isStreaming && (
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', background: 'linear-gradient(135deg, var(--neon-red), #e11d48)', color: '#fff' }}
            onClick={() => {
              onWatchStream();
              onClose();
            }}
          >
            <Monitor size={18} />
            Assistir Transmissão Ao Vivo
          </button>
        )}
      </div>
    </div>
  );
}
