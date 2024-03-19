"use server";

import {cookies} from "next/headers";

export async function getCookie({name}: {name: string}) {
	return cookies().get(name);
}

export async function setCookie({name, value}: {name: string; value: string}) {
	cookies().set(name, value);
}
