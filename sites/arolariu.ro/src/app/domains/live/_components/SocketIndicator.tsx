/** @format */
"use client";

import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {useSocket} from "@/hooks/useSocket";
import {useUser} from "@clerk/nextjs";
import {useEffect, useState} from "react";

export const SocketIndicator = () => {
  const {user} = useUser();
  const {socket, isConnected, latency} = useSocket();
  const [refreshLatency, setRefreshLatency] = useState<number>(latency);
  const [lastRefreshDate, setLastRefreshDate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      if (socket) {
        console.log(">>> Sending ping to socket ID:", socket.id);
        const startDate = new Date();
        socket.emit("ping", () => {
          const duration = Date.now() - startDate.getTime();
          setRefreshLatency(duration);
          setLastRefreshDate(new Date());
        });
      }
    }, 1000 * 10 /* every 10 seconds. */);

    return () => clearInterval(interval);
  }, [socket, lastRefreshDate]);

  if (!isConnected) return <span className='rounded-xl border bg-yellow-600 p-1'>Connecting...</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='cursor-help rounded-xl border bg-green-600 p-1'>Live: Real-time updates</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className='block text-xs'>
            Connected to: <code>/api/socket/io</code>
          </span>
          <span className='block text-xs'>
            Socket ID: <code>{socket?.id}</code>
          </span>
          <span className='block text-xs'>
            Last refresh date: <code>{lastRefreshDate.toLocaleString()}</code>
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
