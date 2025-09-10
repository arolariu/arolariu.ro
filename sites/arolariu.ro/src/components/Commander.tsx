"use client";

import {useFontContext} from "@/contexts/FontContext";
import {setCookie} from "@/lib/actions/cookies";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@arolariu/components/command";
import {useTheme} from "next-themes";
import {useRouter} from "next/navigation";
import {memo, useCallback, useEffect, useState} from "react";
import {
  TbAccessible,
  TbBrandGithub,
  TbCalculator,
  TbCalendar,
  TbCpu,
  TbHome,
  TbLanguage,
  TbMoon,
  TbSettings,
  TbSun,
  TbTypeface,
} from "react-icons/tb";

/**
 * Command palette component that provides a command input and a list of commands.
 * It allows users to quickly navigate and perform actions within the application.
 * @returns The rendered command palette component.
 */
function Commander(): React.JSX.Element {
  const router = useRouter();
  const {setTheme} = useTheme();
  const {setFont} = useFontContext();
  const [open, setOpen] = useState<boolean>(false);

  // Helper to close the palette and run a command action
  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleRainbowEffect = useCallback(() => {
    const headings = globalThis.document.querySelectorAll("h1, h2, h3, h4, h5, h6");

    for (const heading of headings) {
      const originalColor = globalThis.getComputedStyle(heading).color;
      (heading as HTMLElement).style.background = "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)";
      (heading as HTMLElement).style.backgroundClip = "text";
      (heading as HTMLElement).style.color = "transparent";

      // Reset after 10 seconds
      setTimeout(() => {
        (heading as HTMLElement).style.background = "";
        (heading as HTMLElement).style.backgroundClip = "";
        (heading as HTMLElement).style.color = originalColor;
      }, 10_000);
    }
  }, []);

  const handleDiscoEffect = useCallback(() => {
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33F3", "#33FFF3"];
    const elements = globalThis.document.querySelectorAll("section");

    // Store original backgrounds using map
    const originalBackgrounds = [...elements].map((element) => {
      const computedStyle = globalThis.getComputedStyle(element);
      return computedStyle.background;
    });

    // Apply disco effect
    const discoInterval = setInterval(() => {
      for (const [index, element] of elements.entries()) {
        const colorIndex = index % colors.length;
        element.style.background = colors.at(colorIndex) ?? "#FF5733";
      }
    }, 500);

    // Reset after 10 seconds
    setTimeout(() => {
      clearInterval(discoInterval);
      elements.forEach((el, index) => {
        el.style.background = originalBackgrounds.at(index) ?? "#FF5733";
      });
    }, 10_000);
  }, []);

  const handleMatrixEffect = useCallback(() => {
    const canvas = globalThis.document.createElement("canvas");

    canvas.width = globalThis.innerWidth;
    canvas.height = globalThis.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "9999";
    canvas.style.pointerEvents = "none";

    globalThis.document.body.append(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
    const fontSize = 10;
    const columns = canvas.width / fontSize;

    // Create an array of column positions, each starting with a drop position of 1
    const drops: number[] = Array.from({length: columns}, () => 1);

    const draw = () => {
      if (!ctx) {
        return;
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0";

      ctx.font = `${fontSize}px monospace`;

      // Create a new array by mapping over the drop positions
      const newDrops = drops.map((drop, index) => {
        // eslint-disable-next-line sonarjs/pseudo-random
        const randomIndex = Math.floor(Math.random() * matrix.length);
        const characterToRender = matrix.charAt(randomIndex);

        const xValue = index * fontSize;
        const yValue = drop * fontSize;

        if (ctx) {
          ctx.fillText(characterToRender, xValue, yValue);
        }

        // eslint-disable-next-line sonarjs/pseudo-random
        if (drop * fontSize > canvas.height && Math.random() > 0.975) {
          return 0;
        }
        return drop + 1;
      });

      // Replace the drops array instead of modifying it

      drops.splice(0, drops.length, ...newDrops);
    };

    const matrixInterval = setInterval(draw, 33);

    // Remove after 10 seconds
    setTimeout(() => {
      clearInterval(matrixInterval);
      canvas.remove();
    }, 10_000);
  }, []);

  // Handle keyboard shortcuts for opening the command palette
  useEffect(() => {
    const handleCommandsKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    globalThis.document.addEventListener("keydown", handleCommandsKey);
    return () => globalThis.document.removeEventListener("keydown", handleCommandsKey);
  }, []);

  // Memoized onSelect handlers to avoid inline arrow functions in JSX
  const onSelectHome = useCallback(
    (_: string) => {
      runCommand(() => {
        router.replace("/");
      });
    },
    [router, runCommand],
  );

  const onSelectThemeLight = useCallback(
    (_: string) => {
      runCommand(() => {
        setTheme("light");
      });
    },
    [setTheme, runCommand],
  );

  const onSelectThemeDark = useCallback(
    (_: string) => {
      runCommand(() => {
        setTheme("dark");
      });
    },
    [setTheme, runCommand],
  );

  const onSelectThemeSystem = useCallback(
    (_: string) => {
      runCommand(() => {
        setTheme("system");
      });
    },
    [setTheme, runCommand],
  );

  const onSelectLangEnglish = useCallback(
    (_: string) => {
      runCommand(() => {
        void setCookie("locale", "en");
      });
    },
    [runCommand],
  );

  const onSelectLangRomanian = useCallback(
    (_: string) => {
      runCommand(() => {
        void setCookie("locale", "ro");
      });
    },
    [runCommand],
  );

  const onSelectFontNormal = useCallback(
    (_: string) => {
      runCommand(() => {
        setFont("normal");
      });
    },
    [setFont, runCommand],
  );

  const onSelectFontDyslexic = useCallback(
    (_: string) => {
      runCommand(() => {
        setFont("dyslexic");
      });
    },
    [setFont, runCommand],
  );

  const onSelectRainbow = useCallback(
    (_: string) => {
      runCommand(handleRainbowEffect);
    },
    [runCommand, handleRainbowEffect],
  );

  const onSelectDisco = useCallback(
    (_: string) => {
      runCommand(handleDiscoEffect);
    },
    [runCommand, handleDiscoEffect],
  );

  const onSelectMatrix = useCallback(
    (_: string) => {
      runCommand(handleMatrixEffect);
    },
    [runCommand, handleMatrixEffect],
  );

  const onSelectGithub = useCallback(
    (_: string) => {
      runCommand(() => {
        globalThis.open("https://github.com/arolariu", "_blank", "noopener");
      });
    },
    [runCommand],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}>
      <CommandInput
        placeholder='Type a command or search...'
        className='border-none focus-visible:ring-0 focus-visible:ring-blue-500 focus-visible:outline-hidden'
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Navigation'>
          <CommandItem onSelect={onSelectHome}>
            <TbHome className='mr-2 h-4 w-4' />
            <span>Homepage</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Set Theme'>
          <CommandItem onSelect={onSelectThemeLight}>
            <TbSun className='mr-2 h-4 w-4' />
            <span>Light</span>
          </CommandItem>
          <CommandItem onSelect={onSelectThemeDark}>
            <TbMoon className='mr-2 h-4 w-4' />
            <span>Dark</span>
          </CommandItem>
          <CommandItem onSelect={onSelectThemeSystem}>
            <TbSettings className='mr-2 h-4 w-4' />
            <span>System</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Set Language'>
          <CommandItem onSelect={onSelectLangEnglish}>
            <TbLanguage className='mr-2 h-4 w-4' />
            <span>English</span>
          </CommandItem>
          <CommandItem onSelect={onSelectLangRomanian}>
            <TbLanguage className='mr-2 h-4 w-4' />
            <span>Romanian</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Set Font'>
          <CommandItem onSelect={onSelectFontNormal}>
            <TbTypeface className='mr-2 h-4 w-4' />
            <span>Normal</span>
          </CommandItem>
          <CommandItem onSelect={onSelectFontDyslexic}>
            <TbAccessible className='mr-2 h-4 w-4' />
            <span>Dyslexic</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Easter Eggs'>
          <CommandItem onSelect={onSelectRainbow}>
            <TbCpu className='mr-2 h-4 w-4' />
            <span>Rainbow Mode</span>
          </CommandItem>
          <CommandItem onSelect={onSelectDisco}>
            <TbCalculator className='mr-2 h-4 w-4' />
            <span>Disco Mode</span>
          </CommandItem>
          <CommandItem onSelect={onSelectMatrix}>
            <TbCalendar className='mr-2 h-4 w-4' />
            <span>Matrix Mode</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Links'>
          <CommandItem onSelect={onSelectGithub}>
            <TbBrandGithub className='mr-2 h-4 w-4' />
            <span>GitHub</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default memo(Commander);
