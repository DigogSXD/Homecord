import React from 'react';

export default function UserList({ users, voiceRooms = {} }) {
  const onlineUsers = users.filter(u => u.status !== 'offline');
  const offlineUsers = users.filter(u => u.status === 'offline');

  const isUserStreaming = (user) => {
    for (const channelId in voiceRooms) {
      const roomMembers = voiceRooms[channelId] || [];
      if (roomMembers.some(m => (m.socketId === user.id || m.user?.id === user.id || m.user?.name === user.name) && m.isStreaming)) {
        return true;
      }
    }
    return false;
  };

  const isUserSpeaking = (user) => {
    for (const channelId in voiceRooms) {
      const roomMembers = voiceRooms[channelId] || [];
      if (roomMembers.some(m => (m.socketId === user.id || m.user?.id === user.id || m.user?.name === user.name) && m.isSpeaking)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="user-sidebar">
      {/* Online Section */}
      <div>
        <div className="user-section-title">
          DISPONÍVEL — {onlineUsers.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
          {onlineUsers.map((user) => {
            const streaming = isUserStreaming(user);
            const speaking = isUserSpeaking(user);
            return (
              <div key={user.id} className="user-item-card" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar-wrapper">
                    <div className={`avatar-img ${speaking ? 'speaking' : ''}`} style={{ backgroundColor: user.color || '#5865F2' }}>
                      {user.avatar || '😎'}
                    </div>
                    <div className={`status-badge status-${user.status || 'online'}`} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="user-display-name" style={{ color: speaking ? 'var(--accent-green)' : 'inherit', fontWeight: speaking ? 'bold' : '700' }}>{user.name}</span>
                    <span style={{ fontSize: '11px', color: speaking ? 'var(--accent-green)' : streaming ? 'var(--neon-red)' : 'var(--text-muted)' }}>
                      {speaking ? 'Falando...' : streaming ? 'Transmitindo Tela' : (user.customStatus || 'Online')}
                    </span>
                  </div>
                </div>

                {streaming && (
                  <span className="live-badge" style={{ marginLeft: 'auto' }}>
                    AO VIVO
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline Section if any */}
      {offlineUsers.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div className="user-section-title">
            OFFLINE — {offlineUsers.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
            {offlineUsers.map((user) => (
              <div key={user.id} className="user-item-card" style={{ opacity: 0.6 }}>
                <div className="avatar-wrapper">
                  <div className="avatar-img" style={{ backgroundColor: '#4e5058' }}>
                    {user.avatar || '👤'}
                  </div>
                  <div className="status-badge status-offline" />
                </div>
                <span className="user-display-name">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
