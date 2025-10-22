"use client";

import {dumpBrowserInformation} from "@/lib/utils.client";
import {Badge, Button, Card, CardContent, CardFooter, Progress, Separator} from "@arolariu/components";
import {useEffect, useState} from "react";
import {TbArrowRight, TbCode, TbCpu, TbDatabase, TbLayersIntersect, TbRefresh, TbServer, TbTerminal} from "react-icons/tb";

interface GlobalErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

/**
 * This component is used to display a global error message when an error occurs in the application.
 * It provides a button to reset the error state and try again.
 * @param error The error object containing information about the error that occurred.
 * @param reset A function to reset the error state and retry the operation.
 * @returns A JSX element representing the global error message and retry button.
 */
export default function GlobalError({error, reset}: Readonly<GlobalErrorProps>): React.JSX.Element {
  const [progress, setProgress] = useState(0);

  // Log the error
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  // Simulate progress for diagnostic animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang='en'>
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <section className='px-12 py-24'>
          {/* Main error card */}
          <Card className='border-destructive/50'>
            <CardContent className='pt-6'>
              <div className='flex flex-col gap-2'>
                <div className='space-y-4'>
                  <div>
                    <h2 className='mb-2 text-xl font-semibold'>Error Details</h2>
                    <p className='text-muted-foreground'>{error.message || "An unexpected error occurred"}</p>
                  </div>

                  <div>
                    <h3 className='mb-2 text-sm font-medium'>Error ID (digest)</h3>
                    <div className='bg-muted rounded-md p-2 font-mono text-xs'>{error.digest ?? "N/A"}</div>
                  </div>
                  <div>
                    <h3 className='mb-2 text-sm font-medium'>Error Cause</h3>
                    <div className='bg-muted rounded-md p-2 font-mono text-xs'>{(error.cause as string) || "No cause available."}</div>
                  </div>

                  <div>
                    <h3 className='mb-2 text-sm font-medium'>Store</h3>
                    <div className='bg-muted h-32 overflow-auto rounded-md p-2 font-mono text-xs'>
                      <pre>{dumpBrowserInformation()}</pre>
                    </div>
                  </div>
                </div>

                <div className='space-y-6'>
                  <div>
                    <h2 className='mb-4 text-xl font-semibold'>System Diagnostics</h2>
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <TbServer className='h-4 w-4' />
                          <span className='text-sm'>Server Status</span>
                        </div>
                        <Badge variant='destructive'>Impacted</Badge>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <TbDatabase className='h-4 w-4' />
                          <span className='text-sm'>Database Connection</span>
                        </div>
                        <Badge variant='outline'>Unknown</Badge>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <TbCpu className='h-4 w-4' />
                          <span className='text-sm'>Runtime Environment</span>
                        </div>
                        <Badge>Operational</Badge>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <TbLayersIntersect className='h-4 w-4' />
                          <span className='text-sm'>Application Layer</span>
                        </div>
                        <Badge variant='destructive'>Error</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className='mb-2 text-sm font-medium'>Diagnostic Scan</h3>
                    <Progress
                      value={progress}
                      className='h-2'
                    />
                    <p className='text-muted-foreground mt-2 text-xs'>
                      {progress < 100 ? "Analyzing system components..." : "Analysis complete"}
                    </p>
                  </div>

                  <div className='bg-muted rounded-md p-3'>
                    <div className='mb-2 flex items-center gap-2'>
                      <TbTerminal className='h-4 w-4' />
                      <h3 className='text-sm font-medium'>Recommended Action</h3>
                    </div>
                    <p className='text-muted-foreground text-sm'>
                      Try refreshing the page. If the problem persists, contact your system administrator.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className='flex items-center justify-between justify-items-center'>
              <Button
                onClick={reset}
                className='cursor-pointer gap-2'
                size='lg'>
                <TbRefresh className='h-4 w-4' />
                Retry
              </Button>
              <Button
                variant='outline'
                // eslint-disable-next-line react/jsx-no-bind -- this does a page refresh.
                onClick={() => globalThis.window.location.reload()}
                className='cursor-pointer gap-2'
                size='lg'>
                Reload Application
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section className='px-12 py-24'>
          {/* Technical details */}
          <div className='border-border rounded-md border p-4'>
            <div className='mb-3 flex items-center gap-2'>
              <TbCode className='h-4 w-4' />
              <h3 className='text-sm font-medium'>Technical Information</h3>
            </div>
            <Separator className='mb-3' />
            <div className='grid gap-2 text-xs'>
              <div className='flex items-center gap-2'>
                <TbArrowRight className='h-3 w-3' />
                <span className='font-medium'>Timestamp:</span>
                <span className='text-muted-foreground'>{new Date().toISOString()}</span>
              </div>
              <div className='flex items-center gap-2'>
                <TbArrowRight className='h-3 w-3' />
                <span className='font-medium'>User Agent:</span>
                <span className='text-muted-foreground truncate'>{globalThis.navigator.userAgent ?? "Unknown"}</span>
              </div>
              <div className='flex items-center gap-2'>
                <TbArrowRight className='h-3 w-3' />
                <span className='font-medium'>Error Type:</span>
                <span className='text-muted-foreground'>{error.name || "Unknown Error"}</span>
              </div>
              <div className='flex items-center gap-2'>
                <TbArrowRight className='h-3 w-3' />
                <span className='font-medium'>Digest:</span>
                <span className='text-muted-foreground'>{error.digest ?? "N/A"}</span>
              </div>
              <div className='flex items-center gap-2'>
                <TbArrowRight className='h-3 w-3' />
                <span className='font-medium'>Stack Trace:</span>
                <span className='text-muted-foreground'>{error.stack ?? "N/A"}</span>
              </div>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
