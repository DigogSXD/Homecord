import React, { useState } from 'react';
import { Hash, Volume2, VolumeX, Plus, Trash2, Mic, MicOff } from 'lucide-react';

export default function ChannelList({
  channels,
  activeChannel,
  onSelectChannel,
  onOpenCreateChannel,
  onDeleteChannel,
  activeVoiceChannel,
  voiceRooms,
  onJoinVoiceChannel,
  onOpenMemberMenu,
  userVolumes = {},
  userMutes = {},
  onVolumeChange,
  onToggleLocalMute,
  onMoveMemberChannel
}) {
  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  const [dragOverChannelId, setDragOverChannelId] = useState(null);
  const [expandedVolumeMemberId, setExpandedVolumeMemberId] = useState(null);

  return (
    <div className="channel-sidebar">
      {/* Server Header */}
      <div className="server-header">
        <div className="server-header-title">
          <span>🏠 Homecord</span>
        </div>
      </div>

      {/* Text Channels List */}
      <div className="channel-section">
        <div className="channel-section-header">
          <span>CANAIS DE TEXTO</span>
          <button
            className="icon-btn"
            title="Criar Canal de Texto"
            onClick={() => onOpenCreateChannel('text')}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="channel-list">
          {textChannels.map((c) => {
            const isActive = activeChannel?.id === c.id;
            return (
              <div
                key={c.id}
                className={`channel-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectChannel(c)}
              >
                <div className="channel-item-left">
                  <Hash size={18} />
                  <span>{c.name}</span>
                </div>

                {channels.length > 1 && (
                  <button
                    className="icon-btn"
                    style={{ width: '20px', height: '20px', padding: 0 }}
                    title="Excluir canal"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannel(c.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice Channels List */}
      <div className="channel-section" style={{ marginTop: '16px' }}>
        <div className="channel-section-header">
          <span>CANAIS DE VOZ</span>
          <button
            className="icon-btn"
            title="Criar Canal de Voz"
            onClick={() => onOpenCreateChannel('voice')}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="channel-list">
          {voiceChannels.map((c) => {
            const isSelected = activeChannel?.id === c.id;
            const isConnected = activeVoiceChannel?.id === c.id;
            const members = voiceRooms[c.id] || [];
            const isDragTarget = dragOverChannelId === c.id;

            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  className={`channel-item voice ${isSelected || isConnected ? 'active' : ''}`}
                  style={{
                    border: isDragTarget ? '2px dashed var(--neon-cyan)' : 'none',
                    backgroundColor: isDragTarget ? 'rgba(0, 242, 254, 0.15)' : undefined,
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    onSelectChannel(c);
                    onJoinVoiceChannel(c);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverChannelId !== c.id) setDragOverChannelId(c.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (dragOverChannelId === c.id) setDragOverChannelId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverChannelId(null);
                    try {
                      const dataStr = e.dataTransfer.getData('application/json');
                      if (dataStr) {
                        const data = JSON.parse(dataStr);
                        if (data && data.socketId && onMoveMemberChannel) {
                          onMoveMemberChannel(data.socketId, c.id);
                        }
                      }
                    } catch (err) {}
                  }}
                >
                  <div className="channel-item-left">
                    <Volume2 size={18} style={{ color: isConnected ? 'var(--accent-green)' : 'inherit' }} />
                    <span>{c.name}</span>
                  </div>

                  {channels.length > 1 && (
                    <button
                      className="icon-btn"
                      style={{ width: '20px', height: '20px', padding: 0 }}
                      title="Excluir canal"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChannel(c.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Users inside this voice channel */}
                {members.length > 0 && (
                  <div className="voice-members-list">
                    {members.map((member) => (
                      <div key={member.socketId} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                          className="voice-member-item"
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          draggable="true"
                          title="Arraste para mover de canal ou clique para ajustar volume"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              socketId: member.socketId,
                              fromChannelId: c.id
                            }));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVolumeMemberId(prev => prev === member.socketId ? null : member.socketId);
                          }}
                        >
                          <div className={`voice-member-avatar ${member.isSpeaking ? 'speaking' : ''}`}>
                            {member.user?.avatar || '👤'}
                          </div>
                          <span style={{ fontWeight: member.isSpeaking ? 'bold' : 'normal', color: member.isSpeaking ? 'var(--accent-green)' : 'inherit' }}>
                            {member.user?.name}
                          </span>
                          {member.isStreaming && (
                            <span className="live-badge" style={{ marginLeft: '4px' }}>
                              AO VIVO
                            </span>
                          )}
                          {member.isMuted && <MicOff size={12} style={{ color: 'var(--accent-red)', marginLeft: 'auto' }} />}
                          {member.isDeafened && <VolumeX size={12} style={{ color: 'var(--accent-red)', marginLeft: member.isMuted ? '4px' : 'auto' }} />}
                        </div>

                        {/* Inline Volume Slider Popover right under the member card */}
                        {expandedVolumeMemberId === member.socketId && (
                          <div
                            className="inline-user-volume-box"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '8px 10px',
                              background: 'var(--bg-darker)',
                              borderRadius: '8px',
                              marginTop: '3px',
                              marginBottom: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              border: '1px solid var(--border-neon)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                              animation: 'fadeIn 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Volume2 size={12} style={{ color: 'var(--neon-cyan)' }} /> Volume:
                              </span>
                              <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                                {userMutes[member.socketId] ? 'MUDO' : `${userVolumes[member.socketId] ?? 100}%`}
                              </span>
                            </div>

                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={userMutes[member.socketId] ? 0 : (userVolumes[member.socketId] ?? 100)}
                              onChange={(e) => onVolumeChange && onVolumeChange(member.socketId, Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--neon-cyan)', cursor: 'pointer', height: '4px' }}
                            />

                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                              <button
                                className="btn-secondary"
                                style={{ flex: 1, padding: '3px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                onClick={() => onToggleLocalMute && onToggleLocalMute(member.socketId)}
                              >
                                {userMutes[member.socketId] ? <Volume2 size={11} /> : <VolumeX size={11} />}
                                {userMutes[member.socketId] ? 'Desmutar' : 'Mutar'}
                              </button>

                              <button
                                className="btn-secondary"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                title="Opções de moderação"
                                onClick={() => onOpenMemberMenu && onOpenMemberMenu(member, c)}
                              >
                                ⚙️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
