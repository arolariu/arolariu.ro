/** @format */
"use client";

import {Button} from "@/components/ui/button";

/**
 * This component renders a form that allows users to join a chat room.
 * @returns The JSX for the join room form.
 */
export default function JoinRoomForm() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const roomName = formData.get("room");
    console.log("Joining room with the following properties:", {roomName});
  };

  return (
    <form onSubmit={handleSubmit}>
      <span className='block'> Option 2. Join a chat room.</span>
      <label
        htmlFor='room'
        className='pr-2'>
        Room Name:
      </label>
      <input
        name='room'
        type='text'
        className='rounded-lg border text-center'
        placeholder='Enter the room name'
        required
      />
      <Button
        type='submit'
        className='my-2 w-full'>
        Join Room
      </Button>
    </form>
  );
}
