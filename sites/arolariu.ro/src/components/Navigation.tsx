/** @format */
"use client";

import type {NavigationItem} from "@/types";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@arolariu/components";

import {motion} from "motion/react";
import Link from "next/link";
import React, {useCallback, useState} from "react";
import {TbChevronDown, TbMenu} from "react-icons/tb";

const navigationItems: NavigationItem[] = [
  {
    label: "Domains",
    href: "/domains",
    children: [
      {
        label: "Invoices",
        href: "/domains/invoices",
        children: [
          {
            label: "Create",
            href: "/domains/invoices/create-invoice",
          },
          {
            label: "View",
            href: "/domains/invoices/view-invoices",
          },
        ],
      },
    ],
  },
  {
    label: "About",
    href: "/about",
    children: [
      {
        label: "The Platform",
        href: "/about/the-platform",
      },
      {
        label: "The Author",
        href: "/about/the-author",
      },
    ],
  },
] as const;

// Stateless desktop navigation components
const DesktopNavigationItem = ({
  item,
  isOpen,
  onOpenChange,
}: Readonly<{
  item: NavigationItem;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}>): React.JSX.Element => {
  if (!item.children) {
    return (
      <Button
        variant='ghost'
        asChild
        className='hover:bg-accent/50 h-9 px-3 py-2 text-sm font-medium'>
        <Link href={item.href}>{item.label}</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={onOpenChange}>
      <div className='flex items-center gap-0.5'>
        <Link
          href={item.href}
          className='hover:bg-accent/50 focus:bg-accent/50 rounded-l-md px-3 py-2 text-sm font-medium transition-colors focus:outline-hidden'>
          {item.label}
        </Link>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='hover:bg-accent/50 focus:bg-accent/50 h-9 w-8 rounded-r-md p-0 focus:outline-hidden'>
            <motion.div
              animate={{rotate: isOpen ? 180 : 0}}
              transition={{duration: 0.2}}>
              <TbChevronDown className='h-4 w-4' />
            </motion.div>
            <span className='sr-only'>Show {item.label} menu</span>
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        className='w-56'
        align='center'
        asChild>
        <motion.div
          initial={{opacity: 0, y: -10}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -10}}
          transition={{duration: 0.2}}>
          {item.children.map((child) => (
            <DesktopNavigationChildItem
              key={`desktop-child-${child.label}`}
              child={child}
            />
          ))}
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DesktopNavigationChildItem = ({child}: Readonly<{child: NavigationItem}>): React.JSX.Element => {
  const [isSubOpen, setIsSubOpen] = useState(false); // State needs to be at this level

  if (!child.children) {
    return (
      <DropdownMenuItem
        asChild
        className='focus:bg-accent/50 cursor-pointer'>
        <Link href={child.href}>{child.label}</Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      asChild
      className='p-0'>
      <div className='relative flex w-full justify-between'>
        <Link
          href={child.href}
          className='hover:bg-accent/50 flex-1 rounded-l-md px-2 py-1.5 text-sm'>
          {child.label}
        </Link>
        <DropdownMenu
          open={isSubOpen}
          onOpenChange={setIsSubOpen}>
          <DropdownMenuTrigger className='hover:bg-accent/50 rounded-r-md p-1'>
            <motion.div
              animate={{rotate: isSubOpen ? 180 : 0}}
              transition={{duration: 0.2}}>
              <TbChevronDown className='h-4 w-4' />
            </motion.div>
            <span className='sr-only'>Show {child.label} submenu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side='right'
            align='start'
            className='w-48'
            asChild>
            <motion.div
              initial={{opacity: 0, x: -10}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: -10}}
              transition={{duration: 0.2}}>
              {child.children.map((grandchild) => (
                <DropdownMenuItem
                  key={`desktop-grandchild-${grandchild.label}`}
                  asChild
                  className='focus:bg-accent/50 cursor-pointer'>
                  <Link
                    href={grandchild.href}
                    className='w-full'>
                    {grandchild.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </motion.div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DropdownMenuItem>
  );
};

// Stateless mobile navigation components
const MobileNavigationItem = ({
  item,
  isOpen,
  onToggle,
}: Readonly<{
  item: NavigationItem;
  isOpen?: boolean;
  onToggle?: () => void;
}>): React.JSX.Element => {
  if (!item.children) {
    return (
      <Button
        variant='ghost'
        asChild
        className='hover:bg-accent/50 h-auto w-full justify-start rounded-lg border px-4 py-3 font-medium'>
        <Link href={item.href}>{item.label}</Link>
      </Button>
    );
  }

  return (
    <Collapsible className='bg-background/50 mb-2 w-full overflow-hidden rounded-lg border backdrop-blur-xs'>
      <div className='flex items-center'>
        <Link
          href={item.href}
          className='flex-1 px-4 py-3 font-medium hover:underline'>
          {item.label}
        </Link>
        <CollapsibleTrigger asChild>
          <Button
            onClick={onToggle}
            variant='ghost'
            size='sm'
            className='hover:bg-accent/50 mr-2 h-8 w-8 rounded-full p-0'>
            <motion.div
              animate={{rotate: isOpen ? 180 : 0}}
              transition={{duration: 0.2}}>
              <TbChevronDown className='h-4 w-4' />
            </motion.div>
            <span className='sr-only'>Toggle {item.label} menu</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='border-t'>
        <motion.div
          initial={{opacity: 0, height: 0}}
          animate={{opacity: 1, height: "auto"}}
          exit={{opacity: 0, height: 0}}
          transition={{duration: 0.2}}
          className='bg-muted/30 flex flex-col space-y-1 p-2'>
          {item.children.map((child) => (
            <MobileNavigationChildItem
              key={`mobile-child-${child.label}`}
              child={child}
            />
          ))}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const MobileNavigationChildItem = ({child}: Readonly<{child: NavigationItem}>): React.JSX.Element => {
  const [isSubOpen, setIsSubOpen] = useState(false); // State needs to be at this level

  const handleSubToggle = useCallback(() => {
    setIsSubOpen((prev) => !prev);
  }, []);

  if (!child.children) {
    return (
      <Link
        href={child.href}
        className='hover:bg-accent/50 rounded-md px-3 py-2 transition-colors'>
        {child.label}
      </Link>
    );
  }

  return (
    <Collapsible className='w-full overflow-hidden rounded-md border'>
      <div className='flex items-center'>
        <Link
          href={child.href}
          className='flex-1 px-3 py-2 text-sm font-medium hover:underline'>
          {child.label}
        </Link>
        <CollapsibleTrigger asChild>
          <Button
            onClick={handleSubToggle}
            variant='ghost'
            size='sm'
            className='hover:bg-accent/50 mr-1 h-7 w-7 rounded-full p-0'>
            <motion.div
              animate={{rotate: isSubOpen ? 180 : 0}}
              transition={{duration: 0.2}}>
              <TbChevronDown className='h-3.5 w-3.5' />
            </motion.div>
            <span className='sr-only'>Toggle {child.label} submenu</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='cursor-pointer border-t'>
        <motion.div
          initial={{opacity: 0, height: 0}}
          animate={{opacity: 1, height: "auto"}}
          exit={{opacity: 0, height: 0}}
          transition={{duration: 0.2}}
          className='bg-muted/50 flex flex-col space-y-1 p-2'>
          {child.children.map((grandchild) => (
            <Link
              key={`mobile-grandchild-${grandchild.label}`}
              href={grandchild.href}
              className='hover:bg-accent/50 rounded-md px-3 py-1.5 text-sm transition-colors'>
              {grandchild.label}
            </Link>
          ))}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * This component renders the desktop navigation.
 * @returns The desktop navigation component.
 */
export function DesktopNavigation(): React.JSX.Element {
  // Store open states for top-level items
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  const handleOpenChange = useCallback((label: string, isOpen: boolean) => {
    setOpenStates((prev) => ({...prev, [label]: isOpen}));
  }, []);

  return (
    <div className='z-20 flex flex-row items-center justify-center justify-items-center space-x-1 text-center'>
      {navigationItems.map((item) => (
        <div
          key={`desktop-${item.label}`}
          className='relative'>
          <DesktopNavigationItem
            item={item}
            isOpen={openStates[item.label]}
            onOpenChange={(isOpen) => handleOpenChange(item.label, isOpen)}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * This component renders the mobile navigation.
 * @returns The mobile navigation component.
 */
export function MobileNavigation(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Store open states for top-level items
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback((label: string) => {
    setOpenStates((prev) => {
      // eslint-disable-next-line security/detect-object-injection -- we know the label exists in the state
      const currentState = prev?.[label] ?? false;
      return {...prev, [label]: !currentState};
    });
  }, []);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}>
      <SheetTrigger
        asChild
        className='lg:hidden'>
        <Button
          variant='outline'
          size='icon'
          className='hover:bg-accent/50 transition-colors'>
          <TbMenu className='h-5 w-5' />
          <span className='sr-only'>Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side='left'
        className='w-80 border-r sm:w-96'>
        <SheetHeader>
          <SheetTitle className='text-left'>Navigation</SheetTitle>
        </SheetHeader>
        <div className='px-2 py-6'>
          <div className='space-y-2'>
            {navigationItems.map((item) => (
              <div
                key={`mobile-${item.label}`}
                className='py-1'>
                <MobileNavigationItem
                  item={item}
                  isOpen={openStates[item.label]}
                  onToggle={() => handleToggle(item.label)}
                />
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
