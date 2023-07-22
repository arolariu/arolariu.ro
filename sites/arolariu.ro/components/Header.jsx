import Link from "next/link";

export default function Header() {
  return (
    <header className="dark:text-white">
      <div className="container mx-auto flex flex-wrap p-5 flex-col md:flex-row items-center">
        <a className="flex title-font font-medium items-center mb-4 md:mb-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="w-10 h-10 p-2 bg-indigo-500 rounded-full"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span className="ml-3 text-xl">arolariu.ro</span>
        </a>
        <nav className="md:ml-auto md:mr-auto flex flex-wrap items-center text-base justify-center">
          <Link
            href="https://arolariu.ro/domains"
            className="mr-5 hover:text-yellow-300"
          >
            Domains
          </Link>
          <Link
            href="arolariu.ro/statistics"
            className="mr-5 hover:text-yellow-300"
          >
            Statistics
          </Link>
          <Link
            href="arolariu.ro/health"
            className="mr-5 hover:text-yellow-300"
          >
            Health
          </Link>
          <Link href="arolariu.ro/other" className="mr-5 hover:text-yellow-300">
            Other
          </Link>
        </nav>
        <Link
          href="#"
          className="inline-flex items-center dark:bg-gray-100 border-0 py-1 px-3 focus:outline-none hover:bg-gray-200 rounded text-base dark:text-black mt-4 md:mt-0"
        >
          Auth
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="w-4 h-4 ml-1"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </Link>
      </div>
    </header>
  );
}
