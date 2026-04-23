import { useEffect, useMemo, useState } from "react";
import { connectAuthedSocket, disconnectSocket, getSocket } from "../lib/socket";

export function useSocket(token) {
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (token) connectAuthedSocket(token);
    else disconnectSocket();
  }, [token]);

  return { socket, isConnected };
}

