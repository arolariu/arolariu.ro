"use client";

import {formatDateTime} from "@/lib/utils.generic";
import {Avatar, AvatarFallback, AvatarImage} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale, useTranslations} from "next-intl";
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
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoices.messageList");

  return (
    <div className={styles["messageList"]}>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: index === messages.length - 1 ? 0.2 : 0}}
          className={`${styles["messageItem"]} ${message.role === "user" ? styles["messageUser"] : styles["messageAssistant"]}`}>
          <Avatar className={styles["avatar"]}>
            {message.role === "assistant" ? (
              <>
                <AvatarFallback className={styles["avatarFallbackAssistant"]}>
                  <TbRobot className={styles["robotIcon"]} />
                </AvatarFallback>
                <AvatarImage src='/placeholder.svg?height=32&width=32' />
              </>
            ) : (
              <>
                <AvatarFallback className={styles["avatarFallbackUser"]}>
                  <TbUser className={styles["userIcon"]} />
                </AvatarFallback>
                <AvatarImage src='/placeholder.svg?height=32&width=32' />
              </>
            )}
          </Avatar>
          <div className={styles["messageBody"]}>
            <div className={styles["messageHeader"]}>
              <p className={styles["messageSender"]}>{message.role === "assistant" ? t("aiAssistant") : t("you")}</p>
              <span className={styles["messageTimestamp"]}>{formatDateTime(message.timestamp, locale, {timeStyle: "short"})}</span>
            </div>
            <div className={styles["messageContent"]}>
              {message.content.split("\n").map((line, lineIndex) => (
                <p
                  key={`${message.id}-line-${lineIndex}`}
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
