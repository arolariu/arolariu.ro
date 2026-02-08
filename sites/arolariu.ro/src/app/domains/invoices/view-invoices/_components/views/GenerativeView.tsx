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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your invoice analysis assistant. How can I help you today? Try commands like /find to search invoices.",
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
          <h2 className={styles["title"]}>Live Analysis</h2>
          <p className={styles["subtitle"]}>Chat with AI to analyze your invoices and get insights</p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='cursor-help gap-1'>
          <TbHelpCircle className={styles["actionIcon"]} />
          <span>Help</span>
        </Button>
      </div>

      <Tabs
        defaultValue='chat'
        className='w-full'>
        <TabsList>
          <TabsTrigger
            value='chat'
            className='flex cursor-pointer items-center gap-2'>
            <TbMessage className={styles["actionIcon"]} />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value='settings'
            className='flex cursor-pointer items-center gap-2'>
            <TbSettings className={styles["actionIcon"]} />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value='chat'
          className='mt-4'>
          <Card className='w-full'>
            <CardHeader>
              <CardTitle>Live Analysis</CardTitle>
              <CardDescription>
                Chat with AI to analyze your invoices and get insights. Try commands like /find to search invoices.
              </CardDescription>
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
          className='mt-4'>
          <Card className='w-full'>
            <CardHeader>
              <CardTitle>Chat Settings</CardTitle>
              <CardDescription>Configure your AI assistant preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["settingsContainer"]}>
                <div className={styles["settingsField"]}>
                  <Label htmlFor='history'>Chat History</Label>
                  <Select defaultValue='30'>
                    <SelectTrigger id='history'>
                      <SelectValue placeholder='Select retention period' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='30'>Keep for 30 days</SelectItem>
                      <SelectItem value='60'>Keep for 60 days</SelectItem>
                      <SelectItem value='90'>Keep for 90 days</SelectItem>
                      <SelectItem value='0'>Don&apos;t save history</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={styles["settingsField"]}>
                  <span className={styles["settingsLabel"]}>Data Access</span>
                  <div className={styles["checkboxRow"]}>
                    <Checkbox
                      id='access-invoices'
                      defaultChecked
                    />
                    <Label
                      htmlFor='access-invoices'
                      className='text-sm font-normal'>
                      Allow access to invoice data
                    </Label>
                  </div>
                  <div className={styles["checkboxRow"]}>
                    <Checkbox
                      id='access-merchants'
                      defaultChecked
                    />
                    <Label
                      htmlFor='access-merchants'
                      className='text-sm font-normal'>
                      Allow access to merchant data
                    </Label>
                  </div>
                </div>

                <div className={styles["settingsField"]}>
                  <span className={styles["settingsLabel"]}>Notification Preferences</span>
                  <div className={styles["checkboxRow"]}>
                    <Checkbox
                      id='notify-insights'
                      defaultChecked
                    />
                    <Label
                      htmlFor='notify-insights'
                      className='text-sm font-normal'>
                      Notify me about new insights
                    </Label>
                  </div>
                </div>

                <Button className='w-full'>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
