/** @format */

type Props = {text: string};

export function SimpleTag({text}: Readonly<Props>) {
  return (
    <span className='inline-block rounded-full bg-gray-800 px-2 py-1 text-xs font-semibold text-white'>{text}</span>
  );
}
