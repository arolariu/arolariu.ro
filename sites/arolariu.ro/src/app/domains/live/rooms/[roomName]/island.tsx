/** @format */

"use client";

import {useSocket} from "@/hooks/useSocket";
import {useUser} from "@clerk/nextjs";
import {useEffect, useState} from "react";

type RoomInformation = {
  roomOwner: string;
  roomName: string;
  roomType: "chat" | "video" | "audio";
};

/**
 * This function renders the room screen.
 * @returns The JSX for the room screen.
 */
export default function RenderRoomScreen({roomId}: Readonly<{roomId: string}>) {
  const {user} = useUser();
  const {socket} = useSocket();
  const [roomInformation, setRoomInformation] = useState<RoomInformation>({
    roomOwner: "anonymous",
    roomName: "",
    roomType: "chat",
  });

  useEffect(() => {
    if (socket) {
      socket.emit("get-room", roomId);
      socket.on("room-information", (roomInfo: RoomInformation) => {
        console.log("Got room information:", roomInfo);
        setRoomInformation(roomInfo);
      });
    }
  }, [socket, roomId]);

  return (
    <section className='flex flex-col items-center justify-center justify-items-center'>
      <article>
        <h1>Room {roomId}</h1>
        <h2>Room Owner: {roomInformation.roomOwner}</h2>
        <h3>You are: {user?.primaryEmailAddress?.emailAddress ?? "anonymous"}</h3>
      </article>
      <article>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio quis, quidem laboriosam molestiae autem
        consequatur esse fugiat similique nobis accusantium obcaecati. Quidem adipisci voluptate fugit eum ad ut libero
        facilis non. Corrupti voluptatibus vero, magnam officia molestias praesentium, facilis provident consectetur
        itaque fugit recusandae sequi, rerum quasi. Beatae, ipsum amet.
      </article>
    </section>
  );
}
