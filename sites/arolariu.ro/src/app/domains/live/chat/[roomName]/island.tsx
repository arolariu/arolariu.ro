/** @format */
"use client";

import {useEffect, useState} from "react";
import {io} from "socket.io-client";

let socket: any;

export default function RenderChatRoomScreen({roomName}: Readonly<{roomName: string}>) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [transport, setTransport] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");

  useEffect(() => {
    socketInitializer();
  }, []);

  const socketInitializer = async () => {
    await fetch("/api/socket/io", {cache: "force-cache"});
    socket = io({
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    socket.on("connect_error", (error: any) => {
      if (socket.active) {
        // temporary failure, the socket will automatically try to reconnect
      } else {
        // the connection was denied by the server
        // in that case, `socket.connect()` must be manually called in order to reconnect
        console.log(error.message);
      }
    });

    socket.on("connect", () => {
      console.warn("Connected to the server.");
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);
    });

    socket.on("disconnect", () => {
      console.warn("Disconnected from the server.");
      setIsConnected(false);
    });

    socket.on("message", (message: string) => {
      setMessages((messages) => [...messages, message]);
    });
  };

  const sendMessage = () => {
    socket.emit("message", currentMessage);
    setCurrentMessage("");
  };

  return (
    <div className='flex flex-col items-center justify-center justify-items-center px-12 py-24'>
      <h1>Connection State: {String(isConnected)}</h1>
      <h1>Transport: {transport}</h1>
      {messages.map((message, index) => (
        <p key={index}>{message}</p>
      ))}

      <input
        title='message-input'
        type='text'
        placeholder='Type your message here...'
        value={currentMessage}
        onChange={(e) => setCurrentMessage(e.target.value)}
      />

      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
