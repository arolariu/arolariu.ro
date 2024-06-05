/** @format */

"use client";

import CreateRoomForm from "./CreateRoomForm";
import JoinRoomForm from "./JoinRoomForm";

export default function RoomForm() {
  return (
    <div className='flex flex-col gap-4'>
      <CreateRoomForm />
      <hr />
      <JoinRoomForm />
    </div>
  );
}
