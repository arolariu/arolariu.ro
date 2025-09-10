"use client";

import {Avatar, AvatarFallback, AvatarImage, cn} from "@arolariu/components";
import {motion} from "motion/react";
import {TbRobot, TbUser} from "react-icons/tb";

type Props = {
  messages: {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: string;
  }[];
};

/**
 * This function renders a list of messages in a chat interface.
 * Each message is displayed with an avatar, timestamp, and content.
 * @returns The rendered message list.
 */
export function MessageList({messages}: Readonly<Props>): React.JSX.Element {
  return (
    <div className='space-y-4'>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: index === messages.length - 1 ? 0.2 : 0}}
          className={cn("flex items-start gap-3 rounded-lg p-3", message.role === "user" ? "bg-muted/50" : "bg-primary/5")}>
          <Avatar className='h-8 w-8'>
            {message.role === "assistant" ? (
              <>
                <AvatarFallback className='bg-primary/10'>
                  <TbRobot className='text-primary h-4 w-4' />
                </AvatarFallback>
                <AvatarImage src='/placeholder.svg?height=32&width=32' />
              </>
            ) : (
              <>
                <AvatarFallback className='bg-secondary/10'>
                  <TbUser className='text-secondary-foreground h-4 w-4' />
                </AvatarFallback>
                <AvatarImage src='/placeholder.svg?height=32&width=32' />
              </>
            )}
          </Avatar>
          <div className='flex-1 space-y-1'>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-medium'>{message.role === "assistant" ? "AI Assistant" : "You"}</p>
              <span className='text-muted-foreground text-xs'>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className='prose prose-sm dark:prose-invert'>
              {message.content.split("\n").map((line) => (
                <p
                  key={line}
                  className='my-1 text-black dark:text-white'>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
