/** @format */
"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useToast} from "@/components/ui/use-toast";
import {useSocket} from "@/hooks/useSocket";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

type RoomInformation = {
  roomName: string;
  roomType: "chat" | "video" | "audio";
};

/**
 * This function renders the create room form.
 * @returns  The JSX for the create room form.
 */
export function CreateRoomForm() {
  const {toast} = useToast();
  const router = useRouter();
  const {socket} = useSocket();
  const [roomInformation, setRoomInformation] = useState<RoomInformation>({
    roomName: "",
    roomType: "chat",
  });

  useEffect(() => {
    const roomName = Math.random().toString(36).slice(2, 12);
    setRoomInformation({...roomInformation, roomName});
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("create-room", roomInformation);
      // wait 5 seconds for the room to be created.
      setTimeout(() => router.push(`rooms/${roomInformation.roomName}`), 5000);
    } else {
      toast({
        variant: "destructive",
        title: "Socket not connected.",
        description: "Please wait for the connection to be established.",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='flex flex-col flex-nowrap gap-2'>
      <span className='block'> Option 1. Create a chat room.</span>
      <div>
        <Label
          htmlFor='roomName'
          className='pr-2'>
          Room Name:
        </Label>
        <Input
          id='roomName'
          name='roomName'
          type='text'
          className='rounded-lg border text-center'
          value={roomInformation.roomName}
          onChange={(event) => setRoomInformation({...roomInformation, roomName: event.target.value})}
        />
      </div>
      <div>
        <Label
          htmlFor='roomType'
          className='pr-2'>
          Room Type:
        </Label>
        <select
          id='roomType'
          name='roomType'
          className='rounded-lg border text-center'
          value={roomInformation.roomType}
          onChange={(event) => {
            const roomType = event.target.value as RoomInformation["roomType"];
            setRoomInformation({...roomInformation, roomType});
          }}>
          <option value='chat'>Chat</option>
          <option value='video'>Video</option>
          <option value='audio'>Audio</option>
        </select>
      </div>
      <Button
        type='submit'
        className='my-2 w-full'>
        &rarr; Create Room
      </Button>
    </form>
  );
}

/**
 * This component renders a form that allows users to join a chat room.
 * @returns The JSX for the join room form.
 */
export function JoinRoomForm() {
  const router = useRouter();
  const {toast} = useToast();
  const {socket} = useSocket();
  const [roomInformation, setRoomInformation] = useState<RoomInformation>({
    roomName: "",
    roomType: "chat",
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("join-room", roomInformation);
      // wait 2 seconds for the room to be "ready".
      setTimeout(() => router.push(`rooms/${roomInformation.roomName}`), 2000);
    } else {
      toast({
        variant: "destructive",
        title: "Socket not connected.",
        description: "Please wait for the connection to be established.",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='flex flex-col flex-nowrap gap-2'>
      <span className='block'> Option 2. Join a chat room.</span>
      <Label
        htmlFor='room'
        className='pr-2'>
        Room Name:
      </Label>
      <Input
        name='room'
        type='text'
        className='rounded-lg border text-center'
        placeholder='Enter the room name'
        value={roomInformation.roomName}
        onChange={(event) => setRoomInformation({...roomInformation, roomName: event.target.value})}
        required
      />
      <Button
        type='submit'
        className='my-2 w-full'>
        Join Room &rarr;
      </Button>
    </form>
  );
}
