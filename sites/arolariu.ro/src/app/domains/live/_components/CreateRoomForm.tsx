/** @format */
"use client";

import {Button} from "@/components/ui/button";
import {useUser} from "@clerk/nextjs";
import {useRouter} from "next/navigation";

/**
 * This function renders the create room form.
 * @returns  The JSX for the create room form.
 */
export default function CreateRoomForm() {
  const router = useRouter();
  const {user} = useUser();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const roomOwner = user?.primaryEmailAddress?.emailAddress ?? "anonymous";
    const roomName =
      (formData.get("room") as string) === ""
        ? (document.querySelector("#room")?.getAttribute("placeholder") ?? "")
        : (formData.get("room")?.toString() ?? "");

    console.log({roomOwner, roomName});

    router.push(`rooms/${roomName}`);
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
        placeholder={Math.random().toString(36).slice(0, 7)}
      />
      <Button
        type='submit'
        className='my-2 w-full'>
        Create Room
      </Button>
    </form>
  );
}
