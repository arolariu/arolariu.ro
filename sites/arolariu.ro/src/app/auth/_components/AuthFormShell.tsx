import Link from "next/link";

export type AuthFormShellProps = Readonly<{
  kicker: string;
  secondaryPrompt: string;
  secondaryAction: string;
  secondaryHref: string;
  footer: string;
  children: React.ReactNode;
}>;

export default function AuthFormShell(props: AuthFormShellProps): React.JSX.Element {
  return (
    <div className='mx-auto w-full max-w-md space-y-6'>
      <div className='text-center'>
        <p className='text-muted-foreground text-sm'>{props.kicker}</p>
        <p className='text-muted-foreground mt-2 text-sm'>
          {props.secondaryPrompt}{" "}
          <Link
            href={props.secondaryHref}
            className='text-primary font-medium underline-offset-4 hover:underline'>
            {props.secondaryAction}
          </Link>
        </p>
      </div>

      {props.children}

      <p className='text-muted-foreground text-center text-xs'>{props.footer}</p>
    </div>
  );
}
