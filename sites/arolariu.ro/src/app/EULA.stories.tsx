import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";
import {TbCheck, TbCookie, TbGlobe, TbInfoCircleFilled, TbLock, TbShield} from "react-icons/tb";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  Switch,
} from "@arolariu/components";

/**
 * Static visual preview of the EULA component.
 *
 * @remarks Static preview — component imports "use server" actions (getCookie/setCookie
 * from `@/lib/actions/cookies`) that cannot be bundled by Storybook's Vite/Rollup.
 * The actual component also depends on Zustand preferences store and privacy/terms
 * sub-screens. This story renders a faithful replica of the EULA consent card
 * using the same Card/Button/Badge/Accordion/Switch components from @arolariu/components.
 */
const meta = {
  title: "Pages/Home/EULA",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive EULA consent card demo matching the real component structure. */
function EulaDemo(): React.JSX.Element {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-20'>
      <Card className='border-2 shadow-lg'>
        <CardHeader className='flex flex-col gap-2 text-center'>
          <div className='flex justify-center'>
            <TbShield className='h-12 w-12 text-purple-600 dark:text-purple-400' />
          </div>
          <CardTitle>
            <h1 className='text-2xl font-bold md:text-3xl'>Welcome to arolariu.ro</h1>
          </CardTitle>
          <CardDescription className='text-base'>Please review and accept our terms to continue.</CardDescription>

          <div className='mx-auto flex max-w-xs items-center gap-3'>
            <Label
              htmlFor='locale-select-story'
              className='flex items-center gap-2 text-sm font-medium whitespace-nowrap'>
              <TbGlobe className='h-4 w-4' />
              Language
            </Label>
            <select
              id='locale-select-story'
              defaultValue='en'
              title='Language'
              className='w-full cursor-pointer appearance-none rounded-md border bg-transparent px-3 py-2 text-sm'>
              <option value='en'>English (EN)</option>
              <option value='ro'>Română (RO)</option>
              <option value='fr'>Français (FR)</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className='flex flex-col gap-6'>
          <div className='text-muted-foreground px-4 text-center'>
            <span>By using this platform, you agree to our Terms of Service and Privacy Policy.</span>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card className='h-full transition-colors hover:border-purple-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2'>
                  <TbLock className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                  Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent className='text-muted-foreground text-sm'>Rules and guidelines for using the platform.</CardContent>
              <CardFooter>
                <Button
                  variant='outline'
                  className='w-full cursor-pointer'>
                  Read Terms
                </Button>
              </CardFooter>
            </Card>

            <Card className='h-full transition-colors hover:border-purple-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2'>
                  <TbShield className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                  Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent className='text-muted-foreground text-sm'>How we collect, use, and protect your data.</CardContent>
              <CardFooter>
                <Button
                  variant='outline'
                  className='w-full cursor-pointer'>
                  Read Policy
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Separator />

          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <h3 className='flex items-center gap-2 text-lg font-medium'>
                <TbCookie className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                Cookie Preferences
              </h3>
            </div>

            <span className='text-muted-foreground text-sm'>Choose which cookies you allow us to use.</span>

            <Accordion
              type='single'
              collapsible
              defaultValue='essential'
              className='w-full'>
              <AccordionItem value='essential'>
                <AccordionTrigger className='hover:no-underline'>
                  <div className='flex items-center gap-2 text-sm'>
                    <TbLock className='h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400' />
                    <span>Essential Cookies</span>
                    <Badge className='ml-2'>Required</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-4 p-2'>
                    <p className='text-muted-foreground text-sm'>Required for basic site functionality and security.</p>
                    <div className='flex items-center gap-3'>
                      <Switch
                        id='essential-story'
                        checked
                        disabled
                      />
                      <Label
                        htmlFor='essential-story'
                        className='text-sm font-medium'>
                        Always enabled
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value='analytics'>
                <AccordionTrigger className='hover:no-underline'>
                  <div className='flex items-center gap-2 text-sm'>
                    <TbInfoCircleFilled className='h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400' />
                    <span>Analytics Cookies</span>
                    <Badge
                      className='ml-2'
                      variant='outline'>
                      Optional
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-4 p-2'>
                    <p className='text-muted-foreground text-sm'>Help us understand how users interact with the site.</p>
                    <div className='flex items-center gap-3'>
                      <Switch
                        id='analytics-story'
                        checked={analyticsEnabled}
                        onCheckedChange={setAnalyticsEnabled}
                      />
                      <Label
                        htmlFor='analytics-story'
                        className='text-sm font-medium'>
                        {analyticsEnabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>

        <CardFooter className='flex flex-col gap-4'>
          <Button
            size='lg'
            className='w-full cursor-pointer'>
            <TbCheck className='mr-2 h-4 w-4' /> Accept &amp; Continue
          </Button>
          <p className='text-muted-foreground text-center text-xs'>
            By using this platform, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

/** Default EULA consent card with all sections. */
export const Default: Story = {
  render: () => <EulaDemo />,
};
