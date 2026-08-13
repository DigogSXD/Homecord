import React from 'react';
import { Mic, MicOff, Headphones, PhoneOff, Settings, Signal, Monitor, MonitorOff, Users } from 'lucide-react';

export default function VoiceBar({
  currentUser,
  activeVoiceChannel,
  voiceRooms,
  ping,
  isMuted,
  isDeafened,
  isSpeaking,
  isScreenSharing,
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onLeaveVoice,
  onOpenSettings
}) {
  const memberCount = activeVoiceChannel ? (voiceRooms[activeVoiceChannel.id]?.length || 1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Active Voice Connection Bar */}
      {activeVoiceChannel && (
        <div className="voice-connected-bar">
          <div className="voice-status-top">
            <div className="voice-status-info">
              <Signal size={16} style={{ color: 'var(--accent-green)' }} />
              <span>Voz Conectada / <span style={{ fontWeight: 'normal', color: 'var(--accent-green)' }}>{ping || 12}ms</span></span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                className={`icon-btn ${isScreenSharing ? 'active-success' : ''}`}
                style={{ width: '26px', height: '26px' }}
                title={isScreenSharing ? 'Parar Compartilhamento de Tela' : 'Compartilhar Tela'}
                onClick={onToggleScreenShare}
              >
                {isScreenSharing ? <MonitorOff size={15} /> : <Monitor size={15} />}
              </button>
              <button className="disconnect-voice-btn" title="Desconectar da Voz" onClick={onLeaveVoice}>
                <PhoneOff size={16} />
              </button>
            </div>
          </div>

          <div className="voice-channel-name-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <span>{activeVoiceChannel.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
              <Users size={12} /> {memberCount} {memberCount === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>
        </div>
      )}

      {/* User Bar */}
      <div className="user-control-bar">
        <div className="user-info-brief" onClick={onOpenSettings} title="Editar Perfil">
          <div className="avatar-wrapper">
            <div className={`avatar-img ${isSpeaking ? 'speaking' : ''}`} style={{ backgroundColor: currentUser?.color || '#5865F2' }}>
              {currentUser?.avatar || '😎'}
            </div>
            <div className={`status-badge status-${currentUser?.status || 'online'}`} />
          </div>
          <div className="user-name-box">
            <span className="user-display-name">{currentUser?.name || 'Usuário'}</span>
            <span className="user-sub-status">{currentUser?.customStatus || 'Online'}</span>
          </div>
        </div>

        <div className="user-controls-btns">
          <button
            className={`icon-btn ${isMuted ? 'active-danger' : ''}`}
            title={isMuted ? 'Desativar Mudo' : 'Ativar Mudo'}
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            className={`icon-btn ${isDeafened ? 'active-danger' : ''}`}
            title={isDeafened ? 'Ativar Áudio' : 'Desativar Áudio'}
            onClick={onToggleDeafen}
          >
            <Headphones size={18} />
          </button>

          <button className="icon-btn" title="Configurações" onClick={onOpenSettings}>
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
