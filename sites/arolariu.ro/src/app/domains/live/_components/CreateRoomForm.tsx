/** @format */
"use client";

import {Button} from "@/components/ui/button";
import {useUser} from "@clerk/nextjs";
import {randomBytes} from "crypto";

export default function CreateRoomForm() {
  const {user} = useUser();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const roomOwner = user?.primaryEmailAddress?.emailAddress ?? "anonymous";
    const roomName =
      (formData.get("room") as string) !== ""
        ? formData.get("room")
        : document.getElementById("room")!.getAttribute("placeholder");
    console.log("Creating room with the following properties: ", {roomOwner, roomName});
  };

  return (
    <form onSubmit={handleSubmit}>
      <span className='block'> Option 1. Create a chat room.</span>
      <label
        htmlFor='room'
        className='pr-2'>
        Room Name:
      </label>
      <input
        id='room'
        name='room'
        type='text'
        className='rounded-lg border text-center'
        placeholder={randomBytes(4).toString("hex")}
      />
      <Button
        type='submit'
        className='my-2 w-full'>
        Create Room
      </Button>
    </form>
  );
}
