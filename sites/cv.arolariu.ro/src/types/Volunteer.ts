/**
 * JSON Resume `volunteer[]` entry — community / ambassador role.
 */
export type Volunteer = Readonly<{
  organization: string;
  position: string;
  url?: string;
  startDate?: string;
  endDate?: string | null;
  summary?: string;
  highlights?: ReadonlyArray<string>;
  location?: string;
  impact?: string;
}>;
