import type {ReactNode} from "react";

export type AuthBulletListProps = Readonly<{
  bullets: ReadonlyArray<string>;
  className?: string;
  bulletAdornment?: ReactNode;
}>;

export default function AuthBulletList(props: AuthBulletListProps): React.JSX.Element {
  const bulletAdornment = props.bulletAdornment ?? (
    <span
      aria-hidden='true'
      className='bg-primary/70 mt-2 inline-block h-1.5 w-1.5 rounded-full'
    />
  );

  return (
    <ul className={props.className ?? "text-muted-foreground space-y-2 text-sm"}>
      {props.bullets.map((bullet, index) => (
        <li
          key={`${bullet}-${index}`}
          className='flex items-start gap-2'>
          {bulletAdornment}
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}
