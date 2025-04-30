/** @format */

"use client";

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from "@arolariu/components";
import {useCallback, useRef, useState} from "react";
import {TbSend, TbSparkles} from "react-icons/tb";

type Props = {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
};

// Available commands
const commands = [
  {
    id: "find",
    label: "/find",
    description: "Search for invoices by keyword, date, or amount",
    example: "/find groceries from last month",
  },
  {
    id: "analyze",
    label: "/analyze",
    description: "Analyze spending patterns",
    example: "/analyze spending trends by category",
  },
  {
    id: "compare",
    label: "/compare",
    description: "Compare spending between periods",
    example: "/compare this month vs last month",
  },
  {
    id: "summarize",
    label: "/summarize",
    description: "Get a summary of your invoices",
    example: "/summarize recent transactions",
  },
  {
    id: "predict",
    label: "/predict",
    description: "Predict future spending based on history",
    example: "/predict next month expenses",
  },
];

/**
 * The MessageInput component is a text input area for sending messages to an AI assistant.
 * It includes a button to send messages and a command menu for quick access to commands.
 * @returns The rendered MessageInput component.
 */
export function MessageInput({onSendMessage, isLoading}: Readonly<Props>): React.JSX.Element {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const handleSendMessage = useCallback(() => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");

      // Focus back on textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [inputValue, isLoading, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertCommand = (command: string) => {
    setInputValue(command + " ");
    setIsCommandOpen(false);

    // Focus and move cursor to end of input
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = command.length + 1;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 0);
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-end gap-2'>
        <div className='relative flex-1'>
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask a question about your invoices...'
            className='min-h-[80px] resize-none pr-12'
            disabled={isLoading}
          />
          <div className='absolute right-2 bottom-2 flex items-center gap-2'>
            <Popover
              open={isCommandOpen}
              onOpenChange={setIsCommandOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-full'
                  disabled={isLoading}>
                  <TbSparkles className='h-4 w-4' />
                  <span className='sr-only'>Commands</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className='p-0'
                align='end'
                side='top'>
                <Command>
                  <CommandInput placeholder='Search commands...' />
                  <CommandList>
                    <CommandEmpty>No commands found.</CommandEmpty>
                    <CommandGroup heading='Available Commands'>
                      {commands.map((command) => (
                        <CommandItem
                          key={command.id}
                          onSelect={() => insertCommand(command.label)}>
                          <span className='font-medium'>{command.label}</span>
                          <span className='text-muted-foreground ml-2 text-xs'>{command.description}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className='h-10 w-10 shrink-0 rounded-full p-0'>
          <TbSend className='h-4 w-4' />
          <span className='sr-only'>Send message</span>
        </Button>
      </div>
      <p className='text-muted-foreground text-xs'>Type a message or use commands to interact with the AI assistant.</p>
    </div>
  );
}
