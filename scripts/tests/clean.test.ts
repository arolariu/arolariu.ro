/** @format */

import {jest} from '@jest/globals';
import {execSync} from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockedExecSync = jest.mocked(execSync);

describe('clean script', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should clean all projects successfully', async () => {
    // Arrange
    mockedExecSync.mockReturnValue(Buffer.from('clean completed'));

    // Act
    const {main} = await import('../clean.ts');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('🧹 Cleaning build artifacts...');
    expect(mockedExecSync).toHaveBeenCalledWith('rm -rf packages/components/dist', {stdio: 'inherit'});
    expect(mockedExecSync).toHaveBeenCalledWith('rm -rf sites/arolariu.ro/.next', {stdio: 'inherit'});
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ All build artifacts cleaned!');
  });
});