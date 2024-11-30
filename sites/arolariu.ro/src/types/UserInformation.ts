/** @format */

import type {User} from "next-auth";

export type UserInformation = {
  user: User | null;
  userIdentifier: string;
  userJwt: string;
};
