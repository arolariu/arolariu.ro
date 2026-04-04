/**
 * @fileoverview Unit tests for concurrency limiting utilities.
 * @module lib/concurrency.client.test
 */

import {describe, expect, it, vi} from "vitest";
import {withConcurrencyLimit, withConcurrencyLimitAndProgress} from "./concurrency.client";

describe("withConcurrencyLimit", () => {
  it("should execute all tasks", async () => {
    // Arrange
    const tasks = [async () => 1, async () => 2, async () => 3, async () => 4, async () => 5];

    // Act
    const results = await withConcurrencyLimit(tasks, 2);

    // Assert
    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it("should maintain order of results", async () => {
    // Arrange
    const tasks = [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "first";
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "second";
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return "third";
      },
    ];

    // Act
    const results = await withConcurrencyLimit(tasks, 3);

    // Assert
    expect(results).toEqual(["first", "second", "third"]);
  });

  it("should respect concurrency limit", async () => {
    // Arrange
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({length: 10}, () => async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount--;
      return concurrentCount;
    });

    // Act
    await withConcurrencyLimit(tasks, 3);

    // Assert
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it("should handle empty task array", async () => {
    // Arrange
    const tasks: Array<() => Promise<number>> = [];

    // Act
    const results = await withConcurrencyLimit(tasks, 5);

    // Assert
    expect(results).toEqual([]);
  });

  it("should use default limit of 5", async () => {
    // Arrange
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({length: 10}, () => async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount--;
      return concurrentCount;
    });

    // Act
    await withConcurrencyLimit(tasks); // No limit specified

    // Assert
    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });

  it("should handle task errors without stopping other tasks", async () => {
    // Arrange
    const tasks = [
      async () => 1,
      async () => {
        throw new Error("Task failed");
      },
      async () => 3,
    ];

    // Act & Assert - should throw since we don't catch errors
    await expect(withConcurrencyLimit(tasks, 2)).rejects.toThrow("Task failed");
  });

  it("should stop picking up new tasks when one task fails", async () => {
    // Arrange
    let task3Started = false;
    const tasks = [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 1;
      },
      async () => {
        throw new Error("Task 2 failed");
      },
      async () => {
        task3Started = true;
        return 3;
      },
    ];

    // Act & Assert
    await expect(withConcurrencyLimit(tasks, 2)).rejects.toThrow("Task 2 failed");

    // Task 3 should not have started because task 2 failed and tripped the circuit
    expect(task3Started).toBe(false);
  });

  it("should handle multiple concurrent errors", async () => {
    // Arrange
    const tasks = [
      async () => {
        throw new Error("Error 1");
      },
      async () => {
        throw new Error("Error 2");
      },
      async () => 3,
    ];

    // Act & Assert
    await expect(withConcurrencyLimit(tasks, 2)).rejects.toThrow();
  });

  it("should skip undefined tasks in sparse arrays", async () => {
    // Arrange - sparse array with holes
    const tasks: Array<() => Promise<number>> = new Array(5);
    tasks[0] = async () => 10;
    // tasks[1] is undefined (sparse)
    tasks[2] = async () => 20;
    // tasks[3] is undefined (sparse)
    tasks[4] = async () => 30;

    // Act
    const results = await withConcurrencyLimit(tasks, 2);

    // Assert
    expect(results[0]).toBe(10);
    expect(results[1]).toBeUndefined();
    expect(results[2]).toBe(20);
    expect(results[3]).toBeUndefined();
    expect(results[4]).toBe(30);
  });
});

describe("withConcurrencyLimitAndProgress", () => {
  it("should execute all tasks and track progress", async () => {
    // Arrange
    const progressUpdates: Array<{completed: number; total: number}> = [];
    const tasks = [async () => 1, async () => 2, async () => 3];

    // Act
    const results = await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onProgress: (completed, total) => {
        progressUpdates.push({completed, total});
      },
    });

    // Assert
    expect(results).toEqual([1, 2, 3]);
    expect(progressUpdates.length).toBe(3);
    expect(progressUpdates[0]).toEqual({completed: 1, total: 3});
    expect(progressUpdates[2]).toEqual({completed: 3, total: 3});
  });

  it("should call onTaskComplete for each task", async () => {
    // Arrange
    const taskCompletions: Array<{result: number | Error; index: number}> = [];
    const tasks = [async () => 1, async () => 2, async () => 3];

    // Act
    await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onTaskComplete: (result, index) => {
        taskCompletions.push({result: result as number | Error, index});
      },
    });

    // Assert
    expect(taskCompletions.length).toBe(3);
    expect(taskCompletions.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it("should handle task errors gracefully", async () => {
    // Arrange
    const results: Array<number | Error> = [];
    const tasks = [
      async () => 1,
      async () => {
        throw new Error("Task failed");
      },
      async () => 3,
    ];

    // Act
    const taskResults = await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onTaskComplete: (result) => {
        results.push(result as number | Error);
      },
    });

    // Assert
    expect(taskResults.length).toBe(3);
    expect(taskResults[0]).toBe(1);
    expect(taskResults[1]).toBeInstanceOf(Error);
    expect(taskResults[2]).toBe(3);
  });

  it("should respect concurrency limit", async () => {
    // Arrange
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({length: 10}, () => async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount--;
      return concurrentCount;
    });

    // Act
    await withConcurrencyLimitAndProgress(tasks, {limit: 3});

    // Assert
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it("should work without callbacks", async () => {
    // Arrange
    const tasks = [async () => 1, async () => 2, async () => 3];

    // Act
    const results = await withConcurrencyLimitAndProgress(tasks, {limit: 2});

    // Assert
    expect(results).toEqual([1, 2, 3]);
  });

  it("should use default limit of 5 when not specified", async () => {
    // Arrange
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({length: 10}, () => async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount--;
      return concurrentCount;
    });

    // Act
    await withConcurrencyLimitAndProgress(tasks, {});

    // Assert
    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });

  it("should track progress for failed tasks", async () => {
    // Arrange
    let completedCount = 0;
    const tasks = [
      async () => 1,
      async () => {
        throw new Error("Failed");
      },
      async () => 3,
    ];

    // Act
    await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onProgress: (completed, _total) => {
        completedCount = completed;
      },
    });

    // Assert
    expect(completedCount).toBe(3); // All tasks completed (including failed one)
  });

  it("should call onTaskComplete for both success and error results", async () => {
    // Arrange
    const taskResults: Array<{result: number | Error; index: number}> = [];
    const tasks = [
      async () => 1,
      async () => {
        throw new Error("Task 2 failed");
      },
      async () => 3,
    ];

    // Act
    await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onTaskComplete: (result, index) => {
        taskResults.push({result: result as number | Error, index});
      },
    });

    // Assert
    expect(taskResults).toHaveLength(3);
    expect(taskResults[0]?.result).toBe(1);
    expect(taskResults[1]?.result).toBeInstanceOf(Error);
    expect(taskResults[2]?.result).toBe(3);
  });

  it("should handle missing onProgress callback gracefully", async () => {
    // Arrange
    const tasks = [async () => 1, async () => 2];

    // Act - no onProgress provided
    const results = await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onTaskComplete: vi.fn(), // Only provide onTaskComplete
    });

    // Assert - should complete without errors
    expect(results).toEqual([1, 2]);
  });

  it("should handle missing onTaskComplete callback gracefully", async () => {
    // Arrange
    const tasks = [async () => 1, async () => 2];

    // Act - no onTaskComplete provided
    const results = await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onProgress: vi.fn(), // Only provide onProgress
    });

    // Assert - should complete without errors
    expect(results).toEqual([1, 2]);
  });

  it("should skip undefined tasks in sparse arrays", async () => {
    // Arrange - sparse array with holes
    const progressUpdates: Array<{completed: number; total: number}> = [];
    const tasks: Array<() => Promise<number>> = new Array(4);
    tasks[0] = async () => 100;
    // tasks[1] is undefined (sparse)
    tasks[2] = async () => 200;
    tasks[3] = async () => 300;

    // Act
    const results = await withConcurrencyLimitAndProgress(tasks, {
      limit: 2,
      onProgress: (completed, total) => {
        progressUpdates.push({completed, total});
      },
    });

    // Assert
    expect(results[0]).toBe(100);
    expect(results[1]).toBeUndefined();
    expect(results[2]).toBe(200);
    expect(results[3]).toBe(300);
    expect(progressUpdates).toHaveLength(3); // Only 3 tasks completed
  });

  it("should handle non-Error throw and wrap it in Error", async () => {
    // Arrange - task that throws a string instead of Error
    const tasks = [
      async () => 1,
      async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "String error instead of Error instance";
      },
      async () => 3,
    ];

    // Act
    const results = await withConcurrencyLimitAndProgress(tasks, {limit: 2});

    // Assert
    expect(results[0]).toBe(1);
    expect(results[1]).toBeInstanceOf(Error);
    expect((results[1] as Error).message).toBe("String error instead of Error instance");
    expect(results[2]).toBe(3);
  });

  it("should handle non-Error throw for primitive values", async () => {
    // Arrange - task that throws a number
    const tasks = [
      async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 42;
      },
    ];

    // Act
    const results = await withConcurrencyLimitAndProgress(tasks, {limit: 1});

    // Assert
    expect(results[0]).toBeInstanceOf(Error);
    expect((results[0] as Error).message).toBe("42");
  });
});
