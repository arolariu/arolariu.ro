import * as jose from "jose";

export default async function generateGuestJwt() {
	const jwtSignKey = process.env.JWT_SIGN_KEY as string;
	const secret = new TextEncoder().encode(jwtSignKey);

	const header = { alg: "HS256", typ: "JWT" };

	const payload = {
		iss: "https://arolariu.ro",
		aud: "https://api.arolariu.ro",
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
		sub: "guest",
	};

	const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);
	return jwt;
}
