import { API_JWT } from "@/constants";
import { User } from "@clerk/backend";
import * as jose from "jose";

/**
 * Generate a JWT for a user.
 * @param user The user for which to generate the JWT.
 * @returns A promise of the JWT.
 */
export default async function generateJWT(user: User | null) {
	const secret = new TextEncoder().encode(API_JWT);

	const header = { alg: "HS256", typ: "JWT" };

	const payload = {
		iss: "https://arolariu.ro",
		aud: "https://api.arolariu.ro",
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 180,
		sub: user?.username ?? "guest",
	};

	const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);
	return jwt;
}
