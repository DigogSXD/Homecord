import React, { useState, useRef, useEffect } from 'react';
import { Hash, Send, Paperclip, Smile, Trash2, Image as ImageIcon, Volume2, VolumeX, Mic, MicOff, PhoneOff, Monitor, MonitorOff, Camera, Maximize2, ZoomIn, RotateCcw, LayoutGrid } from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '💩', '😎', '💀', '👀', '🎮'];

// Sub-component for individual Stream Video Player with Zoom, Pan, Fullscreen & Stream Header
function StreamVideoPlayer({
  streamObj,
  isMultiView = false,
  onFocusStream,
  volume = 100,
  isMuted = false,
  onVolumeChange,
  onToggleMute
}) {
  const videoRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = streamObj?.stream || null;
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
    }

  }, [streamObj?.stream]);

  const handleWheel = (e) => {
    if (!streamObj?.stream) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoomScale(prevScale => {
      const newScale = Math.min(Math.max(1, prevScale * zoomFactor), 5);
      if (newScale === 1) setPanPos({ x: 0, y: 0 });
      return newScale;
    });
  };

  const handleMouseDown = (e) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - panPos.x, y: e.clientY - panPos.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomScale > 1) {
      setPanPos({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanPos({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
        else if (videoRef.current.webkitRequestFullscreen) videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  return (
    <div
      style={{
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'var(--shadow-popup)',
        height: isMultiView ? '320px' : '520px',
        maxHeight: isMultiView ? '360px' : '520px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-subtle)',
        userSelect: 'none',
        flex: 1
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {streamObj?.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onDoubleClick={handleToggleFullscreen}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${zoomScale}) translate(${panPos.x / zoomScale}px, ${panPos.y / zoomScale}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        />
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
          <Monitor size={36} style={{ marginBottom: '8px', opacity: 0.6 }} />
          <p style={{ fontSize: '13px' }}>Conectando transmissão de {streamObj?.name}...</p>
        </div>
      )}

      {/* Stream Title Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.75)',
        padding: '5px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        zIndex: 2
      }}>
        {streamObj?.isCamera ? <Camera size={14} style={{ color: 'var(--accent-green)' }} /> : <Monitor size={14} style={{ color: 'var(--accent-green)' }} />}
        <span>{streamObj?.name}</span>
        <span className="live-badge">AO VIVO</span>
        <span style={{ background: 'rgba(0, 242, 254, 0.2)', color: 'var(--neon-cyan)', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-neon)' }}>
          1080p 60FPS
        </span>
      </div>

      {/* Action Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 2
      }}>
        {/* Stream Audio Controls & Indicators */}
        {streamObj?.isLocal ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            backdropFilter: 'blur(4px)'
          }}>
            {streamObj.hasAudio ? (
              <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                <Volume2 size={13} /> Áudio Ativo
              </span>
            ) : (
              <span title="Para transmitir o som da tela, marque 'Compartilhar áudio do sistema' ao iniciar o streaming" style={{ color: '#ffa500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <VolumeX size={13} /> Sem Som da Tela
              </span>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '3px 8px',
            backdropFilter: 'blur(4px)'
          }}>
            {streamObj?.hasAudio !== false ? (
              <>
                <button
                  type="button"
                  onClick={onToggleMute}
                  title={isMuted ? "Desmutar som da transmissão" : "Mutar som da transmissão"}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isMuted ? 'var(--neon-red)' : 'var(--neon-cyan)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange && onVolumeChange(Number(e.target.value))}
                  style={{
                    width: '65px',
                    accentColor: 'var(--neon-cyan)',
                    cursor: 'pointer'
                  }}
                  title={`Volume da transmissão: ${isMuted ? 'Mudo' : `${volume}%`}`}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '26px' }}>
                  {isMuted ? '0%' : `${volume}%`}
                </span>
              </>
            ) : (
              <span
                title="Esta transmissão não possui áudio capturado"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px' }}
              >
                <VolumeX size={13} /> Sem áudio
              </span>
            )}
          </div>
        )}
        {isMultiView && onFocusStream && (
          <button
            onClick={() => onFocusStream(streamObj.id)}
            style={{
              background: 'rgba(0,0,0,0.75)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--neon-cyan)',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Expandir esta tela para foco único"
          >
            <Maximize2 size={12} />
            Focar
          </button>
        )}

        {zoomScale > 1 && (
          <button
            onClick={handleResetZoom}
            style={{
              background: 'var(--accent-blurple)',
              border: 'none',
              color: '#fff',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}

        <button
          onClick={handleToggleFullscreen}
          title="Tela Inteira"
          style={{
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '5px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ParticipantCamera({ stream }) {
  const videoRef = useRef(null);
  const [size, setSize] = useState(180);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div style={{ position: 'relative', width: `${size}px`, flexShrink: 0 }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          display: 'block',
          width: '100%',
          height: `${Math.round(size * 0.62)}px`,
          objectFit: 'cover',
          borderRadius: '6px',
          border: '1px solid var(--border-neon)',
          background: '#000'
        }}
      />
      <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '3px' }}>
        <button
          type="button"
          title="Diminuir webcam"
          onClick={() => setSize(value => Math.max(120, value - 20))}
          style={{ padding: '1px 5px', border: 'none', borderRadius: '3px', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer' }}
        >
          −
        </button>
        <button
          type="button"
          title="Aumentar webcam"
          onClick={() => setSize(value => Math.min(320, value + 20))}
          style={{ padding: '1px 5px', border: 'none', borderRadius: '3px', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function ChatArea({
  channel,
  messages,
  onSendMessage,
  onDeleteMessage,
  currentUser,
  typingUsers,
  onTyping,
  // Voice & Screen Share props
  activeVoiceChannel,
  voiceRooms,
  ping,
  onJoinVoiceChannel,
  onLeaveVoice,
  isMuted,
  onToggleMute,
  isScreenSharing,
  onToggleScreenShare,
  screenStream,
  isCameraOn,
  cameraStream,
  remoteScreenStreams = {},
  screenAudioVolumes = {},
  screenAudioMutes = {},
  onScreenAudioVolumeChange,
  onToggleScreenAudioMute
}) {
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeStreamTab, setActiveStreamTab] = useState('all');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Build array of available active streams in current voice channel
  const members = voiceRooms[channel?.id] || [];
  const availableStreams = [];

  // 1. Local stream if local user is sharing
  if (isScreenSharing && screenStream) {
    const hasAudio = screenStream.getAudioTracks().length > 0;
    availableStreams.push({
      id: 'local',
      socketId: currentUser?.id,
      name: `${currentUser?.name || 'Você'} (Sua Tela)`,
      stream: screenStream,
      isLocal: true,
      hasAudio
    });
  }

  // 2. Remote streams from other members
  members.forEach((m) => {
    if ((m.isStreaming || m.isCameraOn) && m.user) {
      const remoteStreams = remoteScreenStreams[m.socketId] || {};
      if (m.user?.name !== currentUser?.name) {
        if (m.isStreaming && (remoteStreams[m.screenStreamId] || remoteStreams[m.screenTrackId] || remoteStreams.screenStream)) {
          const st = remoteStreams[m.screenStreamId] || remoteStreams[m.screenTrackId] || remoteStreams.screenStream;
          const hasAudio = st ? st.getAudioTracks().length > 0 : !!m.hasAudio;
          availableStreams.push({
            id: `${m.socketId}-screen`,
            socketId: m.socketId,
            name: `Transmissão de ${m.user.name}`,
            stream: st,
            isLocal: false,
            hasAudio
          });
        }
      }
    }
  });

  // Adjust default tab when streams list updates
  useEffect(() => {
    if (availableStreams.length === 1) {
      setActiveStreamTab(availableStreams[0].id);
    } else if (availableStreams.length > 1 && !availableStreams.some(s => s.id === activeStreamTab) && activeStreamTab !== 'all') {
      setActiveStreamTab('all');
    }
  }, [availableStreams.length]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (channel?.type === 'text') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, channel]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    onSendMessage({
      channelId: channel.id,
      content: inputText.trim(),
      attachment
    });

    setInputText('');
    setAttachment(null);
    setShowEmojiPicker(false);
    onTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e);
    } else {
      onTyping(true);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Selecione uma imagem de até 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        data: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const activeTypingList = (typingUsers[channel?.id] || []).filter(u => u.id !== currentUser?.id);

  if (!channel) {
    return (
      <div className="main-chat" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Selecione um canal para começar!</p>
      </div>
    );
  }

  // --- VOICE CHANNEL VIEW ---
  if (channel.type === 'voice') {
    const isConnectedToThisVoice = activeVoiceChannel?.id === channel.id;

    return (
      <div className="main-chat">
        {/* Voice Room Body */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          {/* Multi-Stream Video Player Section */}
          {(availableStreams.length > 0 || members.some(member => member.isCameraOn) || (isCameraOn && cameraStream)) && (
            <>
              {availableStreams.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Tab Selector Bar */}
              <div className="stream-selector-bar">
                <span className="stream-selector-label">
                  📺 {availableStreams.length === 1 ? 'Transmissão Ao Vivo' : `Transmissões Simultâneas (${availableStreams.length})`}:
                </span>

                <div className="stream-tabs-group">
                  {availableStreams.map((st) => (
                    <button
                      key={st.id}
                      className={`stream-tab-btn ${activeStreamTab === st.id ? 'active' : ''}`}
                      onClick={() => setActiveStreamTab(st.id)}
                    >
                      <Monitor size={14} />
                      <span>{st.name}</span>
                      <span className="live-badge-sm">LIVE</span>
                    </button>
                  ))}

                  {availableStreams.length > 1 && (
                    <button
                      className={`stream-tab-btn ${activeStreamTab === 'all' ? 'active-grid' : ''}`}
                      onClick={() => setActiveStreamTab('all')}
                    >
                      <LayoutGrid size={14} />
                      <span>Assistir Ambas (Lado a Lado)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Video Players View Modes */}
              {activeStreamTab === 'all' && availableStreams.length > 1 ? (
                /* Multi-View Grid (Side-by-Side Split View) */
                <div className="multi-stream-grid">
                  {availableStreams.map((st) => (
                    <StreamVideoPlayer
                      key={st.id}
                      streamObj={st}
                      isMultiView={true}
                      onFocusStream={(id) => setActiveStreamTab(id)}
                      volume={st.socketId ? (screenAudioVolumes[st.socketId] ?? 100) : 100}
                      isMuted={st.socketId ? !!screenAudioMutes[st.socketId] : false}
                      onVolumeChange={(vol) => st.socketId && onScreenAudioVolumeChange && onScreenAudioVolumeChange(st.socketId, vol)}
                      onToggleMute={() => st.socketId && onToggleScreenAudioMute && onToggleScreenAudioMute(st.socketId)}
                    />
                  ))}
                </div>
              ) : (
                /* Single Stream Focus View */
                (() => {
                  const focusedStream = availableStreams.find(s => s.id === activeStreamTab) || availableStreams[0];
                  return (
                    <StreamVideoPlayer
                      key={focusedStream?.id || 'single'}
                      streamObj={focusedStream}
                      isMultiView={false}
                      volume={focusedStream?.socketId ? (screenAudioVolumes[focusedStream.socketId] ?? 100) : 100}
                      isMuted={focusedStream?.socketId ? !!screenAudioMutes[focusedStream.socketId] : false}
                      onVolumeChange={(vol) => focusedStream?.socketId && onScreenAudioVolumeChange && onScreenAudioVolumeChange(focusedStream.socketId, vol)}
                      onToggleMute={() => focusedStream?.socketId && onToggleScreenAudioMute && onToggleScreenAudioMute(focusedStream.socketId)}
                    />
                  );
                })()
              )}
              </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {members.map((member) => {
                const participantCamera = member.user?.name === currentUser?.name
                  ? (isCameraOn ? cameraStream : null)
                  : (
                    remoteScreenStreams[member.socketId]?.[member.cameraStreamId] ||
                    remoteScreenStreams[member.socketId]?.[member.cameraTrackId] ||
                    remoteScreenStreams[member.socketId]?.cameraStream ||
                    (member.isCameraOn && !member.isStreaming
                      ? Object.values(remoteScreenStreams[member.socketId] || {})[0]
                      : null)
                  );

                return (
                <div key={member.socketId} className="user-item-card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: participantCamera ? 'center' : 'flex-start',
                  gap: '10px',
                  padding: participantCamera ? '8px' : undefined
                }}>
                  {participantCamera ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                      <ParticipantCamera stream={participantCamera} />
                      {(member.isStreaming || (member.user?.name === currentUser?.name && isScreenSharing)) && (
                        <span className="live-badge">Transmitindo tela</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={`avatar-img ${member.isSpeaking ? 'speaking' : ''}`} style={{ backgroundColor: member.user?.color || '#5865F2' }}>
                        {member.user?.avatar || '👤'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span className="user-display-name">{member.user?.name}</span>
                        <span style={{ fontSize: '11px', color: member.isMuted ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                          {member.isMuted ? 'Mudo' : member.isStreaming ? 'Transmitindo tela' : member.isCameraOn ? 'Webcam ao vivo' : 'Conectado'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                );
              })}
              </div>
            </>
          )}

          {/* Main Action Bar for Voice Channel */}
          <div style={{
            marginTop: 'auto',
            background: 'var(--bg-darker)',
            padding: '16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-header)' }}>
                {channel.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {isConnectedToThisVoice ? 'Você está conectado neste canal de voz' : 'Clique no botão ao lado para entrar'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {!isConnectedToThisVoice ? (
                <button className="btn-primary" onClick={() => onJoinVoiceChannel(channel)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={18} />
                  Entrar na Voz
                </button>
              ) : (
                <>
                  <button
                    className={`btn-secondary ${isMuted ? 'active-danger' : ''}`}
                    onClick={onToggleMute}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    {isMuted ? 'Desativar Mudo' : 'Mudar Microfone'}
                  </button>

                  <button
                    className={`btn-secondary ${isScreenSharing ? 'active-success' : ''}`}
                    onClick={onToggleScreenShare}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isScreenSharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
                    {isScreenSharing ? 'Parar Tela' : 'Compartilhar Tela'}
                  </button>

                  <button className="btn-primary" onClick={onLeaveVoice} style={{ backgroundColor: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PhoneOff size={16} />
                    Desconectar
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- TEXT CHANNEL VIEW ---
  return (
    <div className="main-chat">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <Hash size={24} style={{ color: 'var(--text-muted)' }} />
          <span>{channel.name}</span>
          {channel.topic && (
            <span className="chat-header-topic">{channel.topic}</span>
          )}
        </div>

      </div>

      {/* Messages */}
      <div className="messages-container">
        {/* Welcome Banner */}
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <Hash size={40} style={{ color: 'var(--text-header)' }} />
          </div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-header)', fontWeight: 'bold' }}>
            Bem-vindo ao #{channel.name}!
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Este é o início do canal #{channel.name}.
          </p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className="message-card">
            <div className="message-avatar" style={{ backgroundColor: msg.sender?.color || '#5865F2' }}>
              {msg.sender?.avatar || '👤'}
            </div>

            <div className="message-content-wrapper">
              <div className="message-author-header">
                <span className="message-author-name">{msg.sender?.name || 'Amigo'}</span>
                {msg.sender?.bot && <span className="bot-tag">BOT</span>}
                <span className="message-timestamp">{msg.timestamp}</span>
              </div>

              {msg.content && <div className="message-text">{msg.content}</div>}

              {msg.attachment && (
                <div>
                  <img
                    src={msg.attachment.data}
                    alt={msg.attachment.name}
                    className="message-attachment-img"
                  />
                </div>
              )}
            </div>

            {/* Hover Actions */}
            {(msg.sender?.id === currentUser?.id || currentUser?.id) && (
              <div className="message-actions-hover">
                <button
                  className="icon-btn"
                  title="Excluir mensagem"
                  onClick={() => onDeleteMessage(msg.id, channel.id)}
                >
                  <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
                </button>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="chat-input-wrapper">
        {/* Typing indicator */}
        {activeTypingList.length > 0 && (
          <div className="typing-indicator">
            <strong>{activeTypingList.map(u => u.name).join(', ')}</strong> {activeTypingList.length === 1 ? 'está' : 'estão'} digitando...
          </div>
        )}

        {/* Attachment Preview */}
        {attachment && (
          <div style={{
            background: 'var(--bg-darker)',
            padding: '8px 12px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <ImageIcon size={20} style={{ color: 'var(--accent-blurple)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-normal)' }}>{attachment.name}</span>
            <button
              onClick={() => setAttachment(null)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', marginLeft: 'auto' }}
            >
              Remover
            </button>
          </div>
        )}

        {/* Emoji Quick Bar */}
        {showEmojiPicker && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            right: '20px',
            background: 'var(--bg-darker)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            gap: '6px',
            boxShadow: 'var(--shadow-popup)',
            border: '1px solid var(--border-subtle)',
            zIndex: 10
          }}>
            {QUICK_EMOJIS.map((emoji) => (
              <span
                key={emoji}
                style={{ fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                onClick={() => {
                  setInputText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="chat-input-box">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            className="icon-btn"
            title="Enviar foto / imagem"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>

          <input
            type="text"
            className="chat-input-field"
            placeholder={`Conversar em #${channel.name}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="button"
            className="icon-btn"
            title="Emojis"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={20} />
          </button>

          <button type="submit" className="icon-btn" title="Enviar" style={{ color: 'var(--accent-blurple)' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
