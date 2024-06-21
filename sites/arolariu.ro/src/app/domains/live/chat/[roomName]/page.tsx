/** @format */

import type {Metadata} from "next";
import RenderChatRoomScreen from "./island";

export const metadata: Metadata = {
  title: "Live",
  description: "Live chat and video call",
};

interface Props {
  params: {roomName: string};
}

export default function ChatRoom({params}: Readonly<Props>) {
  const {roomName} = params;
  return (
    <main className='px-5 py-24'>
      <h1>Chat Room: {roomName}</h1>
      <RenderChatRoomScreen roomName={roomName} />
    </main>
  );
}
