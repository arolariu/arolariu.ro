import "server-only";
import {currentUser} from "@clerk/nextjs";


/**
 * Fetches the current user.
 * @returns A promise of the current user.
 */
export default async function fetchUser() {
	const user = await currentUser();
	const isAuthenticated = user !== null;
	return {isAuthenticated, user};
}
