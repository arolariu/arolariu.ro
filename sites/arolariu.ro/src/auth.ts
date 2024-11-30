/** @format */

import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const {handlers, signIn, signOut, auth} = NextAuth({
  debug: process.env.NODE_ENV === "development",
  pages: {signIn: "/auth/sign-in"},
  providers: [Keycloak],
});
