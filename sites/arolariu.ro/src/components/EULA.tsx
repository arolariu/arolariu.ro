/** @format */

"use client";

import RenderPrivacyPolicyScreen from "@/app/privacy-policy/island";
import RenderTermsOfServiceScreen from "@/app/terms-of-service/island";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {getCookie, setCookie} from "@/lib/actions/cookies.action";
import {useEffect, useState} from "react";
import {Checkbox} from "./ui/checkbox";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "./ui/dialog";
import {useToast} from "./ui/use-toast";

function TermsOfService() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='m-4 w-1/2 p-4'>Terms of Service</Button>
      </DialogTrigger>
      <DialogContent className='max-h-[75vh] max-w-[75vw] overflow-y-scroll'>
        <DialogHeader>
          <DialogTitle className='text-center'>Terms of Service</DialogTitle>
          <DialogDescription>
            <RenderTermsOfServiceScreen />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyPolicy() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='m-4 w-1/2 p-4'>Privacy Policy</Button>
      </DialogTrigger>
      <DialogContent className='max-h-[75vh] max-w-[75vw] overflow-y-scroll'>
        <DialogHeader>
          <DialogTitle className='text-center'>Privacy Policy</DialogTitle>
          <DialogDescription className='modal-scroll'>
            <RenderPrivacyPolicyScreen />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The cookies banner component.
 * @returns The cookies banner component.
 */
function CookiesBanner() {
  const [cookiesState, setCookiesState] = useState({
    essential: true,
    analytics: true,
  });
  const {toast} = useToast();

  return (
    <Card className='m-4'>
      <CardHeader className='mb-4 border-b border-gray-300 pb-4'>
        <div className='items-center'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            className='mr-2 inline'
            strokeLinejoin='round'>
            <path d='M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5' />
            <path d='M8.5 8.5v.01' />
            <path d='M16 15.5v.01' />
            <path d='M12 12v.01' />
            <path d='M11 17v.01' />
            <path d='M7 14v.01' />
          </svg>
          <CardTitle className='inline tracking-wide'>Cookies Preference</CardTitle>
          <CardDescription>
            Manage your cookie settings. You can enable or disable different types of cookies below.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className='flex flex-col flex-wrap gap-4'>
          <div>
            Essential Cookies
            <small className='mb-2 block leading-tight tracking-wider'>
              Essential cookies are necessary for the website to function properly. <br />
              This category only includes cookies that ensures basic functionalities and security features of the
              website.
            </small>
            <Checkbox
              id='essential'
              className='size-5'
              checked={cookiesState.essential}
              disabled
            />
            <Label
              htmlFor='essential'
              className='ml-2 text-gray-400'>
              This option cannot be disabled. Essential cookies are always enabled.
            </Label>
          </div>
          <div>
            Analytics Cookies
            <small className='mb-2 block leading-tight tracking-wider'>
              These cookies allow us to count visits and traffic sources, so we can measure and improve the performance
              of our site. <br /> They help us know which pages are the most and least popular and see how visitors move
              around the site.
              <br />
              <em className='text-gray-400'>
                All information these cookies collect is aggregated and therefore can be considered anonymous.
              </em>
            </small>
            <Checkbox
              className='size-5'
              onClick={() => setCookiesState({...cookiesState, analytics: !cookiesState.analytics})}
              checked={cookiesState.analytics}
              id='analytics'
            />
            <Label
              htmlFor='analytics'
              className='ml-2 text-gray-400'>
              {cookiesState.analytics && "Thank you for enabling analytics!"}
              {!cookiesState.analytics && "Enabling the analytics cookies to helps us to improve our website."}
            </Label>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          variant='default'
          onClick={() => {
            setCookie({name: "accepted-cookies", value: JSON.stringify(cookiesState)}).then(() => {
              toast({
                title: "Cookies preferences saved!",
                description: "Your cookies preferences have been saved.",
                duration: 3000,
              });
            });
          }}>
          Save cookies configuration
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function EULA() {
  const [eulaAccepted, setEulaAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    getCookie({name: "eula-accepted"}).then((value) => {
      setEulaAccepted(value === "true");
    });
  }, []);

  if (eulaAccepted === null || eulaAccepted) return null;

  const handleAccept = () => {
    setCookie({name: "eula-accepted", value: "true"});
    setEulaAccepted(true);
  };

  return (
    <main className='fixed inset-0 flex items-center justify-center bg-black'>
      <section className='absolute top-0 flex h-screen w-full flex-col items-center justify-center justify-items-center gap-8'>
        <article className='w-1/2 rounded-xl bg-white shadow-inner shadow-black'>
          <h1 className='pt-2 text-center text-2xl font-bold underline'>End User License Agreement</h1>
          <article className='mt-4 text-center text-gray-600'>
            By using this website, you agree to the terms and conditions of the End User License Agreement (EULA).
            <br />
            Please read the following documents carefully before using the website:
          </article>
          <ul className='flex list-inside list-disc flex-col items-center'>
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
          </ul>
          <div className='justify-items-centers flex flex-row items-center justify-center gap-4'>
            <TermsOfService />
            <PrivacyPolicy />
          </div>
          <hr />
          <CookiesBanner />
          <div className='my-8 flex justify-center'>
            <Button
              variant='default'
              onClick={handleAccept}>
              Accept EULA
            </Button>
          </div>
        </article>
      </section>
    </main>
  );
}
