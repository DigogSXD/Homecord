import React, { useState, useEffect, useRef } from 'react';
import { socket } from './utils/socket';
import { playSound } from './utils/audio';

import ServerSidebar from './components/ServerSidebar';
import ChannelList from './components/ChannelList';
import VoiceBar from './components/VoiceBar';
import ChatArea from './components/ChatArea';

import LoginModal from './components/LoginModal';
import CreateChannelModal from './components/CreateChannelModal';
import ShareModal from './components/ShareModal';
import UserProfileModal from './components/UserProfileModal';
import UserVoiceControlModal from './components/UserVoiceControlModal';

export default function App() {
  // User Session State (Loaded from localStorage if previously saved!)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('discord2_user');
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      return null;
    }
  });
  const [isJoined, setIsJoined] = useState(() => {
    return !!localStorage.getItem('discord2_user');
  });
  const [isConnected, setIsConnected] = useState(false);

  // App Data State
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [users, setUsers] = useState([]);
  const [voiceRooms, setVoiceRooms] = useState({});

  // Active Voice & Screen Share Call State
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState({}); // socketId -> streamId -> MediaStream
  const [ping, setPing] = useState(12);
  const muteStateBeforeDeafenRef = useRef(false);

  // UI Modals & Sidebars
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [createChannelDefaultType, setCreateChannelDefaultType] = useState('text');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Per-user audio controls & context menu modal
  const [userVolumes, setUserVolumes] = useState({}); // socketId -> volume number (0 to 100)
  const [userMutes, setUserMutes] = useState({}); // socketId -> boolean
  const [selectedVoiceMember, setSelectedVoiceMember] = useState(null);
  const [selectedMemberChannel, setSelectedMemberChannel] = useState(null);

  // Audio Device & Microphone Settings State
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  const [micVolume, setMicVolume] = useState(100);
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(true);
  const [gateThreshold, setGateThreshold] = useState(28);
  const [muteHotkey, setMuteHotkey] = useState(() => localStorage.getItem('discord2_mute_hotkey') || 'm');
  const micGainNodeRef = useRef(null);
  const gateThresholdRef = useRef(28);

  const handleGateThresholdChange = (val) => {
    setGateThreshold(val);
    gateThresholdRef.current = val;
  };

  const handleUpdateMuteHotkey = (key) => {
    setMuteHotkey(key);
    if (key) {
      localStorage.setItem('discord2_mute_hotkey', key);
    } else {
      localStorage.removeItem('discord2_mute_hotkey');
    }
  };

  // Typing tracking
  const [typingUsers, setTypingUsers] = useState({}); // { channelId: [users] }

  // WebRTC Refs
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const remoteAudioElementsRef = useRef({}); // socketId -> HTMLAudioElement (Voice Mic)
  const remoteScreenAudioElementsRef = useRef({}); // socketId -> HTMLAudioElement (Screen Share Audio)
  const [screenAudioVolumes, setScreenAudioVolumes] = useState({}); // socketId -> volume (0-100)
  const [screenAudioMutes, setScreenAudioMutes] = useState({}); // socketId -> boolean
  const [audioNotice, setAudioNotice] = useState(null);
  const voiceRoomsRef = useRef({});
  const animFrameRef = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      setIsConnected(true);
      try {
        const saved = localStorage.getItem('discord2_user');
        if (saved) {
          socket.emit('user:join', JSON.parse(saved));
        }
      } catch (e) {}
    };
    const handleDisconnect = () => setIsConnected(false);

    const handlePong = (startTime) => {
      const latency = Date.now() - startTime;
      setPing(latency);
    };

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping:check', Date.now());
      }
    }, 2500);

    const handleInitState = (data) => {
      setChannels(data.channels || []);
      setMessages(data.messages || {});
      setUsers(data.users || []);
      setVoiceRooms(data.voiceRooms || {});
      voiceRoomsRef.current = data.voiceRooms || {};

      // Set default text channel if none selected
      const firstText = (data.channels || []).find(c => c.type === 'text');
      if (firstText) setActiveChannel(firstText);
    };

    const handleUsersUpdate = (updatedUsers) => {
      setUsers(updatedUsers);
    };

    const handleChannelCreated = ({ channel, channels: updatedChannels }) => {
      setChannels(updatedChannels);
      if (channel.type === 'text') {
        setActiveChannel(channel);
      }
    };

    const handleChannelDeleted = ({ channelId, channels: updatedChannels }) => {
      setChannels(updatedChannels);
      setActiveChannel(prev => (prev?.id === channelId ? updatedChannels.find(c => c.type === 'text') || null : prev));
    };

    // Deduplicate messages by ID to prevent double message display!
    const handleChatMessage = (newMessage) => {
      setMessages(prev => {
        const list = prev[newMessage.channelId] || [];
        if (list.some(m => m.id === newMessage.id)) return prev;
        return {
          ...prev,
          [newMessage.channelId]: [...list, newMessage]
        };
      });
      playSound('message');
    };

    const handleMessageDeleted = ({ messageId, channelId }) => {
      setMessages(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).filter(m => m.id !== messageId)
      }));
    };

    const handleChatTyping = ({ channelId, user, isTyping }) => {
      setTypingUsers(prev => {
        const list = prev[channelId] || [];
        if (isTyping) {
          if (!list.some(u => u.id === user.id)) {
            return { ...prev, [channelId]: [...list, user] };
          }
        } else {
          return { ...prev, [channelId]: list.filter(u => u.id !== user.id) };
        }
        return prev;
      });
    };

    const handleVoiceStateUpdate = (roomsState) => {
      setVoiceRooms(roomsState);
      voiceRoomsRef.current = roomsState;
    };

    const handlePeerJoined = async ({ socketId, user }) => {
      await createPeerConnection(socketId, true);
    };

    const handleRoomUsers = async ({ channelId, peers }) => {
      for (const peer of peers) {
        await createPeerConnection(peer.socketId, false);
      }
    };

    const handleVoiceSignal = async ({ from, signalData }) => {
      let pc = peerConnectionsRef.current[from];
      if (!pc) {
        pc = await createPeerConnection(from, false);
      }
      if (signalData.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        if (signalData.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', { to: from, signalData: { sdp: pc.localDescription } });
        }
      } else if (signalData.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    };

    const handleVoiceStreamChanged = ({ socketId, isStreaming, streamId }) => {
      playSound(isStreaming ? 'stream_start' : 'stream_stop');
      if (!isStreaming && socketId) {
        if (remoteScreenAudioElementsRef.current[socketId]) {
          remoteScreenAudioElementsRef.current[socketId].pause();
          remoteScreenAudioElementsRef.current[socketId].srcObject = null;
          delete remoteScreenAudioElementsRef.current[socketId];
        }
        setRemoteScreenStreams(prev => {
          const copy = { ...prev };
          if (copy[socketId]) {
            const streams = { ...copy[socketId] };
            if (streamId) {
              delete streams[streamId];
            }
            if (Object.keys(streams).length > 0) {
              copy[socketId] = streams;
            } else {
              delete copy[socketId];
            }
          }
          return copy;
        });
      }
    };

    const handlePeerLeft = ({ socketId }) => {
      cleanupPeer(socketId);
    };

    const handleSpeakingUpdate = ({ socketId, isSpeaking }) => {
      setVoiceRooms(prev => {
        const updated = { ...prev };
        for (const chanId in updated) {
          updated[chanId] = updated[chanId].map(member => {
            if (member.socketId === socketId) {
              return { ...member, isSpeaking };
            }
            return member;
          });
        }
        return updated;
      });
    };

    const handleForcedMute = () => {
      setIsMuted(true);
      playSound('mute');
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
    };

    const handleMovedChannel = (targetChannelId) => {
      setChannels(latestChannels => {
        const targetChannel = latestChannels.find(c => c.id === targetChannelId);
        if (targetChannel) {
          handleJoinVoiceChannel(targetChannel);
        }
        return latestChannels;
      });
    };

    // Attach Listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('pong:check', handlePong);
    socket.on('init:state', handleInitState);
    socket.on('users:update', handleUsersUpdate);
    socket.on('channel:created', handleChannelCreated);
    socket.on('channel:deleted', handleChannelDeleted);
    socket.on('chat:message', handleChatMessage);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('chat:typing', handleChatTyping);
    socket.on('voice:state_update', handleVoiceStateUpdate);
    socket.on('voice:peer_joined', handlePeerJoined);
    socket.on('voice:room_users', handleRoomUsers);
    socket.on('voice:signal', handleVoiceSignal);
    socket.on('voice:stream_changed', handleVoiceStreamChanged);
    socket.on('voice:speaking_update', handleSpeakingUpdate);
    socket.on('voice:peer_left', handlePeerLeft);
    socket.on('voice:forced_mute', handleForcedMute);
    socket.on('voice:moved_channel', handleMovedChannel);

    return () => {
      clearInterval(pingInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('pong:check', handlePong);
      socket.off('init:state', handleInitState);
      socket.off('users:update', handleUsersUpdate);
      socket.off('channel:created', handleChannelCreated);
      socket.off('channel:deleted', handleChannelDeleted);
      socket.off('chat:message', handleChatMessage);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('chat:typing', handleChatTyping);
      socket.off('voice:state_update', handleVoiceStateUpdate);
      socket.off('voice:peer_joined', handlePeerJoined);
      socket.off('voice:room_users', handleRoomUsers);
      socket.off('voice:signal', handleVoiceSignal);
      socket.off('voice:stream_changed', handleVoiceStreamChanged);
      socket.off('voice:speaking_update', handleSpeakingUpdate);
      socket.off('voice:peer_left', handlePeerLeft);
      socket.off('voice:forced_mute', handleForcedMute);
      socket.off('voice:moved_channel', handleMovedChannel);

      socket.disconnect();
      leaveVoiceChannel();
    };
  }, []);

  // Join Login
  const handleUserJoin = (userData) => {
    setCurrentUser(userData);
    setIsJoined(true);
    try {
      localStorage.setItem('discord2_user', JSON.stringify(userData));
    } catch (e) {}
    socket.emit('user:join', userData);
  };

  // Profile Update
  const handleUpdateProfile = (updated) => {
    setCurrentUser(prev => {
      const newProfile = { ...prev, ...updated };
      try {
        localStorage.setItem('discord2_user', JSON.stringify(newProfile));
      } catch (e) {}
      return newProfile;
    });
    socket.emit('user:custom_status', updated.customStatus);
  };

  // Logout / Switch Account
  const handleLogout = () => {
    try {
      localStorage.removeItem('discord2_user');
    } catch (e) {}
    setCurrentUser(null);
    setIsJoined(false);
    setShowProfileModal(false);
  };

  // Messages
  const handleSendMessage = ({ channelId, content, attachment }) => {
    socket.emit('chat:message', { channelId, content, attachment });
  };

  const handleDeleteMessage = (messageId, channelId) => {
    socket.emit('message:delete', { messageId, channelId });
  };

  const handleTyping = (isTyping) => {
    if (activeChannel) {
      socket.emit('chat:typing', { channelId: activeChannel.id, isTyping });
    }
  };

  // Channels
  const handleCreateChannel = ({ name, type, topic }) => {
    socket.emit('channel:create', { name, type, topic });
  };

  const handleDeleteChannel = (channelId) => {
    socket.emit('channel:delete', channelId);
  };

  // DSP Noise Gate & Noise Suppressor: Completely mutes microphone output when user is not speaking
  const createCleanAudioStream = (rawStream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(rawStream);
      const destination = ctx.createMediaStreamDestination();

      // 1. High-Pass Filter: Cuts desk hums, fan noise, and rumbles below 110Hz
      const highPass = ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.setValueAtTime(110, ctx.currentTime);

      // 2. Low-Pass Filter: Cuts sharp keyboard click transients and mic hiss above 6500Hz
      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.setValueAtTime(6500, ctx.currentTime);

      // 3. Speech Bandpass Filter (human vocal clarity range 200Hz - 3500Hz)
      const vocalFilter = ctx.createBiquadFilter();
      vocalFilter.type = 'peaking';
      vocalFilter.frequency.setValueAtTime(1000, ctx.currentTime);
      vocalFilter.Q.setValueAtTime(0.8, ctx.currentTime);
      vocalFilter.gain.setValueAtTime(4, ctx.currentTime);

      // 4. Master Mic Volume Gain Node (0% to 200%)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(micVolume / 100, ctx.currentTime);
      micGainNodeRef.current = masterGain;

      // 5. Dynamic Noise Gate Gain Node
      const gateGain = ctx.createGain();
      gateGain.gain.setValueAtTime(0, ctx.currentTime);

      // 6. Speech Analyser Node for Noise Gate Control
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      // Connect DSP Chain: Source -> HighPass -> LowPass -> VocalFilter -> MasterGain -> GateGain -> Destination
      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(vocalFilter);
      vocalFilter.connect(masterGain);
      masterGain.connect(gateGain);
      gateGain.connect(destination);

      // Connect VocalFilter output to Analyser for speech envelope detection
      vocalFilter.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let isGateOpen = false;

      const processGate = () => {
        analyser.getByteFrequencyData(buffer);

        // Human Vocal Formant Energy (bins 3 to 25 -> approx 180Hz - 2200Hz)
        let vocalEnergy = 0;
        for (let i = 3; i <= 25; i++) {
          vocalEnergy += buffer[i];
        }
        const vocalAvg = vocalEnergy / 23;

        // High Frequency / Transient Energy (bins 35 to 110 -> approx 3200Hz - 9000Hz)
        // High frequency is where bird chirps, keyboard clicks, mouse clicks, and mic hiss live!
        let highFreqEnergy = 0;
        for (let i = 35; i <= 110; i++) {
          highFreqEnergy += buffer[i];
        }
        const highFreqAvg = highFreqEnergy / 76;

        const currentThreshold = gateThresholdRef.current || 28;

        // Human Speech Classifier:
        // 1. vocalAvg must be greater than user threshold
        // 2. vocalAvg must be significantly higher than highFreqAvg (so bird chirps & keyboard clicks are REJECTED)
        const isSpeakingNow = noiseSuppressionEnabled
          ? (vocalAvg > currentThreshold && vocalAvg > highFreqAvg * 1.25)
          : (vocalAvg > 5);

        const now = ctx.currentTime;
        if (isSpeakingNow) {
          if (!isGateOpen) {
            isGateOpen = true;
            gateGain.gain.cancelScheduledValues(now);
            gateGain.gain.linearRampToValueAtTime(1.0, now + 0.03); // Fast 30ms smooth gate open
          }
        } else {
          if (isGateOpen) {
            isGateOpen = false;
            gateGain.gain.cancelScheduledValues(now);
            gateGain.gain.linearRampToValueAtTime(0.0, now + 0.12); // Fast 120ms smooth gate close to 0 (TOTAL SILENCE)
          }
        }

        requestAnimationFrame(processGate);
      };

      processGate();

      const cleanTrack = destination.stream.getAudioTracks()[0];
      return new MediaStream([cleanTrack]);
    } catch (err) {
      console.warn('DSP Noise Gate fallback for raw stream:', err);
      return rawStream;
    }
  };

  const fetchAudioDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);
      }
    } catch (err) {
      console.warn('Erro ao listar dispositivos:', err);
    }
  };

  useEffect(() => {
    fetchAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', fetchAudioDevices);
    }
  }, []);

  const handleSelectAudioInput = async (deviceId) => {
    setSelectedAudioInput(deviceId);
    if (activeVoiceChannel) {
      try {
        const audioConstraints = {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true }
        };
        const rawStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
        const cleanStream = createCleanAudioStream(rawStream);
        localStreamRef.current = cleanStream;
        setupAudioAnalyser(rawStream);

        const newTrack = cleanStream.getAudioTracks()[0];
        for (const pc of Object.values(peerConnectionsRef.current)) {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newTrack);
          }
        }
      } catch (err) {
        console.warn('Erro ao trocar microfone:', err);
      }
    }
  };

  const handleSelectAudioOutput = async (deviceId) => {
    setSelectedAudioOutput(deviceId);
    for (const audioEl of [
      ...Object.values(remoteAudioElementsRef.current),
      ...Object.values(remoteScreenAudioElementsRef.current)
    ]) {
      if (audioEl && typeof audioEl.setSinkId === 'function') {
        try {
          await audioEl.setSinkId(deviceId);
        } catch (err) {
          console.warn('setSinkId falhou:', err);
        }
      }
    }
  };

  const handleMicVolumeChange = (vol) => {
    setMicVolume(vol);
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = vol / 100;
    }
  };

  // --- WEBRTC VOICE & AUDIO LOGIC ---
  const handleJoinVoiceChannel = async (channel) => {
    setActiveChannel(channel);

    if (activeVoiceChannel?.id === channel.id) return;

    leaveVoiceChannel();

    setActiveVoiceChannel(channel);
    playSound('join');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const audioConstraints = {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          googEchoCancellation: { ideal: true },
          googAutoGainControl: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googHighpassFilter: { ideal: true },
          googTypingNoiseDetection: { ideal: true },
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        };

        const rawStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
        const cleanStream = createCleanAudioStream(rawStream);
        localStreamRef.current = cleanStream;
        setupAudioAnalyser(rawStream);
        setIsMuted(false);
      }
    } catch (err) {
      console.warn('Microfone não acessível (entrando no modo apenas ouvinte / mudo):', err);
      setIsMuted(true);
    }

    socket.emit('voice:join', channel.id);
  };

  const leaveVoiceChannel = () => {
    if (!activeVoiceChannel) return;

    if (isScreenSharing && activeVoiceChannel) {
      socket.emit('voice:stream_update', { channelId: activeVoiceChannel.id, isStreaming: false });
    }

    playSound('leave');
    socket.emit('voice:leave');

    // Stop screen share if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);
    setCameraStream(null);
    setIsCameraOn(false);

    // Stop local mic tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    Object.values(remoteScreenAudioElementsRef.current).forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteScreenAudioElementsRef.current = {};

    Object.keys(peerConnectionsRef.current).forEach(id => cleanupPeer(id));

    setActiveVoiceChannel(null);
    setIsSpeaking(false);
  };

  // Helper function to boost WebRTC video sender quality to 1080p 60fps Ultra HD (8 Mbps)
  const boostSenderQuality = async (sender) => {
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 8000000; // 8 Mbps (Discord Nitro Quality)
      params.encodings[0].maxFramerate = 60;
      if ('degradationPreference' in params) {
        params.degradationPreference = 'maintain-resolution';
      }
      await sender.setParameters(params);
    } catch (e) {
      console.warn('Nao foi possivel definir bitrate maximo no video sender:', e);
    }
  };

  // Helper function to boost WebRTC audio sender quality for screen/system sound (256 kbps Stereo)
  const boostAudioSenderQuality = async (sender) => {
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 256000; // 256 kbps (High-fidelity stereo audio)
      await sender.setParameters(params);
    } catch (e) {
      console.warn('Bitrate de áudio de alta definição não suportado:', e);
    }
  };

  // --- SCREEN SHARE LOGIC ---
  const handleToggleCamera = async () => {
    if (!activeVoiceChannel) {
      alert('Entre em um canal de voz primeiro para ativar sua webcam!');
      return;
    }

    if (isCameraOn) {
      const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0];
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      setCameraStream(null);
      setIsCameraOn(false);
      socket.emit('voice:camera_update', { channelId: activeVoiceChannel.id, isCameraOn: false });

      for (const [peerSocketId, pc] of Object.entries(peerConnectionsRef.current)) {
        const videoSender = pc.getSenders().find(sender => sender.track === cameraTrack);
        if (videoSender) {
          pc.removeTrack(videoSender);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('voice:signal', { to: peerSocketId, signalData: { sdp: pc.localDescription } });
        }
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
        audio: false
      });
      const videoTrack = stream.getVideoTracks()[0];
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setIsCameraOn(true);
      socket.emit('voice:camera_update', { channelId: activeVoiceChannel.id, isCameraOn: true, streamId: stream.id, trackId: videoTrack.id });
      videoTrack.onended = () => {
        cameraStreamRef.current = null;
        setCameraStream(null);
        setIsCameraOn(false);
        if (activeVoiceChannel) {
          socket.emit('voice:camera_update', { channelId: activeVoiceChannel.id, isCameraOn: false, streamId: stream.id, trackId: videoTrack.id });
        }
      };

      for (const [peerSocketId, pc] of Object.entries(peerConnectionsRef.current)) {
        const videoSender = pc.addTrack(videoTrack, stream);
        await boostSenderQuality(videoSender);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:signal', { to: peerSocketId, signalData: { sdp: pc.localDescription } });
      }
    } catch (err) {
      console.warn('Webcam não acessível:', err);
    }
  };

  const stopScreenShare = async () => {
    const currentStream = screenStreamRef.current;
    const tracksToStop = currentStream ? currentStream.getTracks() : [];

    if (activeVoiceChannel && currentStream) {
      socket.emit('voice:stream_update', {
        channelId: activeVoiceChannel.id,
        isStreaming: false,
        streamId: currentStream.id
      });
    }

    tracksToStop.forEach(t => {
      t.onended = null;
      t.stop();
    });
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);

    for (const [peerSocketId, pc] of Object.entries(peerConnectionsRef.current)) {
      try {
        const senders = pc.getSenders();
        let removed = false;
        tracksToStop.forEach(t => {
          const sender = senders.find(s => s.track === t);
          if (sender) {
            pc.removeTrack(sender);
            removed = true;
          }
        });
        if (removed) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('voice:signal', {
            to: peerSocketId,
            signalData: { sdp: pc.localDescription }
          });
        }
      } catch (e) {}
    }
  };

  const handleToggleScreenShare = async () => {
    if (!activeVoiceChannel) {
      alert('Entre em um canal de voz primeiro para transmitir sua tela!');
      return;
    }

    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      // Start Screen Share with Video + Audio (System Audio / Tab Sound)
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: 'always',
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
              frameRate: { ideal: 60, max: 60 }
            },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              suppressLocalAudioPlayback: false
            },
            systemAudio: 'include'
          });
        } catch (err1) {
          if (err1.name === 'NotAllowedError' || err1.name === 'AbortError') return;
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: 'always',
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 60, max: 60 }
              },
              audio: true
            });
          } catch (err2) {
            if (err2.name === 'NotAllowedError' || err2.name === 'AbortError') return;
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: 'always',
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 60, max: 60 }
              },
              audio: false
            });
          }
        }

        if (!stream) return;

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack && 'contentHint' in videoTrack) {
          videoTrack.contentHint = 'detail'; // Preserve sharp text & detail clarity
        }
        if (audioTrack && 'contentHint' in audioTrack) {
          audioTrack.contentHint = 'music'; // Preserve full fidelity audio without speech filtering
        }

        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        const hasAudio = !!audioTrack;
        if (!hasAudio) {
          setAudioNotice('Dica: Para transmitir som de jogos ou vídeos, marque "Compartilhar áudio do sistema" na janela de seleção de tela.');
          setTimeout(() => setAudioNotice(null), 8000);
        } else {
          setAudioNotice('Transmissão iniciada com Áudio HD do Sistema! 🔊');
          setTimeout(() => setAudioNotice(null), 5000);
        }

        socket.emit('voice:stream_update', {
          channelId: activeVoiceChannel.id,
          isStreaming: true,
          streamId: stream.id,
          trackId: videoTrack?.id,
          hasAudio
        });

        // When user stops sharing from browser native bar
        stream.getTracks().forEach(track => {
          track.onended = () => {
            stopScreenShare();
          };
        });

        // Add track and renegotiate WebRTC offer/answer with all peers
        for (const [peerSocketId, pc] of Object.entries(peerConnectionsRef.current)) {
          try {
            for (const track of stream.getTracks()) {
              const sender = pc.addTrack(track, stream);
              if (track.kind === 'video') {
                await boostSenderQuality(sender);
              } else if (track.kind === 'audio') {
                await boostAudioSenderQuality(sender);
              }
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('voice:signal', {
              to: peerSocketId,
              signalData: { sdp: pc.localDescription }
            });
          } catch (err) {
            console.warn('Erro ao renegociar transmissão com peer:', peerSocketId, err);
          }
        }
      } catch (err) {
        console.warn('Compartilhamento de tela cancelado:', err);
      }
    }
  };

  const setupRemoteAudioAnalyser = (targetSocketId, stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let isRemoteSpeaking = false;

      const checkVolume = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const nowSpeaking = average > 10;

        if (nowSpeaking !== isRemoteSpeaking) {
          isRemoteSpeaking = nowSpeaking;
          setVoiceRooms(prev => {
            const updated = { ...prev };
            for (const chanId in updated) {
              updated[chanId] = updated[chanId].map(member => {
                if (member.socketId === targetSocketId) {
                  return { ...member, isSpeaking: nowSpeaking };
                }
                return member;
              });
            }
            return updated;
          });
        }
        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Erro ao analisar áudio remoto:', e);
    }
  };

  const setupRemoteScreenAudio = (targetSocketId, stream) => {
    const peerUser = users.find(u => u.id === targetSocketId);
    if (peerUser && currentUser && peerUser.name === currentUser.name) {
      return;
    }

    let audio = remoteScreenAudioElementsRef.current[targetSocketId];
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      if (selectedAudioOutput && typeof audio.setSinkId === 'function') {
        audio.setSinkId(selectedAudioOutput).catch(() => {});
      }
      remoteScreenAudioElementsRef.current[targetSocketId] = audio;
    }

    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }

    const isMuted = isDeafened || !!screenAudioMutes[targetSocketId] || !!userMutes[targetSocketId];
    audio.muted = isMuted;

    const vol = screenAudioVolumes[targetSocketId] ?? 100;
    audio.volume = Math.max(0, Math.min(1, vol / 100));

    audio.play().catch(e => {
      console.warn('Autoplay do áudio da transmissão bloqueado pelo navegador:', e);
    });
  };

  const createPeerConnection = async (targetSocketId, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
    });

    peerConnectionsRef.current[targetSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    [screenStreamRef.current, cameraStreamRef.current].filter(Boolean).forEach(videoStream => {
      videoStream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, videoStream);
        if (track.kind === 'video') {
          boostSenderQuality(sender);
        } else if (track.kind === 'audio') {
          boostAudioSenderQuality(sender);
        }
      });
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          to: targetSocketId,
          signalData: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      const peerState = Object.values(voiceRoomsRef.current)
        .flat()
        .find(member => member.socketId === targetSocketId);

      if (event.track.kind === 'video') {
        const streamKeys = [stream.id, event.track.id];
        const knownType = event.track.id === peerState?.cameraTrackId || stream.id === peerState?.cameraStreamId
          ? 'camera'
          : 'screen';

        setRemoteScreenStreams(prev => ({
          ...prev,
          [targetSocketId]: {
            ...(prev[targetSocketId] || {}),
            ...Object.fromEntries(streamKeys.map(key => [key, stream])),
            [`${knownType}Stream`]: stream
          }
        }));

        if (knownType === 'screen') {
          if (stream.getAudioTracks().length > 0) {
            setupRemoteScreenAudio(targetSocketId, stream);
          }
          stream.onaddtrack = (e) => {
            if (e.track.kind === 'audio') {
              setupRemoteScreenAudio(targetSocketId, stream);
            }
          };
        }
      } else {
        // AUDIO TRACK
        const peerUser = users.find(u => u.id === targetSocketId);
        // Do NOT play audio element if target is self or matching user name
        if (peerUser && currentUser && peerUser.name === currentUser.name) {
          return;
        }

        const isScreenAudio = (
          stream.id === peerState?.screenStreamId ||
          stream.getVideoTracks().length > 0 ||
          (peerState?.isStreaming && event.track.id !== peerState?.micTrackId && stream.id !== peerState?.cameraStreamId)
        );

        if (isScreenAudio) {
          setRemoteScreenStreams(prev => ({
            ...prev,
            [targetSocketId]: {
              ...(prev[targetSocketId] || {}),
              [stream.id]: stream,
              screenStream: stream
            }
          }));
          setupRemoteScreenAudio(targetSocketId, stream);
        } else {
          // Microphone Audio
          let audio = remoteAudioElementsRef.current[targetSocketId];
          if (!audio) {
            audio = new Audio();
            audio.autoplay = true;
            if (selectedAudioOutput && typeof audio.setSinkId === 'function') {
              audio.setSinkId(selectedAudioOutput).catch(() => {});
            }
            remoteAudioElementsRef.current[targetSocketId] = audio;
          }
          audio.srcObject = stream;
          audio.muted = isDeafened || !!userMutes[targetSocketId];
          if (userVolumes[targetSocketId] !== undefined) {
            audio.volume = Math.max(0, Math.min(1, userVolumes[targetSocketId] / 100));
          }
          setupRemoteAudioAnalyser(targetSocketId, stream);
        }
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice:signal', {
        to: targetSocketId,
        signalData: { sdp: pc.localDescription }
      });
    }

    return pc;
  };

  const cleanupPeer = (targetSocketId) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      peerConnectionsRef.current[targetSocketId].close();
      delete peerConnectionsRef.current[targetSocketId];
    }
    if (remoteAudioElementsRef.current[targetSocketId]) {
      remoteAudioElementsRef.current[targetSocketId].srcObject = null;
      delete remoteAudioElementsRef.current[targetSocketId];
    }
    if (remoteScreenAudioElementsRef.current[targetSocketId]) {
      remoteScreenAudioElementsRef.current[targetSocketId].pause();
      remoteScreenAudioElementsRef.current[targetSocketId].srcObject = null;
      delete remoteScreenAudioElementsRef.current[targetSocketId];
    }
    setRemoteScreenStreams(prev => {
      const copy = { ...prev };
      delete copy[targetSocketId];
      return copy;
    });
  };

  const setupAudioAnalyser = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);

      // High-Pass Filter: Cuts off low-frequency hums, fan noise, and desk rumbles below 85Hz
      const highPassFilter = ctx.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.setValueAtTime(85, ctx.currentTime);

      // Dynamics Compressor: Normalizes voice spikes & boosts soft speech like a studio mic
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, ctx.currentTime);
      compressor.knee.setValueAtTime(40, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);

      // Speech Analyser for active speaking green border
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      // Connect DSP audio pipeline: Source -> HighPass -> Compressor -> Analyser
      source.connect(highPassFilter);
      highPassFilter.connect(compressor);
      compressor.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      let speakingState = false;

      const checkVolume = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const nowSpeaking = average > 25;

        if (nowSpeaking !== speakingState) {
          speakingState = nowSpeaking;
          setIsSpeaking(nowSpeaking);
          if (activeVoiceChannel) {
            socket.emit('voice:speaking', {
              channelId: activeVoiceChannel.id,
              isSpeaking: nowSpeaking
            });
          }
        }
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Erro no analisador de áudio:', err);
    }
  };

  // Toggle Mute / Deafen
  const handleToggleMute = () => {
    const newMute = isDeafened ? true : !isMuted;
    setIsMuted(newMute);
    playSound(newMute ? 'mute' : 'unmute');

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMute;
      });
    }

    if (activeVoiceChannel) {
      socket.emit('voice:mute_update', {
        channelId: activeVoiceChannel.id,
        isMuted: newMute,
        isDeafened
      });
    }
  };

  // Global Hotkey Listener for Mute/Unmute keybind
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (isInput) return;

      let keyName = e.key;
      if (keyName === ' ') keyName = 'Espaço';

      if (muteHotkey && (keyName.toLowerCase() === muteHotkey.toLowerCase() || e.key.toLowerCase() === muteHotkey.toLowerCase())) {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [muteHotkey, isMuted, activeVoiceChannel]);

  const handleToggleDeafen = () => {
    const newDeaf = !isDeafened;
    if (newDeaf) {
      muteStateBeforeDeafenRef.current = isMuted;
    }
    const effectiveMute = newDeaf ? true : muteStateBeforeDeafenRef.current;

    setIsDeafened(newDeaf);
    setIsMuted(effectiveMute);
    playSound(newDeaf ? 'mute' : 'unmute');

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !effectiveMute;
      });
    }

    Object.values(remoteAudioElementsRef.current).forEach(audio => {
      audio.muted = newDeaf;
    });

    Object.values(remoteScreenAudioElementsRef.current).forEach(audio => {
      audio.muted = newDeaf;
    });

    if (activeVoiceChannel) {
      socket.emit('voice:mute_update', {
        channelId: activeVoiceChannel.id,
        isMuted: effectiveMute,
        isDeafened: newDeaf
      });
    }
  };

  const handleUserVolumeChange = (socketId, volume) => {
    setUserVolumes(prev => ({ ...prev, [socketId]: volume }));
    const audio = remoteAudioElementsRef.current[socketId];
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume / 100));
    }
  };

  const handleToggleLocalMuteUser = (socketId) => {
    setUserMutes(prev => {
      const newMuted = !prev[socketId];
      const audio = remoteAudioElementsRef.current[socketId];
      if (audio) {
        audio.muted = newMuted;
      }
      return { ...prev, [socketId]: newMuted };
    });
  };

  const handleScreenAudioVolumeChange = (socketId, volume) => {
    setScreenAudioVolumes(prev => ({ ...prev, [socketId]: volume }));
    const audio = remoteScreenAudioElementsRef.current[socketId];
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume / 100));
    }
  };

  const handleToggleScreenAudioMute = (socketId) => {
    setScreenAudioMutes(prev => {
      const newMuted = !prev[socketId];
      const audio = remoteScreenAudioElementsRef.current[socketId];
      if (audio) {
        audio.muted = isDeafened || newMuted;
      }
      return { ...prev, [socketId]: newMuted };
    });
  };

  // Sync screen audio elements whenever volumes, mutes, or deafen changes
  useEffect(() => {
    for (const [socketId, audio] of Object.entries(remoteScreenAudioElementsRef.current)) {
      if (audio) {
        audio.muted = isDeafened || !!screenAudioMutes[socketId] || !!userMutes[socketId];
        const vol = screenAudioVolumes[socketId] ?? 100;
        audio.volume = Math.max(0, Math.min(1, vol / 100));
      }
    }
  }, [screenAudioMutes, screenAudioVolumes, userMutes, isDeafened]);

  const handleForceMuteMic = (targetSocketId) => {
    if (activeVoiceChannel) {
      socket.emit('voice:force_mute', { targetSocketId, channelId: activeVoiceChannel.id });
    }
  };

  const handleMoveUserChannel = (targetSocketId, targetChannelId) => {
    socket.emit('voice:move_user', { targetSocketId, targetChannelId });
    setSelectedVoiceMember(null);
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      {/* Disconnection Banner Warning */}
      {!isConnected && isJoined && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--accent-red)',
          color: '#fff',
          textAlign: 'center',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}>
          ⚠️ Desconectado do Servidor Backend! Certifique-se de rodar <code>npm run dev</code> no terminal.
        </div>
      )}

      {/* Login Screen Modal if not yet logged in */}
      {!isJoined && <LoginModal onJoin={handleUserJoin} />}

      {/* Main Interface */}
      <ServerSidebar
        onOpenShare={() => setShowShareModal(true)}
        onOpenSettings={() => setShowProfileModal(true)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', width: '240px', height: '100%' }}>
        <ChannelList
          channels={channels}
          activeChannel={activeChannel}
          onSelectChannel={(c) => setActiveChannel(c)}
          onOpenCreateChannel={(type) => {
            setCreateChannelDefaultType(type);
            setShowCreateChannelModal(true);
          }}
          onDeleteChannel={handleDeleteChannel}
          activeVoiceChannel={activeVoiceChannel}
          voiceRooms={voiceRooms}
          onJoinVoiceChannel={handleJoinVoiceChannel}
          onOpenMemberMenu={(member, channel) => {
            setSelectedVoiceMember(member);
            setSelectedMemberChannel(channel);
          }}
          userVolumes={userVolumes}
          userMutes={userMutes}
          onVolumeChange={handleUserVolumeChange}
          onToggleLocalMute={handleToggleLocalMuteUser}
          onMoveMemberChannel={handleMoveUserChannel}
        />

        <VoiceBar
          currentUser={currentUser}
          activeVoiceChannel={activeVoiceChannel}
          voiceRooms={voiceRooms}
          ping={ping}
          isMuted={isMuted}
          isDeafened={isDeafened}
          isSpeaking={isSpeaking}
          isScreenSharing={isScreenSharing}
          isCameraOn={isCameraOn}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleCamera={handleToggleCamera}
          onLeaveVoice={leaveVoiceChannel}
          onOpenSettings={() => setShowProfileModal(true)}
        />
      </div>

      <ChatArea
        channel={activeChannel}
        messages={messages[activeChannel?.id] || []}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        currentUser={currentUser}
        typingUsers={typingUsers}
        onTyping={handleTyping}
        // Voice & Screen Share
        activeVoiceChannel={activeVoiceChannel}
        voiceRooms={voiceRooms}
        ping={ping}
        onJoinVoiceChannel={handleJoinVoiceChannel}
        onLeaveVoice={leaveVoiceChannel}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isScreenSharing={isScreenSharing}
        isCameraOn={isCameraOn}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleCamera={handleToggleCamera}
        screenStream={screenStream}
        cameraStream={cameraStream}
        remoteScreenStreams={remoteScreenStreams}
        screenAudioVolumes={screenAudioVolumes}
        screenAudioMutes={screenAudioMutes}
        onScreenAudioVolumeChange={handleScreenAudioVolumeChange}
        onToggleScreenAudioMute={handleToggleScreenAudioMute}
      />

      {/* Screen Share Audio Notification Toast */}
      {audioNotice && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 22, 28, 0.95)',
          border: '1px solid var(--border-neon)',
          boxShadow: 'var(--shadow-popup)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>{audioNotice}</span>
        </div>
      )}

      {/* Modals */}
      {showShareModal && (
        <ShareModal onClose={() => setShowShareModal(false)} />
      )}

      {showCreateChannelModal && (
        <CreateChannelModal
          defaultType={createChannelDefaultType}
          onClose={() => setShowCreateChannelModal(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {showProfileModal && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
          audioInputDevices={audioInputDevices}
          audioOutputDevices={audioOutputDevices}
          selectedAudioInput={selectedAudioInput}
          selectedAudioOutput={selectedAudioOutput}
          micVolume={micVolume}
          noiseSuppressionEnabled={noiseSuppressionEnabled}
          gateThreshold={gateThreshold}
          muteHotkey={muteHotkey}
          onSelectAudioInput={handleSelectAudioInput}
          onSelectAudioOutput={handleSelectAudioOutput}
          onMicVolumeChange={handleMicVolumeChange}
          onToggleNoiseSuppression={(enabled) => setNoiseSuppressionEnabled(enabled)}
          onGateThresholdChange={handleGateThresholdChange}
          onUpdateMuteHotkey={handleUpdateMuteHotkey}
        />
      )}

      {selectedVoiceMember && (
        <UserVoiceControlModal
          member={selectedVoiceMember}
          currentChannel={selectedMemberChannel}
          voiceChannels={channels.filter(c => c.type === 'voice')}
          currentUser={currentUser}
          volume={userVolumes[selectedVoiceMember.socketId] ?? 100}
          isLocallyMuted={!!userMutes[selectedVoiceMember.socketId]}
          streamVolume={screenAudioVolumes[selectedVoiceMember.socketId] ?? 100}
          isStreamMuted={!!screenAudioMutes[selectedVoiceMember.socketId]}
          onVolumeChange={(vol) => handleUserVolumeChange(selectedVoiceMember.socketId, vol)}
          onToggleLocalMute={() => handleToggleLocalMuteUser(selectedVoiceMember.socketId)}
          onStreamVolumeChange={(vol) => handleScreenAudioVolumeChange(selectedVoiceMember.socketId, vol)}
          onToggleStreamMute={() => handleToggleScreenAudioMute(selectedVoiceMember.socketId)}
          onForceMuteMic={() => handleForceMuteMic(selectedVoiceMember.socketId)}
          onMoveChannel={(targetChannelId) => handleMoveUserChannel(selectedVoiceMember.socketId, targetChannelId)}
          onWatchStream={() => {
            if (selectedMemberChannel) setActiveChannel(selectedMemberChannel);
          }}
          onClose={() => setSelectedVoiceMember(null)}
        />
      )}
    </div>
  );
}
