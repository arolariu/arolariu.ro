/** @format */
"use client";

import {createContext, ReactNode, useContext, useEffect, useRef, useState} from "react";
import {io} from "socket.io-client";

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
  latency: number;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  latency: -1,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({children}: {children: ReactNode}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(socketInstance as any);

    const startDate = new Date();
    socketInstance.emit("ping", () => {
      const duration = new Date().getTime() - startDate.getTime();
      setLatency(duration);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={{socket, isConnected, latency}}>{children}</SocketContext.Provider>;
};

export function useSocketForVideo() {
  const socketCreated = useRef<boolean>(false);

  useEffect(() => {
    if (!socketCreated.current) {
      const socketInitializer = async () => {
        await fetch("/api/socket/io");
      };
      try {
        socketInitializer();
        socketCreated.current = true;
      } catch (error) {
        console.log(error);
      }
    }
  }, []);
}

export function useSocketForChat() {
  const [messages, setMessages] = useState<Array<string>>([]);

  useEffect(() => {
    // Create a socket connection
    const socket = io();

    // Listen for incoming messages
    socket.on("message", (message: string) => {
      setMessages((messages) => [...messages, message]);
    });

    // Clean up the socket connection on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return {messages};
}
