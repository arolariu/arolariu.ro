/** @format */

import RenderForbiddenScreen from "@/app/domains/_components/RenderForbiddenScreen";
import {fetchUser} from "@/lib/actions/fetchUser";
import {Metadata} from "next";
import RenderRoomScreen from "./island";

interface Props {
  params: {roomName: string};
}

/**
 * This function generates the metadata for the room page.
 * @returns The metadata for the room page.
 */
export async function generateMetadata({params}: Readonly<Props>): Promise<Metadata> {
  return {
    title: `Room #${params.roomName}`,
    description: `Join the chat room #${params.roomName} on arolariu.ro.`,
  };
}

/**
 * This function returns the room page JSX.
 * @returns The room page JSX.
 */
export default async function RoomPage({params}: Readonly<Props>) {
  const {isAuthenticated} = await fetchUser();
  if (isAuthenticated) return <RenderRoomScreen roomId={params.roomName} />;
  return <RenderForbiddenScreen />;
}
