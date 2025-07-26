/** @format */

import {jest} from '@jest/globals';
import {execSync} from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockedExecSync = jest.mocked(execSync);

describe('build script', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let processExitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() called');
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should build all projects successfully', async () => {
    // Arrange
    mockedExecSync.mockReturnValue(Buffer.from('build completed'));

    // Act
    const {main} = await import('../build.ts');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('🏗️  Building all projects...');
    expect(mockedExecSync).toHaveBeenCalledWith('tsx scripts/build-components.ts', {stdio: 'inherit'});
    expect(mockedExecSync).toHaveBeenCalledWith('tsx scripts/build-website.ts', {stdio: 'inherit'});
    expect(mockedExecSync).toHaveBeenCalledWith('tsx scripts/build-docs.ts', {stdio: 'inherit'});
    expect(mockedExecSync).toHaveBeenCalledWith('tsx scripts/build-api.ts', {stdio: 'inherit'});
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ All projects built successfully!');
  });

  it('should handle build failure', async () => {
    // Arrange
    mockedExecSync.mockImplementation(() => {
      throw new Error('Build failed');
    });

    // Act
    const {main} = await import('../build.ts');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('🏗️  Building all projects...');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});