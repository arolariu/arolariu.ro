import "server-only";
import {currentUser} from "@clerk/nextjs";


export default async function fetchUser() {
	const user = await currentUser();
	const isAuthenticated = user !== null;
	return {isAuthenticated, user};
}
