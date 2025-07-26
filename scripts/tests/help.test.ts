/** @format */

import {jest} from '@jest/globals';

describe('help script', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should display help information', async () => {
    // Act
    const {main} = await import('../help.js');
    await main();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🚀 Arolariu.ro Monorepo CLI'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('yarn build'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('yarn clean'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('yarn setup'));
  });
});