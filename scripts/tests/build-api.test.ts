/** @format */

import {jest} from '@jest/globals';
import {execSync} from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockedExecSync = jest.mocked(execSync);

describe('build-api script', () => {
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

  it('should build API successfully when .NET SDK is available', async () => {
    // Arrange
    mockedExecSync.mockReturnValue(Buffer.from('Build succeeded.'));

    // Act
    const {main} = await import('../build-api.ts');
    await main();

    // Assert
    expect(mockedExecSync).toHaveBeenCalledWith('dotnet build arolariu.slnx', {
      stdio: 'inherit',
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('⚙️  Building API...');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ API built successfully!');
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('should handle error when .NET SDK is not available', async () => {
    // Arrange
    mockedExecSync.mockImplementation(() => {
      throw new Error('dotnet command not found');
    });

    // Act
    const {main} = await import('../build-api.ts');
    await main();

    // Assert
    expect(mockedExecSync).toHaveBeenCalledWith('dotnet build arolariu.slnx', {
      stdio: 'inherit',
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('⚙️  Building API...');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '⚠️  .NET SDK not available - install .NET 9.0 SDK to build API'
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});