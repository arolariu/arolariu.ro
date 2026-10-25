import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./message.module.css";

/** Logical side of a message row. */
export type MessageAlign = "start" | "end";
/** Native message collection props; semantic/log policy is caller-owned. */
export type MessageGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native message row props with logical alignment. */
export type MessageProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /**
     * Logical side of the row: `end` reverses it so the avatar and content sit at the inline end (the right in LTR, the
     * left in RTL).
     *
     * @default "start"
     */
    align?: MessageAlign;
  }
>;
/** Native avatar wrapper props, intended for composition with the reviewed Avatar. */
export type MessageAvatarProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native shrinking message content column props. */
export type MessageContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native caller-owned message metadata/header props. */
export type MessageHeaderProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native caller-owned footer/status/action props. */
export type MessageFooterProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Groups native message rows without creating application state or live announcements.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component; renders a
 * `<div data-slot="message-group">`.
 *
 * Stacks {@link Message} rows and date or status boundaries in a shrinking column. It adds no role, log or live region.
 * Give a conversation `role="log"` with `aria-label` when new messages should be announced (the announcement policy is
 * yours), or `role="group"` with `aria-label` when it only needs a name; a name on the bare `div` is ignored.
 *
 * @example
 * ```tsx
 * <MessageGroup
 *   role="log"
 *   aria-label="Conversation with Alex">
 *   <Message>…</Message>
 *   <Message align="end">…</Message>
 * </MessageGroup>
 * ```
 *
 * @see {@link Message}
 */
const MessageGroup = ({ref, className, ...props}: Readonly<MessageGroup.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-group'
    className={cn(styles.group, className)}
    {...props}
  />
);
MessageGroup.displayName = "MessageGroup";

/**
 * Arranges caller-owned avatar and message content at a logical start or end side.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component; renders a `<div data-slot="message">`
 * with `data-align`.
 *
 * A shrinking flex row. `align="end"` reverses it so the avatar sits at the inline end (mirrored in RTL), and the
 * header, bubbles (also those inside a `BubbleGroup`) and footer in {@link MessageContent} follow that side. The row
 * never generates text or imposes a role or live-region policy: names, timestamps, delivery status and announcements are
 * caller-owned. Rest props, including `data-*` overrides, are applied last.
 *
 * @example
 * ```tsx
 * <Message align="end">
 *   <MessageAvatar>
 *     <Avatar>
 *       <AvatarFallback>ME</AvatarFallback>
 *     </Avatar>
 *   </MessageAvatar>
 *   <MessageContent>
 *     <MessageHeader>You</MessageHeader>
 *     <Bubble>
 *       <BubbleContent>Thanks, I will read them.</BubbleContent>
 *     </Bubble>
 *     <MessageFooter>
 *       <time dateTime="2026-10-13T10:31:00Z">10:31</time> · Read
 *     </MessageFooter>
 *   </MessageContent>
 * </Message>
 * ```
 *
 * @see {@link MessageGroup}
 * @see {@link MessageContent}
 */
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

/**
 * Hosts caller-provided Avatar composition without owning image loading or fallback state.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component; renders a
 * `<div data-slot="message-avatar">`.
 *
 * A non-shrinking slot aligned to the row's last line; when the row contains a {@link MessageFooter}, it is raised so it
 * sits beside the last bubble rather than the footer. It never clips, so an Avatar's focus outline and corner badge stay
 * visible. Use an empty `alt` when the {@link MessageHeader} already names the sender, and name an interactive avatar on
 * its own control.
 *
 * @example
 * ```tsx
 * <MessageAvatar>
 *   <Avatar>
 *     <AvatarImage
 *       src="/avatars/alex.png"
 *       alt=""
 *     />
 *     <AvatarFallback>AL</AvatarFallback>
 *   </Avatar>
 * </MessageAvatar>
 * ```
 *
 * @see {@link Message}
 */
const MessageAvatar = ({ref, className, ...props}: Readonly<MessageAvatar.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-avatar'
    className={cn(styles.avatar, className)}
    {...props}
  />
);
MessageAvatar.displayName = "MessageAvatar";

/**
 * Holds the shrinking header, bubble/content and footer column.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component; renders a
 * `<div data-slot="message-content">`.
 *
 * A flex column with `min-inline-size: 0` and `overflow-wrap: anywhere`, so long words and URLs wrap instead of widening
 * the row. In an end-aligned {@link Message}, its direct children that carry a `data-slot` (header, bubbles, footer)
 * align to the inline end.
 *
 * @example
 * ```tsx
 * <MessageContent>
 *   <MessageHeader>Alex</MessageHeader>
 *   <Bubble variant="secondary">
 *     <BubbleContent>Here are the notes.</BubbleContent>
 *   </Bubble>
 *   <MessageFooter>10:30</MessageFooter>
 * </MessageContent>
 * ```
 *
 * @see {@link Message}
 */
const MessageContent = ({ref, className, ...props}: Readonly<MessageContent.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-content'
    className={cn(styles.content, className)}
    {...props}
  />
);
MessageContent.displayName = "MessageContent";

/**
 * Displays caller-owned author/header metadata without generating text.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component; renders a
 * `<div data-slot="message-header">`.
 *
 * Compact, muted metadata such as the sender's name, inset to line up with bubble text (flush beside `ghost` bubbles).
 * It is not a heading: put a heading element inside it when the page outline needs one.
 *
 * @example
 * ```tsx
 * <MessageHeader>Alex · Design team</MessageHeader>
 * ```
 *
 * @see {@link MessageContent}
 */
const MessageHeader = ({ref, className, ...props}: Readonly<MessageHeader.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='message-header'
    className={cn(styles.header, className)}
    {...props}
  />
);
MessageHeader.displayName = "MessageHeader";

/**
 * Displays caller-owned timestamp, status or action content at the row's logical side.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component; renders a
 * `<div data-slot="message-footer">`.
 *
 * A compact, muted line for timestamps, delivery status or actions, justified to the inline end in an end-aligned
 * {@link Message}. Status changes are not announced automatically: write them into a live region you own when they
 * must be announced.
 *
 * @example
 * ```tsx
 * <MessageFooter>
 *   <time dateTime="2026-10-13T10:30:00Z">10:30</time> · Delivered
 * </MessageFooter>
 * ```
 *
 * @see {@link MessageContent}
 */
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
