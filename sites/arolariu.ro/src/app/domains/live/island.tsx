/** @format */
"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {CreateRoomForm, JoinRoomForm} from "./_components/RoomForm";

/**
 * This function renders the live screen.
 * @returns The JSX for the live screen.
 */
export default function RenderLiveScreen() {
  return (
    <section className='flex py-12 2xsm:flex-col 2xsm:gap-4 lg:flex-row lg:gap-8'>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-black'>Live Chat Rooms</CardTitle>
          <CardDescription>
            Join or create a chat room. <br /> The chat rooms are real-time and can be accessed by room name.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <CreateRoomForm />
          <Separator orientation='horizontal' />
          <JoinRoomForm />
        </CardContent>
      </Card>
    </section>
  );
}
