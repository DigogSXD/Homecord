import React, { useState, useEffect, useRef } from 'react';
import { X, Check, LogOut, Mic, Volume2, ShieldCheck, User, Settings2, Keyboard } from 'lucide-react';

const AVATARS = ['😎', '🤖', '👾', '🐱', '🦊', '🦁', '🐉', '🚀', '👑', '⚡'];
const COLORS = ['#5865F2', '#23A55A', '#F23F43', '#F0B232', '#EB459E', '#9B59B6'];

export default function UserProfileModal({
  currentUser,
  onClose,
  onUpdateProfile,
  onLogout,
  audioInputDevices = [],
  audioOutputDevices = [],
  selectedAudioInput = '',
  selectedAudioOutput = '',
  micVolume = 100,
  noiseSuppressionEnabled = true,
  gateThreshold = 28,
  muteHotkey = 'm',
  onSelectAudioInput,
  onSelectAudioOutput,
  onMicVolumeChange,
  onToggleNoiseSuppression,
  onGateThresholdChange,
  onUpdateMuteHotkey
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'voice'

  // User Profile State
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '😎');
  const [color, setColor] = useState(currentUser?.color || '#5865F2');
  const [customStatus, setCustomStatus] = useState(currentUser?.customStatus || '');

  // Keybind Recorder State
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);

  useEffect(() => {
    if (!isRecordingHotkey) return;

    const handleRecordKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      let keyDisplay = e.key;
      if (keyDisplay === ' ') keyDisplay = 'Espaço';
      if (onUpdateMuteHotkey) onUpdateMuteHotkey(keyDisplay);
      setIsRecordingHotkey(false);
    };

    window.addEventListener('keydown', handleRecordKey, { capture: true });
    return () => window.removeEventListener('keydown', handleRecordKey, { capture: true });
  }, [isRecordingHotkey, onUpdateMuteHotkey]);

  // Mic Test State
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);
  const [speechStatus, setSpeechStatus] = useState('SILENCE'); // 'SILENCE' | 'VOICE' | 'NOISE_BLOCKED'
  const testStreamRef = useRef(null);
  const testAudioRef = useRef(null);
  const animFrameRef = useRef(null);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateProfile({ name: name.trim(), avatar, color, customStatus });
    onClose();
  };

  // Toggle Live Mic Test
  const toggleMicTest = async () => {
    if (isTestingMic) {
      stopMicTest();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
          video: false
        });
        testStreamRef.current = stream;
        setIsTestingMic(true);

        // Audio playback loopback so user can hear their own voice during test
        const audioEl = new Audio();
        audioEl.srcObject = stream;
        audioEl.autoplay = true;
        if (selectedAudioOutput && typeof audioEl.setSinkId === 'function') {
          try {
            await audioEl.setSinkId(selectedAudioOutput);
          } catch (e) {}
        }
        testAudioRef.current = audioEl;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          analyser.getByteFrequencyData(buffer);
          let vocalSum = 0;
          for (let i = 3; i <= 25; i++) {
            vocalSum += buffer[i];
          }
          const vocalAvg = vocalSum / 23;

          let highFreqSum = 0;
          for (let i = 35; i <= 110; i++) {
            highFreqSum += buffer[i];
          }
          const highFreqAvg = highFreqSum / 76;

          const isVoice = (vocalAvg > gateThreshold) && (vocalAvg > highFreqAvg * 1.25);
          const isNoise = (vocalAvg > 10 || highFreqAvg > 10) && !isVoice;

          if (isVoice) {
            setSpeechStatus('VOICE');
            setMicTestLevel(Math.min(100, Math.round((vocalAvg / 128) * 100)));
          } else if (isNoise) {
            setSpeechStatus('NOISE_BLOCKED');
            setMicTestLevel(0);
          } else {
            setSpeechStatus('SILENCE');
            setMicTestLevel(0);
          }

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err) {
        alert('Não foi possível acessar o microfone para teste.');
      }
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.srcObject = null;
      testAudioRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach(t => t.stop());
      testStreamRef.current = null;
    }
    setIsTestingMic(false);
    setMicTestLevel(0);
    setSpeechStatus('SILENCE');
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={() => { stopMicTest(); onClose(); }}>
      <div
        className="modal-box"
        style={{ width: '520px', gap: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tabs */}
        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn-secondary ${activeTab === 'profile' ? 'active-success' : ''}`}
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} /> Perfil do Usuário
            </button>
            <button
              type="button"
              className={`btn-secondary ${activeTab === 'voice' ? 'active-success' : ''}`}
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveTab('voice')}
            >
              <Mic size={16} /> Voz & Áudio
            </button>
          </div>

          <button className="icon-btn" onClick={() => { stopMicTest(); onClose(); }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab 1: Profile Settings */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: color,
                margin: '0 auto 8px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                border: '2px solid var(--border-subtle)'
              }}>
                {avatar}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Seu Apelido</label>
              <input
                type="text"
                className="custom-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Avatar</label>
              <div className="avatar-picker-grid">
                {AVATARS.map((emoji) => (
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
              <label className="input-label">Cor do Perfil</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLORS.map((c) => (
                  <div
                    key={c}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: color === c ? '2px solid #fff' : 'none'
                    }}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={16} style={{ color: '#fff' }} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Status Personalizado</label>
              <input
                type="text"
                className="custom-input"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="O que você está fazendo?"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ color: 'var(--accent-red)', borderColor: 'rgba(255, 59, 92, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { stopMicTest(); onLogout(); }}
              >
                <LogOut size={16} />
                Sair / Trocar Nome
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => { stopMicTest(); onClose(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Voice & Audio Settings */}
        {activeTab === 'voice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Input Device (Microphone) */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mic size={16} style={{ color: 'var(--neon-cyan)' }} />
                Dispositivo de Entrada (Microfone)
              </label>
              <select
                className="custom-input"
                value={selectedAudioInput}
                onChange={(e) => onSelectAudioInput(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Microfone Padrão do Sistema</option>
                {audioInputDevices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    🎤 {device.label || `Microfone ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Output Device (Headphones / Speakers) */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={16} style={{ color: 'var(--neon-purple)' }} />
                Dispositivo de Saída (Alto-falantes / Fones)
              </label>
              <select
                className="custom-input"
                value={selectedAudioOutput}
                onChange={(e) => onSelectAudioOutput(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Saída de Áudio Padrão do Sistema</option>
                {audioOutputDevices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    🎧 {device.label || `Alto-falantes ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Volume / Gain Slider */}
            <div className="input-group" style={{ background: 'var(--bg-darkest)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="input-label" style={{ margin: 0 }}>
                  🎚️ Volume & Ganho do Microfone
                </label>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold', fontSize: '13px' }}>
                  {micVolume}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={micVolume}
                onChange={(e) => onMicVolumeChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
              />
            </div>

            {/* Noise Suppression & Noise Gate Toggle */}
            <div style={{
              background: 'var(--bg-darkest)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} style={{ color: noiseSuppressionEnabled ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-header)' }}>
                    Cancelamento de Ruído & Noise Gate (DSP)
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Elimina estalos de teclado, ventoinhas e barulhos de fundo
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={noiseSuppressionEnabled}
                onChange={(e) => onToggleNoiseSuppression(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-green)', cursor: 'pointer' }}
              />
            </div>

            {/* Sensibilidade do Gate Anti-Pássaros & Teclado */}
            <div className="input-group" style={{ background: 'var(--bg-darkest)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="input-label" style={{ margin: 0 }}>
                  🛡️ Sensibilidade Anti-Pássaros & Teclado (Gate Threshold)
                </label>
                <span style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '13px' }}>
                  {gateThreshold} (Recomendado: 25-35)
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                Aumente para bloquear o canto de passarinhos e estalos de teclas mecânicas.
              </span>
              <input
                type="range"
                min="10"
                max="60"
                value={gateThreshold}
                onChange={(e) => onGateThresholdChange && onGateThresholdChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--neon-green)', cursor: 'pointer' }}
              />
            </div>

            {/* Atalho de Teclado para Mutar/Desmutar */}
            <div className="input-group" style={{ background: 'var(--bg-darkest)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="input-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Keyboard size={16} style={{ color: 'var(--neon-purple)' }} />
                  Atalho de Teclado para Mutar / Desmutar
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Pressione para mutar instantaneamente
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`btn-secondary ${isRecordingHotkey ? 'active-danger' : ''}`}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: isRecordingHotkey ? '2px solid var(--neon-red)' : '1px solid var(--border-neon)',
                    color: isRecordingHotkey ? 'var(--neon-red)' : 'var(--neon-cyan)',
                    background: isRecordingHotkey ? 'rgba(255, 59, 92, 0.1)' : 'rgba(0, 242, 254, 0.05)'
                  }}
                  onClick={() => setIsRecordingHotkey(!isRecordingHotkey)}
                >
                  {isRecordingHotkey ? '⌨️ Pressione qualquer tecla no seu teclado...' : `Tecla Configurada: [ ${muteHotkey ? muteHotkey.toUpperCase() : 'NENHUMA'} ]`}
                </button>

                {muteHotkey && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '10px', color: 'var(--text-muted)' }}
                    onClick={() => onUpdateMuteHotkey && onUpdateMuteHotkey('')}
                    title="Remover atalho"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            {/* Live Mic Test Bar & Classifier Badge */}
            <div style={{
              background: 'var(--bg-darkest)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-header)' }}>
                    🎙️ Teste de Microfone
                  </span>
                  {isTestingMic && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: speechStatus === 'VOICE' ? 'rgba(35, 165, 90, 0.2)' : speechStatus === 'NOISE_BLOCKED' ? 'rgba(255, 59, 92, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: speechStatus === 'VOICE' ? 'var(--accent-green)' : speechStatus === 'NOISE_BLOCKED' ? 'var(--neon-red)' : 'var(--text-muted)',
                      border: `1px solid ${speechStatus === 'VOICE' ? 'var(--accent-green)' : speechStatus === 'NOISE_BLOCKED' ? 'var(--neon-red)' : 'var(--border-subtle)'}`
                    }}>
                      {speechStatus === 'VOICE' ? '🟢 VOZ DETECTADA' : speechStatus === 'NOISE_BLOCKED' ? '🛡️ RUÍDO BLOQUEADO (Pássaros/Teclado)' : '⚙️ Aguardando Áudio...'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className={`btn-secondary ${isTestingMic ? 'active-danger' : 'active-success'}`}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={toggleMicTest}
                >
                  {isTestingMic ? 'Parar Teste' : 'Testar Microfone'}
                </button>
              </div>

              <div style={{
                height: '10px',
                width: '100%',
                backgroundColor: 'var(--bg-darker)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${micTestLevel}%`,
                  backgroundColor: micTestLevel > 75 ? 'var(--neon-red)' : micTestLevel > 20 ? 'var(--accent-green)' : 'var(--neon-cyan)',
                  transition: 'width 0.05s ease-out'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn-primary" onClick={() => { stopMicTest(); onClose(); }}>
                Concluído
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
