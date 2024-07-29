/** @format */
"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {Socket} from "socket.io";
import {io} from "socket.io-client";

type SocketContextValueType = {
  socket: Socket | null;
  isConnected: boolean;
  latency: number;
};

const SocketContext = createContext<SocketContextValueType>({
  socket: null,
  isConnected: false,
  latency: -1,
});

export const useSocket = () => useContext(SocketContext);

/**
 * The socket provider.
 * @returns The socket provider.
 */
export const SocketProvider = ({children}: Readonly<{children: ReactNode}>) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    const socketInstance = io({
      // Polling is primary since AFD doesn't support websockets.
      transports: ["polling", "webtransport"],
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    /* This is converted to any as there is a type difference between socket and socketInstance. */
    /* eslint "@typescript-eslint/no-unsafe-argument": "off" */
    /* eslint "@typescript-eslint/no-explicit-any": "off" */
    setSocket(socketInstance as any);

    const startDate = new Date();
    socketInstance.emit("ping", () => {
      const duration = Date.now() - startDate.getTime();
      setLatency(duration);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const value = {socket, isConnected, latency} satisfies SocketContextValueType;
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
