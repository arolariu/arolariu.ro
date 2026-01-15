import {redirect} from "next/navigation";

/**
 * Redirects from the old dynamic profile route to the new static /my-profile route.
 *
 * @remarks
 * This page exists for backwards compatibility with existing links to /profile/[id].
 * All profile access is now handled by the /my-profile route which uses server-side
 * authentication to determine the current user.
 *
 * @deprecated Use /my-profile instead of /profile/[id]
 */
export default function ProfilePage(): never {
  redirect("/my-profile");
}
