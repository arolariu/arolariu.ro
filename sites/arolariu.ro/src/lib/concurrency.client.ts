/**
 * @fileoverview Client-side utility for limiting concurrent async operations.
 * @module lib/utils.client
 *
 * @remarks
 * Provides utilities for managing concurrency in client-side operations like
 * parallel file uploads to prevent overwhelming the browser or network.
 */

/**
 * Executes async tasks with a concurrency limit using a sliding window approach.
 *
 * @remarks
 * **Use Cases:**
 * - Parallel file uploads (limit to 5 concurrent connections)
 * - Batch API requests with rate limiting
 * - Parallel image processing operations
 *
 * **Algorithm:**
 * Uses a sliding window that maintains at most `limit` tasks in flight at once.
 * As tasks complete, new tasks are started to maintain the concurrency level.
 *
 * **Error Handling:**
 * Individual task failures do not stop other tasks. Failed tasks are included
 * in the results and must be handled by the caller.
 *
 * **Performance:**
 * - Time complexity: O(n) where n is number of tasks
 * - Space complexity: O(limit) for the executing queue
 *
 * @template T - Return type of the async tasks
 * @param tasks - Array of async task functions to execute
 * @param limit - Maximum number of concurrent tasks (default: 5)
 * @returns Promise that resolves to array of task results (in original order)
 *
 * @example
 * ```typescript
 * // Upload 32 files with max 5 parallel connections
 * const uploadTasks = files.map(file => async () => {
 *   const response = await fetch(file.sasUrl, {
 *     method: 'PUT',
 *     body: file.data
 *   });
 *   return {fileId: file.id, success: response.ok};
 * });
 *
 * const results = await withConcurrencyLimit(uploadTasks, 5);
 * ```
 *
 * @example
 * ```typescript
 * // Process images with concurrency control
 * const processTasks = images.map(img => async () => {
 *   const processed = await processImage(img);
 *   return processed;
 * });
 *
 * const processed = await withConcurrencyLimit(processTasks, 3);
 * ```
 */
export async function withConcurrencyLimit<T>(tasks: Array<() => Promise<T>>, limit: number = 5): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  const executeNext = async (): Promise<void> => {
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex++;
      const task = tasks[taskIndex];
      
      if (!task) continue;
      
      try {
        results[taskIndex] = await task();
      } catch (error) {
        // Re-throw to bubble up error
        throw error;
      }
    }
  };

  // Create worker pool limited by `limit`
  const workers = Array.from({length: Math.min(limit, tasks.length)}, () => executeNext());
  await Promise.all(workers);
  
  return results;
}

/**
 * Executes async tasks with concurrency limit and progress tracking.
 *
 * @remarks
 * Similar to `withConcurrencyLimit` but provides progress callbacks for UI updates.
 *
 * **Progress Tracking:**
 * - `onProgress`: Called after each task completes
 * - `onTaskComplete`: Called for each individual task (success or failure)
 *
 * @template T - Return type of the async tasks
 * @param tasks - Array of async task functions to execute
 * @param options - Configuration options
 * @param options.limit - Maximum number of concurrent tasks (default: 5)
 * @param options.onProgress - Callback invoked after each task completes
 * @param options.onTaskComplete - Callback invoked for each task result
 * @returns Promise that resolves to array of task results (in original order)
 *
 * @example
 * ```typescript
 * const uploadTasks = files.map(file => async () => uploadFile(file));
 *
 * const results = await withConcurrencyLimitAndProgress(uploadTasks, {
 *   limit: 5,
 *   onProgress: (completed, total) => {
 *     console.log(`Progress: ${completed}/${total}`);
 *   },
 *   onTaskComplete: (result, index) => {
 *     console.log(`Task ${index} completed:`, result);
 *   }
 * });
 * ```
 */
export async function withConcurrencyLimitAndProgress<T>(
  tasks: Array<() => Promise<T>>,
  options: {
    limit?: number;
    onProgress?: (completed: number, total: number) => void;
    onTaskComplete?: (result: T | Error, index: number) => void;
  } = {},
): Promise<Array<T | Error>> {
  const {limit = 5, onProgress, onTaskComplete} = options;
  const results: Array<T | Error> = new Array(tasks.length);
  let currentIndex = 0;
  let completedCount = 0;

  const executeNext = async (): Promise<void> => {
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex++;
      const task = tasks[taskIndex];
      
      if (!task) continue;
      
      try {
        const result = await task();
        results[taskIndex] = result;
        completedCount++;
        onTaskComplete?.(result, taskIndex);
        onProgress?.(completedCount, tasks.length);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results[taskIndex] = err;
        completedCount++;
        onTaskComplete?.(err, taskIndex);
        onProgress?.(completedCount, tasks.length);
      }
    }
  };

  // Create worker pool limited by `limit`
  const workers = Array.from({length: Math.min(limit, tasks.length)}, () => executeNext());
  await Promise.all(workers);
  
  return results;
}
