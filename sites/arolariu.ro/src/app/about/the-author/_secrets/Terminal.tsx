/** @format */

"use client";

import {Button} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useEffect, useRef, useState} from "react";
import {TbTerminal, TbX} from "react-icons/tb";

/**
 * A customizable terminal-like component that emulates a command-line interface.
 * @returns A rendered terminal component with interactive command-line interface
 */
export default function Terminal(): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const commands = {
    help: "Available commands: help, about, skills, contact, clear, exit",
    about: "Alexandru Olariu - Software Engineer at Microsoft, passionate about cloud architecture and IoT.",
    skills: "C#, .NET, Azure, TypeScript, React, Next.js, Microservices, Cloud Architecture, Domain-Driven Design",
    contact: "Email: olariu.alexandru@pm.me\nGitHub: github.com/arolariu\nLinkedIn: linkedin.com/in/olariu-alexandru",
    clear: "CLEAR_TERMINAL",
    exit: "EXIT_TERMINAL",
  };

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    setCommandHistory([...commandHistory, trimmedCmd]);

    if (trimmedCmd === "clear") {
      setOutput([]);
      setCommandHistory([]);
    } else if (trimmedCmd === "exit") {
      setVisible(false);
      setTimeout(() => {
        setOutput([]);
        setCommandHistory([]);
      }, 500);
    } else if (trimmedCmd in commands) {
      setOutput([...output, commands[trimmedCmd as keyof typeof commands]]);
    } else if (trimmedCmd) {
      setOutput([...output, `Command not found: ${trimmedCmd}. Type 'help' for available commands.`]);
    }

    setCurrentCommand("");
    setTimeout(() => {
      if (terminalRef.current) {
        // eslint-disable-next-line functional/immutable-data
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "`" && e.ctrlKey) {
        setVisible((prev) => !prev);
        if (!visible && inputRef.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }
      if (e.key === "Escape" && visible) {
        setVisible(false);
        setTimeout(() => {
          setOutput([]);
          setCommandHistory([]);
        }, 500);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  useEffect(() => {
    // Add initial welcome message
    if (visible && output.length === 0) {
      setOutput([
        "Welcome to Alexandru's Terminal! Type 'help' to see available commands.",
        "Press Ctrl + ` to toggle this terminal at any time.",
      ]);
    }
  }, [visible, output.length]);

  return (
    <>
      {/* Terminal trigger button */}
      <motion.button
        className='fixed bottom-8 left-8 z-50 rounded-full bg-black p-3 text-green-400 shadow-lg transition-colors duration-300 hover:bg-black/90'
        whileHover={{scale: 1.1}}
        whileTap={{scale: 0.9}}
        onClick={() => setVisible(true)}>
        <TbTerminal className='h-6 w-6' />
      </motion.button>

      <AnimatePresence>
        {Boolean(visible) && (
          <motion.div
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 50}}
            transition={{duration: 0.3}}
            className='fixed bottom-24 left-8 z-50 w-[90vw] max-w-2xl'>
            <div className='overflow-hidden rounded-lg border border-green-500/30 bg-black/90 font-mono text-green-400 shadow-xl'>
              <div className='flex items-center justify-between border-b border-green-500/30 bg-black p-2'>
                <div className='flex items-center'>
                  <TbTerminal className='mr-2 h-4 w-4' />
                  <span className='text-green-300'>Alexandru&lsquo;s Terminal</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <span className='text-xs text-green-300/50'>Press Ctrl + ` to toggle</span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 text-green-300 hover:bg-red-500/20 hover:text-white'
                    onClick={() => setVisible(false)}>
                    <TbX className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              <div
                ref={terminalRef}
                className='custom-scrollbar h-[300px] overflow-y-auto p-4'>
                {output.map((line) => (
                  <div
                    key={line}
                    className='mb-2 whitespace-pre-wrap'>
                    {line}
                  </div>
                ))}
                {commandHistory.map((cmd) => (
                  <div
                    key={cmd}
                    className='mb-2'>
                    <span className='text-green-500'>$ </span>
                    <span>{cmd}</span>
                  </div>
                ))}

                <div className='flex items-center'>
                  <span className='mr-2 text-green-500'>$ </span>
                  <input
                    ref={inputRef}
                    type='text'
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCommand(currentCommand);
                      }
                    }}
                    className='flex-grow border-none bg-transparent text-green-400 outline-none'
                  />
                  <motion.div
                    animate={{opacity: [1, 0]}}
                    transition={{duration: 0.8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse"}}
                    className='h-5 w-2 bg-green-400'
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
