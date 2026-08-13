import { io } from 'socket.io-client';

// Connect to current host/port or proxy
const URL = window.location.origin;

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
