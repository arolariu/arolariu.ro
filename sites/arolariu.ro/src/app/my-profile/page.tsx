import {currentUser} from "@clerk/nextjs/server";
import {getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import ProfileIsland from "./island";

export async function generateMetadata() {
  const t = await getTranslations("MyProfile.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function MyProfilePage(): Promise<React.JSX.Element> {
  const user = await currentUser();

  if (!user) {
    redirect("/auth/sign-in?redirect_url=/my-profile");
  }

  // Serialize the user object for the client component
  const serializedUser = structuredClone(user);

  return <ProfileIsland user={serializedUser} />;
}
