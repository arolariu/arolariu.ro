/** @format */
"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useRef, useState} from "react";
import {TbHelpCircle, TbMessage, TbSettings} from "react-icons/tb";
import {MessageList} from "../MessageList";

type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
};

type Props = {
  invoices: Invoice[];
};

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

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.5}}
      className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Live Analysis</h2>
          <p className='text-muted-foreground'>Chat with AI to analyze your invoices and get insights</p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='cursor-help gap-1'>
          <TbHelpCircle className='h-4 w-4' />
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
            <TbMessage className='h-4 w-4' />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value='settings'
            className='flex cursor-pointer items-center gap-2'>
            <TbSettings className='h-4 w-4' />
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
              <div className='flex h-[600px] flex-col overflow-hidden rounded-lg border'>
                <div className='flex-1 overflow-y-auto p-4'>
                  <MessageList messages={messages} />
                  <div ref={messagesEndRef} />
                </div>
                <div className='border-t p-4' />
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
              <div className='space-y-4'>
                <div className='grid gap-2'>
                  <label
                    htmlFor='history'
                    className='text-sm font-medium'>
                    Chat History
                  </label>
                  <select
                    id='history'
                    className='border-input bg-background w-full rounded-md border px-3 py-2'>
                    <option value='30'>Keep for 30 days</option>
                    <option value='60'>Keep for 60 days</option>
                    <option value='90'>Keep for 90 days</option>
                    <option value='0'>Don&apos;t save history</option>
                  </select>
                </div>

                <div className='grid gap-2'>
                  <span className='text-sm font-medium'>Data Access</span>
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='access-invoices'
                      className='rounded border-gray-300'
                      defaultChecked
                    />
                    <label
                      htmlFor='access-invoices'
                      className='text-sm'>
                      Allow access to invoice data
                    </label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='access-merchants'
                      className='rounded border-gray-300'
                      defaultChecked
                    />
                    <label
                      htmlFor='access-merchants'
                      className='text-sm'>
                      Allow access to merchant data
                    </label>
                  </div>
                </div>

                <div className='grid gap-2'>
                  <span className='text-sm font-medium'>Notification Preferences</span>
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='notify-insights'
                      className='rounded border-gray-300'
                      defaultChecked
                    />
                    <label
                      htmlFor='notify-insights'
                      className='text-sm'>
                      Notify me about new insights
                    </label>
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
