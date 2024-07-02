/** @format */

"use client";

import CreateRoomForm from "./CreateRoomForm";
import JoinRoomForm from "./JoinRoomForm";

/**
 * This component renders a form that allows users to create or join a chat room.
 * @returns The JSX for the room form.
 */
export default function RoomForm() {
  return (
    <div className='flex flex-col gap-4'>
      <CreateRoomForm />
      <hr />
      <JoinRoomForm />
    </div>
  );
}
