/** @format */

/**
 * This component renders a skeleton loader marked as a HTML div element.
 * @returns The skeleton loader.
 */
export function Skeleton({className, ...props}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  const finalClassName = `animate-pulse rounded-md bg-slate-900/10 dark:bg-slate-50/10 ${className ?? ""}`;
  return (
    <div
      {...props}
      className={finalClassName}
    />
  );
}
