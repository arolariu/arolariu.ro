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
    <div style={{marginLeft: 'auto', marginRight: 'auto', width: '100%', maxWidth: '56rem', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '5rem', paddingBottom: '5rem'}}>
      <Card style={{border: '2px solid', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'}}>
        <CardHeader style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center'}}>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <TbShield style={{height: '3rem', width: '3rem', color: '#9333ea'}} />
          </div>
          <CardTitle>
            <h1 style={{fontSize: '1.5rem', fontWeight: '700'}}>Welcome to arolariu.ro</h1>
          </CardTitle>
          <CardDescription style={{fontSize: '1rem'}}>Please review and accept our terms to continue.</CardDescription>

          <div style={{marginLeft: 'auto', marginRight: 'auto', display: 'flex', maxWidth: '20rem', alignItems: 'center', gap: '0.75rem'}}>
            <Label
              htmlFor='locale-select-story'
              style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', whiteSpace: 'nowrap'}}>
              <TbGlobe style={{height: '1rem', width: '1rem'}} />
              Language
            </Label>
            <select
              id='locale-select-story'
              defaultValue='en'
              title='Language'
              style={{width: '100%', cursor: 'pointer', appearance: 'none', borderRadius: '0.375rem', border: '1px solid #e5e7eb', backgroundColor: 'transparent', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem'}}>
              <option value='en'>English (EN)</option>
              <option value='ro'>Română (RO)</option>
              <option value='fr'>Français (FR)</option>
            </select>
          </div>
        </CardHeader>

        <CardContent style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div style={{paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center', color: 'var(--muted-foreground)'}}>
            <span>By using this platform, you agree to our Terms of Service and Privacy Policy.</span>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
            <Card style={{height: '100%'}}>
              <CardHeader style={{paddingBottom: '0.5rem'}}>
                <CardTitle style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <TbLock style={{height: '1.25rem', width: '1.25rem', color: '#9333ea'}} />
                  Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent style={{fontSize: '0.875rem', color: 'var(--muted-foreground)'}}>Rules and guidelines for using the platform.</CardContent>
              <CardFooter>
                <Button
                  variant='outline'
                  style={{width: '100%', cursor: 'pointer'}}>
                  Read Terms
                </Button>
              </CardFooter>
            </Card>

            <Card style={{height: '100%'}}>
              <CardHeader style={{paddingBottom: '0.5rem'}}>
                <CardTitle style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <TbShield style={{height: '1.25rem', width: '1.25rem', color: '#9333ea'}} />
                  Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent style={{fontSize: '0.875rem', color: 'var(--muted-foreground)'}}>How we collect, use, and protect your data.</CardContent>
              <CardFooter>
                <Button
                  variant='outline'
                  style={{width: '100%', cursor: 'pointer'}}>
                  Read Policy
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Separator />

          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: '500'}}>
                <TbCookie style={{height: '1.25rem', width: '1.25rem', color: '#9333ea'}} />
                Cookie Preferences
              </h3>
            </div>

            <span style={{fontSize: '0.875rem', color: 'var(--muted-foreground)'}}>Choose which cookies you allow us to use.</span>

            <Accordion
              type='single'
              collapsible
              defaultValue='essential'
              style={{width: '100%'}}>
              <AccordionItem value='essential'>
                <AccordionTrigger style={{textDecoration: 'none'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'}}>
                    <TbLock style={{height: '1rem', width: '1rem', flexShrink: 0, color: '#9333ea'}} />
                    <span>Essential Cookies</span>
                    <Badge style={{marginLeft: '0.5rem'}}>Required</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem'}}>
                    <p style={{fontSize: '0.875rem', color: 'var(--muted-foreground)'}}>Required for basic site functionality and security.</p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                      <Switch
                        id='essential-story'
                        checked
                        disabled
                      />
                      <Label
                        htmlFor='essential-story'
                        style={{fontSize: '0.875rem', fontWeight: '500'}}>
                        Always enabled
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value='analytics'>
                <AccordionTrigger style={{textDecoration: 'none'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'}}>
                    <TbInfoCircleFilled style={{height: '1rem', width: '1rem', flexShrink: 0, color: '#9333ea'}} />
                    <span>Analytics Cookies</span>
                    <Badge
                      style={{marginLeft: '0.5rem'}}
                      variant='outline'>
                      Optional
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem'}}>
                    <p style={{fontSize: '0.875rem', color: 'var(--muted-foreground)'}}>Help us understand how users interact with the site.</p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                      <Switch
                        id='analytics-story'
                        checked={analyticsEnabled}
                        onCheckedChange={setAnalyticsEnabled}
                      />
                      <Label
                        htmlFor='analytics-story'
                        style={{fontSize: '0.875rem', fontWeight: '500'}}>
                        {analyticsEnabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>

        <CardFooter style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <Button
            size='lg'
            style={{width: '100%', cursor: 'pointer'}}>
            <TbCheck style={{marginRight: '0.5rem', height: '1rem', width: '1rem'}} /> Accept &amp; Continue
          </Button>
          <p style={{textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>
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
