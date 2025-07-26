/** @format */

import {jest} from '@jest/globals';
import {execSync} from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockedExecSync = jest.mocked(execSync);

describe('setup script', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let processExitSpy: jest.SpiedFunction<typeof process.exit>;
  let processVersionSpy: jest.SpiedFunction<any>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    if (processVersionSpy) {
      processVersionSpy.mockRestore();
    }
  });

  it('should install dependencies successfully when all prerequisites are met', async () => {
    // Arrange
    Object.defineProperty(process, 'version', {
      value: 'v24.0.0',
      configurable: true,
    });
    
    mockedExecSync
      .mockReturnValueOnce(Buffer.from('dotnet')) // which dotnet
      .mockReturnValueOnce(Buffer.from('9.0.0')) // dotnet --version
      .mockReturnValueOnce(Buffer.from('docker')) // which docker
      .mockReturnValueOnce(Buffer.from('Docker version 20.10.0')) // docker --version
      .mockReturnValueOnce(Buffer.from('yarn install completed')); // yarn install

    // Act
    const {main} = await import('../setup.js');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('🔧 Setting up development environment...');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ Node.js v24.0.0 (compatible)');
    expect(consoleLogSpy).toHaveBeenCalledWith('🎉 Development environment is ready!');
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('should continue with frontend setup when backend prerequisites are missing', async () => {
    // Arrange
    Object.defineProperty(process, 'version', {
      value: 'v24.0.0',
      configurable: true,
    });
    
    mockedExecSync
      .mockImplementationOnce(() => { throw new Error('which dotnet failed'); }) // which dotnet fails
      .mockImplementationOnce(() => { throw new Error('which docker failed'); }) // which docker fails
      .mockReturnValueOnce(Buffer.from('yarn install completed')); // yarn install

    // Act
    const {main} = await import('../setup.js');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('❌ .NET SDK not found');
    expect(consoleLogSpy).toHaveBeenCalledWith('❌ Docker not found');
    expect(consoleLogSpy).toHaveBeenCalledWith('⚠️  Development environment partially ready (frontend only)');
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('should handle yarn install failure', async () => {
    // Arrange
    Object.defineProperty(process, 'version', {
      value: 'v24.0.0',
      configurable: true,
    });
    
    mockedExecSync
      .mockReturnValueOnce(Buffer.from('dotnet')) // which dotnet
      .mockReturnValueOnce(Buffer.from('9.0.0')) // dotnet --version
      .mockReturnValueOnce(Buffer.from('docker')) // which docker
      .mockReturnValueOnce(Buffer.from('Docker version 20.10.0')) // docker --version
      .mockImplementationOnce(() => { throw new Error('yarn install failed'); }); // yarn install fails

    // Act
    const {main} = await import('../setup.js');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith('📦 Installing root dependencies...');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});