/**
 * @fileoverview Types for a `projects[]` entry in the JSON Resume export,
 * including the supporting `technologies` and `metrics` shapes.
 */

/**
 * Optional grouped technologies for a project (frontend / backend /
 * devops / cloud). All buckets are optional so projects can declare
 * only the dimensions that apply.
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
