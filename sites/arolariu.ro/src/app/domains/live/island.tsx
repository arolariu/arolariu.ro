/** @format */
"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import RoomForm from "./_components/RoomForm";

export default function RenderLiveScreen() {
  return (
    <section className='flex py-12 2xsm:flex-col 2xsm:gap-4 lg:flex-row lg:gap-8'>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-black'>Chat rooms (WebSocket)</CardTitle>
          <CardDescription>
            Join or create a chat room. <br /> The chat rooms are real-time and can be accessed by room name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-black'>Video call (WebRTC)</CardTitle>
          <CardDescription>
            Start a video call with a peer. <br /> The video call is real-time and can be accessed by room name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm />
        </CardContent>
      </Card>
    </section>
  );
}
