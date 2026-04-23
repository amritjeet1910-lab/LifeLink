import { io } from "socket.io-client";

let socketInstance = null;

function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
}

export function getSocket() {
  if (socketInstance) return socketInstance;
  socketInstance = io(getSocketUrl(), {
    transports: ["websocket"],
    autoConnect: false,
  });
  return socketInstance;
}

export function connectAuthedSocket(token) {
  const socket = getSocket();
  if (!socket.connected) socket.connect();
  if (token) socket.emit("auth", { token });
  return socket;
}

export function disconnectSocket() {
  if (!socketInstance) return;
  socketInstance.disconnect();
}

