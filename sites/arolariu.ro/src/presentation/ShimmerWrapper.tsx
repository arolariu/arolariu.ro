/** @format */

type ShimmerWrapperProps = {
  children?: React.ReactNode;
  className?: string;
};

export const ShimmerWrapper = ({children, className}: Readonly<ShimmerWrapperProps>) => {
  return <div className={`animate-pulse rounded-lg bg-gray-300 shadow-lg ${className}`}>{children}</div>;
};
