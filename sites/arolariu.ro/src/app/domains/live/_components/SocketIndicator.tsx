/** @format */
"use client";

import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {useSocket} from "@/hooks/useSocket";
import {useUser} from "@clerk/nextjs";
import {useState} from "react";

export const SocketIndicator = () => {
  const {user} = useUser();
  const {socket, isConnected, latency} = useSocket();
  const [refreshLatency, setRefreshLatency] = useState<number>(latency);

  if (!isConnected) {
    return <span className='rounded-xl border bg-yellow-600 p-1'>Fallback: Polling every 1s</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className='cursor-help rounded-xl border bg-green-600 p-1'
            onClick={() => {
              const startDate = new Date();
              socket.emit("ping", () => {
                const duration = new Date().getTime() - startDate.getTime();
                setRefreshLatency(duration);
              });
            }}>
            Live: Real-time updates
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className='block text-xs'>
            Connected to: <code>/api/socket/io</code>
          </span>
          <span className='block text-xs'>
            Socket ID: <code>{socket?.id}</code>
          </span>
          <span className='block text-xs'>
            User: <code>{user?.primaryEmailAddress?.emailAddress ?? "anonymous"}</code>
          </span>
          <span className='block text-xs'>
            Latency: <code>{refreshLatency}ms</code>
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
