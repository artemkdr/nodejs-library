import type { IConfig, IConfigService } from "./types";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export class ConfigService implements IConfigService {
	private static instance: IConfigService;
	private config: IConfig;

	private constructor() {
		this.config = this.loadConfig();
		this.validateConfig();
	}

	static getInstance(): IConfigService {
		if (!ConfigService.instance) {
			ConfigService.instance = new ConfigService();
		}
		return ConfigService.instance;
	}

	validate(): { success: boolean; errors?: string[] } {
		try {
			this.validateConfig();
			return { success: true };
		} catch (error) {
			return { success: false, errors: [(error as Error).message] };
		}
	}

	getConfig(): IConfig {
		return this.config;
	}

	getLoggingConfig(): IConfig {
		return this.config["logging"] as IConfig;
	}

	protected validateConfig(): void {
		// Implement validation logic here
	}

	protected loadConfig(): IConfig {
		return {
			logging: {
				level: process.env["LOG_LEVEL"] || "info",
			},
		};
	}
}
