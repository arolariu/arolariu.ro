/** @format */

import {fetchUser} from "@/lib/actions/fetchUser";
import {Metadata} from "next";
import RenderForbiddenScreen from "../_components/RenderForbiddenScreen";
import RenderLiveScreen from "./island";

export const metadata: Metadata = {
  title: "Live",
  description: "Live chat and video call",
};

/**
 * The index page for the live chat and video call feature.
 * @returns The live chat and video call index page.
 */
export default async function LivePage() {
  const {isAuthenticated} = await fetchUser();
  if (isAuthenticated) return <RenderLiveScreen />;
  return <RenderForbiddenScreen />;
}
