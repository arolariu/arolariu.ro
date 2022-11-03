"use client";
/* eslint-disable @next/next/no-head-element */
import Footer from "../components/Footer";
import Navigation from "../components/Navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="acid">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="title" content="Welcome to itc.arolariu.ro" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="author" content="Olariu Alexandru-Razvan" />
        <meta
          name="description"
          content="The #1 best free e-learning platform in Romania.
            Join now and be a part of the growing community of over 800+ learning students. "
        />
        <meta
          name="keywords"
          content="e-learning, gratis, gratuit, comunitate, tehnologie, diversitate, educatie, incluziune, platforma, cursuri, pregatire, IT, invatamant"
        />
        <meta property="og:url" content="https://itc.arolariu.ro/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="itc.arolariu.ro" />
        <meta property="og:title" content="Welcome to itc.arolariu.ro" />
        <meta
          property="og:description"
          content="The #1 best free e-learning platform in Romania.
                Join now and be a part of the growing community of over 800+ learning students. "
        />
        <meta property="og:image" content="./favicon.ico" />
        <meta name="twitter:card" content="ITC.arolariu.ro" />
        <meta property="twitter:domain" content="itc.arolariu.ro" />
        <meta property="twitter:url" content="https://itc.arolariu.ro/" />
        <meta name="twitter:title" content="Welcome to itc.arolariu.ro" />
        <meta
          name="twitter:description"
          content="The #1 best free e-learning platform in Romania.
                Join now and be a part of the growing community of over 800+ learning students. "
        />
        <meta name="twitter:image" content="./favicon.ico" />
        <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
        <link rel="canonical" href="https://itc.arolariu.ro/" />
        <title>Welcome to itc.arolariu.ro</title>
      </head>
      <body>
        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  );
}
