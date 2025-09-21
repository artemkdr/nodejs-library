/**
 * @fileoverview Standard task pool implementation for processing tasks sequentially
 * Maintains run history and provides a generic interface for task execution
 */

/**
 * Represents a task function that can be executed by the task pool
 */
export type Task<TParams, TResult> = (params: TParams) => Promise<TResult>;

/**
 * Status of a task run
 */
export enum TaskRunStatus {
	PENDING = "pending",
	RUNNING = "running",
	COMPLETED = "completed",
	FAILED = "failed",
}

/**
 * Record of a task execution
 */
export interface TaskRun<TParams, TResult> {
	/** Unique identifier for the run */
	readonly id: string;
	/** Task parameters */
	readonly params: TParams;
	/** Current status */
	status: TaskRunStatus;
	/** Task result (if completed successfully) */
	result?: TResult;
	/** Error (if failed) */
	error?: Error;
	/** Start time */
	startedAt?: Date;
	/** Completion time */
	completedAt?: Date;
	/** Duration in milliseconds */
	duration?: number;
	/** Queue time in milliseconds */
	queueTime?: number;
	/** Time when task was queued */
	readonly queuedAt: Date;
}

export interface PoolStats {
	totalRuns: number;
	completedRuns: number;
	failedRuns: number;
	currentQueueSize: number;
	isRunning: boolean;
	averageDurationMs: number;
}

/**
 * Configuration options for task pool
 */
export interface TaskPoolOptions {
	/** Maximum number of runs to keep in history (default: 100) */
	maxHistorySize?: number;
}

/**
 * Generic task pool interface for processing tasks sequentially
 */
export interface ITaskPool<TParams, TResult> {
	/**
	 * Add a task to the queue
	 * @param params Task parameters
	 * @returns Promise that resolves with task run ID
	 */
	enqueue(params: TParams): Promise<string>;

	/**
	 * Get current queue size
	 */
	getQueueSize(): number;

	/**
	 * Get run history, most recent first.
	 * @param limit Optional limit for number of runs to return
	 */
	getHistory(limit?: number): TaskRun<TParams, TResult>[];

	/**
	 * Get specific task run by ID
	 * @param runId Run identifier
	 */
	getRunById(runId: string): TaskRun<TParams, TResult> | undefined;

	/**
	 * Get currently running task (if any)
	 */
	getCurrentRun(): TaskRun<TParams, TResult> | undefined;

	/**
	 * Check if pool is currently processing a task
	 */
	isRunning(): boolean;

	/**
	 * Get pool statistics
	 */
	getStats(): PoolStats;

	/**
	 * Clear run history
	 */
	clearHistory(): void;

	/**
	 * Cleanup resources and stop processing
	 */
	cleanup(): Promise<void>;

	/**
	 * Task process callback function
	 */
	setOnProcessed(callback: (taskRun: TaskRun<TParams, TResult>) => void): void;
}

/**
 * Standard task pool implementation that processes tasks sequentially
 * Keeps run history in memory and provides comprehensive task management
 */
export class TaskPool<TParams, TResult> implements ITaskPool<TParams, TResult> {
	private readonly task: Task<TParams, TResult>;
	private readonly options: Required<TaskPoolOptions>;

	private readonly queue: Array<TaskRun<TParams, TResult>> = [];
	private readonly history: Array<TaskRun<TParams, TResult>> = [];
	private currentRun: TaskRun<TParams, TResult> | undefined;
	private isProcessing = false;
	private isShuttingDown = false;
	private runCounter = 0;

	private onProcessed?: (taskRun: TaskRun<TParams, TResult>) => void;

	constructor(task: Task<TParams, TResult>, options: TaskPoolOptions = {}) {
		this.task = task;
		this.options = {
			maxHistorySize: options.maxHistorySize ?? 100,
		};
	}

	async enqueue(params: TParams): Promise<string> {
		if (this.isShuttingDown) {
			throw new Error("Task pool is shutting down, cannot enqueue new tasks");
		}

		const runId = this.generateRunId();
		const taskRun: TaskRun<TParams, TResult> = {
			id: runId,
			params,
			status: TaskRunStatus.PENDING,
			queuedAt: new Date(),
		};

		this.queue.push(taskRun);

		// Start processing if not already running
		this.processNextTask();

		return runId;
	}

	getQueueSize(): number {
		return this.queue.length;
	}

	getHistory(limit?: number): TaskRun<TParams, TResult>[] {
		const history = [...this.history].reverse(); // Most recent first
		return limit ? history.slice(0, limit) : history;
	}

	getRunById(runId: string): TaskRun<TParams, TResult> | undefined {
		// Check current run
		if (this.currentRun?.id === runId) {
			return { ...this.currentRun };
		}

		// Check queue
		const queuedRun = this.queue.find((run) => run.id === runId);
		if (queuedRun) {
			return { ...queuedRun };
		}

		// Check history
		const historyRun = this.history.find((run) => run.id === runId);
		return historyRun ? { ...historyRun } : undefined;
	}

	getCurrentRun(): TaskRun<TParams, TResult> | undefined {
		return this.currentRun ? { ...this.currentRun } : undefined;
	}

	isRunning(): boolean {
		return this.isProcessing;
	}

	getStats(): PoolStats {
		const completedRuns = this.history.filter(
			(run) => run.status === TaskRunStatus.COMPLETED,
		).length;
		const failedRuns = this.history.filter(
			(run) => run.status === TaskRunStatus.FAILED,
		).length;

		const durations = this.history
			.filter((run) => run.duration !== undefined)
			.map((run) => run.duration || 0);

		const averageDurationMs =
			durations.length > 0
				? durations.reduce((sum, duration) => sum + duration, 0) /
					durations.length
				: 0;

		return {
			totalRuns: this.history.length,
			completedRuns,
			failedRuns,
			currentQueueSize: this.queue.length,
			isRunning: this.isProcessing,
			averageDurationMs: Math.round(averageDurationMs),
		} as PoolStats;
	}

	clearHistory(): void {
		this.history.length = 0;
	}

	async cleanup(): Promise<void> {
		this.isShuttingDown = true;

		// Wait for current task to complete if running
		while (this.isProcessing) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Clear remaining queue
		this.queue.length = 0;
	}

	setOnProcessed(callback: (taskRun: TaskRun<TParams, TResult>) => void): void {
		this.onProcessed = callback;
	}

	/**
	 * Process the next task in the queue
	 */
	private async processNextTask(): Promise<void> {
		if (this.isProcessing || this.isShuttingDown || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;
		const taskRun = this.queue.shift();
		if (!taskRun) {
			this.isProcessing = false;
			return;
		}
		this.currentRun = taskRun;

		// Update run status and timing
		taskRun.status = TaskRunStatus.RUNNING;
		taskRun.startedAt = new Date();
		taskRun.queueTime =
			taskRun.startedAt.getTime() - taskRun.queuedAt.getTime();

		try {
			// Execute the task
			const result = await this.task(taskRun.params);

			// Task completed successfully
			taskRun.status = TaskRunStatus.COMPLETED;
			taskRun.result = result;
			taskRun.completedAt = new Date();
			taskRun.duration =
				taskRun.completedAt.getTime() - taskRun.startedAt.getTime();
		} catch (error) {
			// Task failed
			taskRun.status = TaskRunStatus.FAILED;
			taskRun.error = error instanceof Error ? error : new Error(String(error));
			taskRun.completedAt = new Date();
			taskRun.duration =
				taskRun.completedAt.getTime() - taskRun.startedAt.getTime();
		}

		// Move to history and cleanup
		this.addToHistory(taskRun);
		this.currentRun = undefined;
		this.isProcessing = false;

		// Invoke processed callback if set
		this.onProcessed?.(taskRun);

		// Process next task if available
		if (this.queue.length > 0 && !this.isShuttingDown) {
			// Use setImmediate to avoid deep recursion
			setImmediate(() => this.processNextTask());
		}
	}

	/**
	 * Add completed task run to history
	 */
	private addToHistory(taskRun: TaskRun<TParams, TResult>): void {
		this.history.push(taskRun);

		// Trim history if it exceeds max size
		while (this.history.length > this.options.maxHistorySize) {
			this.history.shift();
		}
	}

	/**
	 * Generate unique run ID
	 */
	private generateRunId(): string {
		this.runCounter += 1;
		const timestamp = Date.now();
		return `run-${timestamp}-${this.runCounter}`;
	}
}
