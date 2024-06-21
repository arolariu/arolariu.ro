/** @format */

import {User} from "@clerk/nextjs/server";

export type UserInformation = {
  user: User | null;
  userIdentifier: string;
  userJwt: string;
};
