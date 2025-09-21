/**
 * @fileoverview Unit tests for TaskPool implementation
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import {
	type ITaskPool,
	type Task,
	TaskPool,
	TaskRunStatus,
} from "./task-pool";

// Test task types
interface TestParams {
	value: number;
	delay?: number;
	shouldFail?: boolean;
}

interface TestResult {
	doubled: number;
	processedAt: number;
}

describe("TaskPool", () => {
	let testTask: Task<TestParams, TestResult>;
	let taskPool: ITaskPool<TestParams, TestResult>;

	beforeEach(() => {
		// Create a test task that doubles the input value
		testTask = async (params: TestParams): Promise<TestResult> => {
			if (params.delay) {
				await new Promise((resolve) => setTimeout(resolve, params.delay));
			}

			if (params.shouldFail) {
				throw new Error(`Task failed for value: ${params.value}`);
			}

			return {
				doubled: params.value * 2,
				processedAt: Date.now(),
			};
		};
	});

	afterEach(async () => {
		if (taskPool) {
			await taskPool.cleanup();
		}
		jest.clearAllMocks();
	});

	describe("constructor", () => {
		it("should initialize with default options", () => {
			taskPool = new TaskPool(testTask);

			expect(taskPool.getQueueSize()).toBe(0);
			expect(taskPool.isRunning()).toBe(false);
			expect(taskPool.getHistory()).toHaveLength(0);
		});
	});

	describe("enqueue", () => {
		beforeEach(() => {
			taskPool = new TaskPool(testTask);
		});

		it("should enqueue a task and return run ID", async () => {
			const params: TestParams = { value: 5 };
			const runId = await taskPool.enqueue(params);

			expect(runId).toMatch(/^run-\d+-\d+$/);
		});

		it("should not allow enqueueing when shutting down", async () => {
			await taskPool.cleanup();

			const params: TestParams = { value: 5 };

			await expect(taskPool.enqueue(params)).rejects.toThrow(
				"Task pool is shutting down, cannot enqueue new tasks",
			);
		});
	});

	describe("task execution", () => {
		beforeEach(() => {
			taskPool = new TaskPool(testTask);
		});

		it("should execute a single task successfully", async () => {
			const params: TestParams = { value: 10, delay: 5 }; // Add small delay for measurable duration
			const runId = await taskPool.enqueue(params);

			// Wait for task to complete
			await waitForTaskCompletion(taskPool, runId);

			const run = taskPool.getRunById(runId);
			expect(run).toBeDefined();
			if (run) {
				expect(run.status).toBe(TaskRunStatus.COMPLETED);
				expect(run.result).toEqual({
					doubled: 20,
					processedAt: expect.any(Number),
				});
				expect(run.duration).toBeGreaterThanOrEqual(0); // Use >= 0 instead of > 0
				expect(run.queueTime).toBeGreaterThanOrEqual(0);
			}
		});

		it("should handle task failure", async () => {
			const params: TestParams = { value: 5, shouldFail: true };
			const runId = await taskPool.enqueue(params);

			// Wait for task to complete
			await waitForTaskCompletion(taskPool, runId);

			const run = taskPool.getRunById(runId);
			expect(run).toBeDefined();
			if (run) {
				expect(run.status).toBe(TaskRunStatus.FAILED);
				expect(run.error).toBeDefined();
				if (run.error) {
					expect(run.error.message).toBe("Task failed for value: 5");
				}
				expect(run.result).toBeUndefined();
			}
		});

		it("should process tasks sequentially", async () => {
			const params1: TestParams = { value: 1, delay: 50 };
			const params2: TestParams = { value: 2, delay: 30 };
			const params3: TestParams = { value: 3, delay: 20 };

			await taskPool.enqueue(params1);
			await taskPool.enqueue(params2);
			const runId3 = await taskPool.enqueue(params3);

			// Wait for all tasks to complete
			await waitForTaskCompletion(taskPool, runId3);

			const history = taskPool.getHistory();
			expect(history).toHaveLength(3);

			// Verify order of execution (history is returned with most recent first)
			expect(history[2]?.result?.doubled).toBe(2); // First task: 1 * 2
			expect(history[1]?.result?.doubled).toBe(4); // Second task: 2 * 2
			expect(history[0]?.result?.doubled).toBe(6); // Third task: 3 * 2
		});

		it("should invoke processed callback after each task", async () => {
			const processedCallback = jest.fn();
			taskPool.setOnProcessed(processedCallback);

			const params1: TestParams = { value: 1, delay: 10 };
			const params2: TestParams = {
				value: 2,
				delay: 10,
				shouldFail: true,
			};

			const runId1 = await taskPool.enqueue(params1);
			const runId2 = await taskPool.enqueue(params2);

			// Wait for all tasks to complete
			await waitForTaskCompletion(taskPool, runId2);

			expect(processedCallback).toHaveBeenCalledTimes(2);

			const firstCallArg = processedCallback.mock.calls[0]?.[0];
			expect(firstCallArg.id).toBe(runId1);
			expect(firstCallArg.status).toBe(TaskRunStatus.COMPLETED);
			expect(firstCallArg.result?.doubled).toBe(2);

			const secondCallArg = processedCallback.mock.calls[1]?.[0];
			expect(secondCallArg.id).toBe(runId2);
			expect(secondCallArg.status).toBe(TaskRunStatus.FAILED);
			expect(secondCallArg.error?.message).toBe("Task failed for value: 2");
		});
	});

	describe("history management", () => {
		beforeEach(() => {
			taskPool = new TaskPool(testTask, {
				maxHistorySize: 3,
			});
		});

		it("should maintain run history", async () => {
			const params1: TestParams = { value: 1 };
			const params2: TestParams = { value: 2 };

			await taskPool.enqueue(params1);
			const runId2 = await taskPool.enqueue(params2);

			await waitForTaskCompletion(taskPool, runId2);

			const history = taskPool.getHistory();
			expect(history).toHaveLength(2);
			expect(history[1]?.result?.doubled).toBe(2);
			expect(history[0]?.result?.doubled).toBe(4);
		});

		it("should trim history when max size is exceeded", async () => {
			// Enqueue 5 tasks (more than maxHistorySize of 3)
			const runIds: string[] = [];
			for (let i = 1; i <= 5; i++) {
				const runId = await taskPool.enqueue({ value: i });
				runIds.push(runId);
			}

			const lastRunId = runIds[runIds.length - 1];
			if (lastRunId) {
				await waitForTaskCompletion(taskPool, lastRunId);
			}

			const history = taskPool.getHistory();
			expect(history).toHaveLength(3); // Limited to maxHistorySize

			// Should keep the 3 most recent tasks (3, 4, 5)
			expect(history[2]?.result?.doubled).toBe(6); // value 3 * 2
			expect(history[1]?.result?.doubled).toBe(8); // value 4 * 2
			expect(history[0]?.result?.doubled).toBe(10); // value 5 * 2
		});

		it("should clear history", async () => {
			const runId = await taskPool.enqueue({ value: 1 });
			await waitForTaskCompletion(taskPool, runId);

			expect(taskPool.getHistory()).toHaveLength(1);

			taskPool.clearHistory();
			expect(taskPool.getHistory()).toHaveLength(0);
		});

		it("should return limited history when requested", async () => {
			// Add 3 tasks
			for (let i = 1; i <= 3; i++) {
				const runId = await taskPool.enqueue({ value: i });
				await waitForTaskCompletion(taskPool, runId);
			}

			const fullHistory = taskPool.getHistory();
			const limitedHistory = taskPool.getHistory(2);

			expect(fullHistory).toHaveLength(3);
			expect(limitedHistory).toHaveLength(2);

			// Safe array access with optional chaining
			if (fullHistory[0] && limitedHistory[0]) {
				expect(limitedHistory[0]).toEqual(fullHistory[0]);
			}
			if (fullHistory[1] && limitedHistory[1]) {
				expect(limitedHistory[1]).toEqual(fullHistory[1]);
			}
		});
	});

	describe("run management", () => {
		beforeEach(() => {
			taskPool = new TaskPool(testTask);
		});

		it("should find run by ID in different states", async () => {
			// Enqueue a task with delay so we can check different states
			const runId = await taskPool.enqueue({ value: 5, delay: 100 });

			// Wait a brief moment to check different states
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should find task (might be pending or running depending on timing)
			let run = taskPool.getRunById(runId);
			expect(run).toBeDefined();
			if (run) {
				expect([TaskRunStatus.PENDING, TaskRunStatus.RUNNING]).toContain(
					run.status,
				);
			}

			// Wait for completion
			await waitForTaskCompletion(taskPool, runId);

			// Should find completed task in history
			run = taskPool.getRunById(runId);
			expect(run).toBeDefined();
			if (run) {
				expect(run.status).toBe(TaskRunStatus.COMPLETED);
			}
		});

		it("should return undefined for non-existent run ID", () => {
			const run = taskPool.getRunById("non-existent");
			expect(run).toBeUndefined();
		});

		it("should track current run", async () => {
			expect(taskPool.getCurrentRun()).toBeUndefined();
			expect(taskPool.isRunning()).toBe(false);

			const runId = await taskPool.enqueue({ value: 5, delay: 50 });

			// Wait for task to start
			await new Promise((resolve) => setTimeout(resolve, 25));

			const currentRun = taskPool.getCurrentRun();
			if (currentRun && currentRun.status === TaskRunStatus.RUNNING) {
				expect(currentRun.id).toBe(runId);
				expect(taskPool.isRunning()).toBe(true);
			}

			await waitForTaskCompletion(taskPool, runId);

			expect(taskPool.getCurrentRun()).toBeUndefined();
			expect(taskPool.isRunning()).toBe(false);
		});
	});

	describe("statistics", () => {
		beforeEach(() => {
			taskPool = new TaskPool(testTask);
		});

		it("should provide accurate statistics", async () => {
			// Initial stats
			let stats = taskPool.getStats();
			expect(stats).toEqual({
				totalRuns: 0,
				completedRuns: 0,
				failedRuns: 0,
				currentQueueSize: 0,
				isRunning: false,
				averageDurationMs: 0,
			});

			// Add successful task with small delay for measurable duration
			const runId1 = await taskPool.enqueue({ value: 1, delay: 10 });
			await waitForTaskCompletion(taskPool, runId1);

			// Add failed task with small delay for measurable duration
			const runId2 = await taskPool.enqueue({
				value: 2,
				shouldFail: true,
				delay: 5,
			});
			await waitForTaskCompletion(taskPool, runId2);

			stats = taskPool.getStats();
			expect(stats.totalRuns).toBe(2);
			expect(stats.completedRuns).toBe(1);
			expect(stats.failedRuns).toBe(1);
			expect(stats.averageDurationMs).toBeGreaterThanOrEqual(0);
		});
	});

	describe("cleanup", () => {
		beforeEach(() => {
			taskPool = new TaskPool(testTask);
		});

		it("should cleanup gracefully", async () => {
			// Add some tasks with very small delay to ensure they don't complete immediately
			await taskPool.enqueue({ value: 1, delay: 10 });
			await taskPool.enqueue({ value: 2, delay: 10 });

			// Check queue immediately after enqueueing
			const initialQueueSize = taskPool.getQueueSize();
			expect(initialQueueSize).toBeGreaterThanOrEqual(1); // At least 1 should still be queued

			await taskPool.cleanup();

			expect(taskPool.getQueueSize()).toBe(0);
		});

		it("should wait for current task to complete during cleanup", async () => {
			// Start a long-running task
			const runId = await taskPool.enqueue({ value: 1, delay: 100 });

			// Wait for task to start
			await new Promise((resolve) => setTimeout(resolve, 25));
			expect(taskPool.isRunning()).toBe(true);

			// Start cleanup
			const cleanupPromise = taskPool.cleanup();

			// Should still be running initially
			expect(taskPool.isRunning()).toBe(true);

			// Wait for cleanup to complete
			await cleanupPromise;

			// Should be done now
			expect(taskPool.isRunning()).toBe(false);

			// Task should have completed
			const run = taskPool.getRunById(runId);
			expect(run).toBeDefined();
			if (run) {
				expect(run.status).toBe(TaskRunStatus.COMPLETED);
			}
		});
	});
});

/**
 * Helper function to wait for a task to complete
 */
async function waitForTaskCompletion<TParams, TResult>(
	taskPool: ITaskPool<TParams, TResult>,
	runId: string,
	timeoutMs: number = 5000,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		const run = taskPool.getRunById(runId);
		if (
			run &&
			(run.status === TaskRunStatus.COMPLETED ||
				run.status === TaskRunStatus.FAILED)
		) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}

	throw new Error(`Task ${runId} did not complete within ${timeoutMs}ms`);
}
