"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@arolariu/components";
import {motion} from "motion/react";
import {TbRobot, TbUser} from "react-icons/tb";
import styles from "./MessageList.module.scss";

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
    <div className={styles["messageList"]}>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: index === messages.length - 1 ? 0.2 : 0}}
          className={`${styles["messageItem"]} ${message.role === "user" ? styles["messageUser"] : styles["messageAssistant"]}`}>
          <Avatar className='h-8 w-8'>
            {message.role === "assistant" ? (
              <>
                <AvatarFallback className='bg-primary/10'>
                  <TbRobot className={styles["robotIcon"]} />
                </AvatarFallback>
                <AvatarImage src='/placeholder.svg?height=32&width=32' />
              </>
            ) : (
              <>
                <AvatarFallback className='bg-secondary/10'>
                  <TbUser className={styles["userIcon"]} />
                </AvatarFallback>
                <AvatarImage src='/placeholder.svg?height=32&width=32' />
              </>
            )}
          </Avatar>
          <div className={styles["messageBody"]}>
            <div className={styles["messageHeader"]}>
              <p className={styles["messageSender"]}>{message.role === "assistant" ? "AI Assistant" : "You"}</p>
              <span className={styles["messageTimestamp"]}>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className={styles["messageContent"]}>
              {message.content.split("\n").map((line) => (
                <p
                  key={line}
                  className={styles["messageLine"]}>
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
