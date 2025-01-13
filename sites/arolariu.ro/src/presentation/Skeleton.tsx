/** @format */

export const Skeleton = ({className, ...props}: Readonly<React.HTMLAttributes<HTMLDivElement>>) => {
  const finalClassName = `animate-pulse rounded-md bg-slate-900/10 dark:bg-slate-50/10 ${className ?? ""}`;
  return (
    <div
      {...props}
      className={finalClassName}
    />
  );
};
