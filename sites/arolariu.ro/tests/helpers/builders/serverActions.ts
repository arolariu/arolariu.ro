import type {Mock} from "vitest";

import type {ServerActionErrorCode, ServerActionResult} from "../../../src/lib/utils.server";

export type TestServerActionError = Readonly<{
  code: ServerActionErrorCode;
  message: string;
  status?: number;
}>;

export function actionSuccess<TData>(data: TData): ServerActionResult<TData> {
  return Promise.resolve({
    success: true,
    data,
  });
}

export function actionFailure<TData = never>(error: TestServerActionError): ServerActionResult<TData> {
  return Promise.resolve({
    success: false,
    error,
  });
}

export function mockResolvedActionSuccess<TData>(mock: Mock, data: TData): Mock {
  return mock.mockResolvedValueOnce({
    success: true,
    data,
  });
}

export function mockResolvedActionFailure(mock: Mock, error: TestServerActionError): Mock {
  return mock.mockResolvedValueOnce({
    success: false,
    error,
  });
}

export function mockRejectedServerAction(mock: Mock, error: unknown): Mock {
  return mock.mockRejectedValueOnce(error);
}
