"use client";

import {Badge} from "@arolariu/components";

export type AuthTrustBadgesRowProps = Readonly<{
  badges: ReadonlyArray<string>;
  className?: string;
}>;

export default function AuthTrustBadgesRow(props: AuthTrustBadgesRowProps): React.JSX.Element {
  return (
    <div className={props.className ?? "flex flex-wrap items-center gap-2"}>
      {props.badges.map((label) => (
        <Badge
          key={label}
          variant='secondary'>
          {label}
        </Badge>
      ))}
    </div>
  );
}
