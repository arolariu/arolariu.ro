/** @format */

"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useSocket} from "@/hooks/useSocket";
import {RoomMessage} from "@/types/RoomInformation";
import {useUser} from "@clerk/nextjs";
import {useEffect, useState} from "react";

/**
 * This function renders the room screen.
 * @returns The JSX for the room screen.
 */
export default function RenderRoomScreen({roomId}: Readonly<{roomId: string}>) {
  const {user} = useUser();
  const {socket} = useSocket();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [message, setMessage] = useState<RoomMessage | null>(null);

  useEffect(() => {
    if (socket) {
      socket.on("message-room", (message: RoomMessage) => {
        console.log("Got message:", message);
        setMessages((messages) => [...messages, message]);
      });
    }
  }, [socket]);

  return (
    <section className='flex flex-col items-center justify-center justify-items-center'>
      <h1>
        Room <span className='font-mono font-extrabold tracking-wider'>{roomId}</span>
      </h1>
      <article className='flex flex-col flex-nowrap gap-2'>
        <ul>
          {messages.map((message, index) => (
            <li key={index}>
              <span>{message.username}</span>: <span>{message.message}</span>
            </li>
          ))}
        </ul>
      </article>
      <article className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4'>
        <Input
          type='text'
          placeholder='Type a message...'
          value={message?.message}
          onChange={(event) => setMessage({username: user?.fullName ?? "anonymous", message: event.target.value})}
        />
        <Button
          variant='secondary'
          onClick={() => {
            if (socket) {
              socket.emit("message-room", message, roomId);
              setMessage(null);
            }
          }}>
          Send
        </Button>
      </article>
    </section>
  );
}
