import { useEffect } from "react";
import { themeChange } from "theme-change";
import Link from "next/link";

export default function Navigation() {
  useEffect(() => {
    themeChange(false);
  }, []);

  return (
    <header className="top-0 flex flex-row justify-between h-24 text-white justify-items-center">
      <div className="navbar bg-base-100 bg-gradient-to-r from-purple-500 via-cyan-400 to-blue-600">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              {/* HAMBURGER LOGO SVG BELOW*/}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.0}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
                />
              </svg>
            </label>

            {/* HAMBURGER MENU BELOW*/}
            <ul
              tabIndex={0}
              className="p-2 mt-3 text-black shadow menu menu-compact dropdown-content bg-base-100 rounded-box w-52 dark:text-white"
            >
              <li>
                <Link href="/about/the-project/">Despre proiect</Link>
              </li>
              <li>
                <Link href="/pricing/">Preț</Link>
              </li>
              <li>
                <Link href="/about/the-team/">Despre noi</Link>
              </li>
            </ul>
          </div>

          {/* PLATFORM LOGO SVG BELOW*/}
          <Link className="text-xl normal-case btn btn-ghost" href="/">
            <svg
              width="100"
              height="47"
              viewBox="0 0 100 47"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0.49775 46V0.559998H12.9778V46H0.49775ZM56.2023 11.44H43.1463V46H30.6663V11.44H17.5463V0.559998H56.2023V11.44ZM57.5643 22.896C57.5643 20.1227 58.0763 17.4133 59.1003 14.768C60.1669 12.08 61.7029 9.648 63.7083 7.472C65.7136 5.296 68.1456 3.568 71.0043 2.288C73.9056 0.965331 77.1696 0.303997 80.7963 0.303997C85.1483 0.303997 88.9456 1.22133 92.1883 3.056C95.4309 4.848 97.8416 7.23733 99.4203 10.224L89.8843 17.008C89.3296 15.5147 88.5189 14.3627 87.4523 13.552C86.4283 12.7413 85.2976 12.1867 84.0603 11.888C82.8656 11.5467 81.6923 11.376 80.5403 11.376C78.1509 11.376 76.1883 11.9733 74.6523 13.168C73.1589 14.3627 72.0496 15.8773 71.3243 17.712C70.5989 19.504 70.2363 21.36 70.2363 23.28C70.2363 25.3707 70.6416 27.3333 71.4523 29.168C72.3056 31.0027 73.5003 32.496 75.0363 33.648C76.6149 34.7573 78.4923 35.312 80.6683 35.312C81.8203 35.312 82.9936 35.1413 84.1883 34.8C85.3829 34.416 86.4709 33.8187 87.4523 33.008C88.4336 32.1973 89.1803 31.1093 89.6923 29.744L99.8683 35.824C98.9723 38.0427 97.4789 39.9413 95.3883 41.52C93.2976 43.0987 90.9296 44.3147 88.2843 45.168C85.6389 45.9787 83.0149 46.384 80.4123 46.384C77.0416 46.384 73.9483 45.7227 71.1323 44.4C68.3589 43.0347 65.9483 41.2427 63.9003 39.024C61.8949 36.7627 60.3376 34.2453 59.2283 31.472C58.1189 28.656 57.5643 25.7973 57.5643 22.896Z"
                fill="white"
              />
            </svg>
          </Link>
        </div>

        {/*  MAIN NAVIGATION LINKS */}
        <div className="hidden navbar-center lg:flex">
          <ul tabIndex={0} className="p-0 menu menu-horizontal">
            <li>
              <Link href="/about/the-project/">Despre proiect</Link>
            </li>
            <li>
              <Link href="/pricing/">Preț</Link>
            </li>
            <li>
              <Link href="/about/the-team/">Despre noi</Link>
            </li>
          </ul>
        </div>

        {/*  AUTHENTICATION (CTA) BUTTON */}
        <div className="navbar-end">
          <Link className="btn" href="/auth/">
            Autentificare
          </Link>

          {/*  THEME SWAP BUTTON */}
          <label className="mx-5 swap swap-rotate">
            <button
              title="Toggle Dark Mode"
              data-toggle-theme="acid,night"
              data-act-class="ACTIVECLASS"
              type="button"
            ></button>

            <svg
              className="w-10 h-10 fill-current swap-on"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
            </svg>

            <svg
              className="w-10 h-10 fill-current swap-off"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
            </svg>
          </label>
        </div>
      </div>
    </header>
  );
}
