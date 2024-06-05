/** @format */

"use client";

export default function RenderRoomScreen({roomId}: Readonly<{roomId: string}>) {
  return (
    <div>
      <h1>Room {roomId}</h1>
    </div>
  );
}
