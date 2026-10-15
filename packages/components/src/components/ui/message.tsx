import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./message.module.css";

/** Logical side of a message row. */
export type MessageAlign = "start" | "end";
/** Native message collection props; semantic/log policy is caller-owned. */
export type MessageGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native message row props with logical alignment. */
export type MessageProps = Readonly<React.ComponentPropsWithRef<"div"> & {align?: MessageAlign}>;
/** Native avatar wrapper props, intended for composition with the reviewed Avatar. */
export type MessageAvatarProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native shrinking message content column props. */
export type MessageContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native caller-owned message metadata/header props. */
export type MessageHeaderProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native caller-owned footer/status/action props. */
export type MessageFooterProps = Readonly<React.ComponentPropsWithRef<"div">>;

/** Groups native message rows without creating application state or live announcements. */
const MessageGroup = ({ref, className, ...props}: Readonly<MessageGroup.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-group'
    className={cn(styles.group, className)}
    {...props}
  />
);
MessageGroup.displayName = "MessageGroup";

/** Arranges caller-owned avatar and message content at a logical start or end side. */
const Message = ({ref, className, align = "start", ...props}: Readonly<Message.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message'
    data-align={align}
    className={cn(styles.message, className)}
    {...props}
  />
);
Message.displayName = "Message";

/** Hosts caller-provided Avatar composition without owning image loading or fallback state. */
const MessageAvatar = ({ref, className, ...props}: Readonly<MessageAvatar.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-avatar'
    className={cn(styles.avatar, className)}
    {...props}
  />
);
MessageAvatar.displayName = "MessageAvatar";

/** Holds the shrinking header, bubble/content and footer column. */
const MessageContent = ({ref, className, ...props}: Readonly<MessageContent.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-content'
    className={cn(styles.content, className)}
    {...props}
  />
);
MessageContent.displayName = "MessageContent";

/** Displays caller-owned author/header metadata without generating text. */
const MessageHeader = ({ref, className, ...props}: Readonly<MessageHeader.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-header'
    className={cn(styles.header, className)}
    {...props}
  />
);
MessageHeader.displayName = "MessageHeader";

/** Displays caller-owned timestamp, status or action content at the row's logical side. */
const MessageFooter = ({ref, className, ...props}: Readonly<MessageFooter.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-footer'
    className={cn(styles.footer, className)}
    {...props}
  />
);
MessageFooter.displayName = "MessageFooter";

// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MessageGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MessageGroupProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace Message {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MessageProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MessageAvatar {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MessageAvatarProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MessageContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MessageContentProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MessageHeader {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MessageHeaderProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MessageFooter {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MessageFooterProps;
}

export {Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader};
