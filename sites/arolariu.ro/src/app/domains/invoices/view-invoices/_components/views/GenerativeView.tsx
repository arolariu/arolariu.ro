"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef, useState} from "react";
import {TbHelpCircle, TbMessage, TbSettings} from "react-icons/tb";
import {MessageList} from "../MessageList";
import styles from "./GenerativeView.module.scss";

type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
};

type Props = Readonly<{
  invoices: ReadonlyArray<Invoice>;
}>;

/**
 * This function renders the generative view for invoice analysis.
 * It allows users to chat with an AI assistant to analyze invoices and get insights.
 * @returns This function renders the generative view for invoice analysis.
 */
export default function RenderGenerativeView({invoices}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--List.generativeView");
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      content: t("welcomeMessage"),
      role: "assistant",
      timestamp: new Date().toISOString(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // todo: complete this.
  console.log(invoices);
  console.log(setMessages);

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.5}}
      className={styles["container"]}>
      <div className={styles["header"]}>
        <div>
          <h2 className={styles["title"]}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className={styles["helpButton"]}>
          <TbHelpCircle className={styles["actionIcon"]} />
          <span>{t("help")}</span>
        </Button>
      </div>

      <Tabs
        defaultValue='chat'
        className={styles["fullWidth"]}>
        <TabsList>
          <TabsTrigger
            value='chat'
            className={styles["tabTrigger"]}>
            <TbMessage className={styles["actionIcon"]} />
            <span>{t("tabs.chat")}</span>
          </TabsTrigger>
          <TabsTrigger
            value='settings'
            className={styles["tabTrigger"]}>
            <TbSettings className={styles["actionIcon"]} />
            <span>{t("tabs.settings")}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value='chat'
          className={styles["tabContent"]}>
          <Card className={styles["fullWidth"]}>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("chatDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["chatContainer"]}>
                <div className={styles["chatMessages"]}>
                  <MessageList messages={messages} />
                  <div ref={messagesEndRef} />
                </div>
                <div className={styles["chatInput"]} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent
          value='settings'
          className={styles["tabContent"]}>
          <Card className={styles["fullWidth"]}>
            <CardHeader>
              <CardTitle>{t("settings.title")}</CardTitle>
              <CardDescription>{t("settings.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["settingsContainer"]}>
                <div className={styles["settingsField"]}>
                  <Label htmlFor='history'>{t("settings.historyLabel")}</Label>
                  <Select defaultValue='30'>
                    <SelectTrigger id='history'>
                      <SelectValue placeholder={t("settings.retentionPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='30'>{t("settings.retention.30")}</SelectItem>
                      <SelectItem value='60'>{t("settings.retention.60")}</SelectItem>
                      <SelectItem value='90'>{t("settings.retention.90")}</SelectItem>
                      <SelectItem value='0'>{t("settings.retention.none")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={styles["settingsField"]}>
                  <span className={styles["settingsLabel"]}>{t("settings.dataAccessTitle")}</span>
                  <div className={styles["checkboxRow"]}>
                    <Checkbox
                      id='access-invoices'
                      defaultChecked
                    />
                    <Label
                      htmlFor='access-invoices'
                      className={styles["checkboxLabel"]}>
                      {t("settings.allowInvoiceData")}
                    </Label>
                  </div>
                  <div className={styles["checkboxRow"]}>
                    <Checkbox
                      id='access-merchants'
                      defaultChecked
                    />
                    <Label
                      htmlFor='access-merchants'
                      className={styles["checkboxLabel"]}>
                      {t("settings.allowMerchantData")}
                    </Label>
                  </div>
                </div>

                <div className={styles["settingsField"]}>
                  <span className={styles["settingsLabel"]}>{t("settings.notificationPreferences")}</span>
                  <div className={styles["checkboxRow"]}>
                    <Checkbox
                      id='notify-insights'
                      defaultChecked
                    />
                    <Label
                      htmlFor='notify-insights'
                      className={styles["checkboxLabel"]}>
                      {t("settings.notifyInsights")}
                    </Label>
                  </div>
                </div>

                <Button className={styles["saveButton"]}>{t("settings.save")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
