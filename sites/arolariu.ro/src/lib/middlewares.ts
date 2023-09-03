import {Middleware, SWRHook} from "swr";

export const loggerForSWR: Middleware = (useSWRNext: SWRHook) => {
	return (key, fetcher, config) => {
		const extendedFetcher = (...args: any[]) => {
			console.log("Received SWR Request:", key);
			return fetcher!(...args);
		};
		return useSWRNext(key, extendedFetcher, config);
	};
};
