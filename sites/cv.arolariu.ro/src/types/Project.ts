/**
 * JSON Resume `projects[]` entry — flagship personal project with optional
 * technologies / metrics / architecture metadata.
 */
export type ProjectTechnologies = Readonly<{
  frontend?: ReadonlyArray<string>;
  backend?: ReadonlyArray<string>;
  devops?: ReadonlyArray<string>;
  cloud?: ReadonlyArray<string>;
}>;

export type ProjectMetrics = Readonly<{
  codeQuality?: string;
  testCoverage?: string;
  performance?: string;
  availability?: string;
}>;

export type Project = Readonly<{
  name: string;
  description: string;
  highlights?: ReadonlyArray<string>;
  keywords?: ReadonlyArray<string>;
  startDate?: string;
  endDate?: string | null;
  url?: string;
  roles?: ReadonlyArray<string>;
  entity?: string;
  type?: string;
  repository?: string;
  technologies?: ProjectTechnologies;
  architecture?: string;
  metrics?: ProjectMetrics;
}>;
