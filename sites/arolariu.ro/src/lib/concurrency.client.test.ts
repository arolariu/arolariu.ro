/**
 * @fileoverview Unit tests for concurrency limiting utilities.
 * @module lib/concurrency.client.test
 */

import {describe, expect, it} from "vitest";
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
});
