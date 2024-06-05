/** @format */

import {SocketProvider} from "@/hooks/useSocket";
import {ReactNode} from "react";
import {SocketIndicator} from "./_components/SocketIndicator";

export default function LiveRootLayout({children}: {children: ReactNode}) {
  return (
    <main className='flex flex-col items-center justify-center justify-items-center border px-12 py-24'>
      <SocketProvider>
        <aside className='ml-auto flex items-center'>
          <SocketIndicator />
        </aside>
        {children}
      </SocketProvider>
    </main>
  );
}
