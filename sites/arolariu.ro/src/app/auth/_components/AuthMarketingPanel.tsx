import Image from "next/image";
import AuthBulletList from "./AuthBulletList";
import AuthTrustBadgesRow from "./AuthTrustBadgesRow";

export type AuthMarketingPanelProps = Readonly<{
  title: string;
  subtitle: string;
  illustrationSrc: string;
  illustrationAlt: string;
  bullets: Readonly<[string, string, string]>;
  trustBadges?: ReadonlyArray<string>;
}>;

export default function AuthMarketingPanel(props: AuthMarketingPanelProps): React.JSX.Element {
  return (
    <div className='relative space-y-6'>
      <div className='space-y-3'>
        <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>{props.title}</h1>
        <p className='text-muted-foreground text-base leading-relaxed sm:text-lg'>{props.subtitle}</p>

        {props.trustBadges && props.trustBadges.length > 0 ? (
          <AuthTrustBadgesRow
            className='mt-4'
            badges={props.trustBadges}
          />
        ) : null}
      </div>

      <div className='bg-card/40 relative mx-auto max-w-md overflow-hidden rounded-2xl border p-6 backdrop-blur-sm'>
        <div className='bg-primary/10 pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl' />
        <div className='bg-primary/10 pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full blur-3xl' />

        <Image
          src={props.illustrationSrc}
          alt={props.illustrationAlt}
          width={320}
          height={320}
          className='mx-auto h-48 w-48 object-contain sm:h-56 sm:w-56'
          priority
        />

        <AuthBulletList
          className='text-muted-foreground mt-6 space-y-2 text-sm'
          bullets={props.bullets}
        />
      </div>
    </div>
  );
}
