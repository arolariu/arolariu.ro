"use client";

import {formatDateTime} from "@/lib/utils.generic";
import {Avatar, AvatarFallback} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
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
 * Splits message content into individually keyed lines.
 *
 * @remarks
 * Derives each line's key from its own text plus an occurrence counter
 * (rather than its array position), so duplicate lines remain uniquely
 * identifiable without relying on array index as a React key.
 *
 * @param content - The raw message content, potentially spanning multiple lines.
 * @returns Line texts paired with stable, content-derived keys.
 */
function getContentLines(content: string): {key: string; text: string}[] {
  const occurrences = new Map<string, number>();
  return content.split("\n").map((text) => {
    const occurrence = occurrences.get(text) ?? 0;
    occurrences.set(text, occurrence + 1);
    return {key: `${text}::${occurrence}`, text};
  });
}

/**
 * This function renders a list of messages in a chat interface.
 * Each message is displayed with an avatar, timestamp, and content.
 * @returns The rendered message list.
 */
export function MessageList({messages}: Readonly<Props>): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();

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
              <AvatarFallback className={styles["avatarFallbackAssistant"]}>
                <TbRobot className={styles["robotIcon"]} />
              </AvatarFallback>
            ) : (
              <AvatarFallback className={styles["avatarFallbackUser"]}>
                <TbUser className={styles["userIcon"]} />
              </AvatarFallback>
            )}
          </Avatar>
          <div className={styles["messageBody"]}>
            <div className={styles["messageHeader"]}>
              <p className={styles["messageSender"]}>
                {message.role === "assistant"
                  ? t((m) => m.pages.invoices.viewInvoices.messageList.aiAssistant)
                  : t((m) => m.pages.invoices.viewInvoices.messageList.you)}
              </p>
              <span className={styles["messageTimestamp"]}>{formatDateTime(message.timestamp, locale, {timeStyle: "short"})}</span>
            </div>
            <div className={styles["messageContent"]}>
              {getContentLines(message.content).map((line) => (
                <p
                  key={`${message.id}-${line.key}`}
                  className={styles["messageLine"]}>
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
