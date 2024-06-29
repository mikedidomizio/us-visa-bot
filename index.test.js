import { expect, test } from 'vitest'
import * as mockProcess from 'vitest-mock-process';

test('should exit if no current booked date provided', async () => {
    const mockExit = mockProcess.mockProcessExit();

    await import('./index.js')

    expect(mockExit).toHaveBeenCalled()
})
