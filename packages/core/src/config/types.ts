export interface IConfig {
	[key: string]: unknown;
}

export interface IConfigService {
	getConfig(): IConfig;
	getLoggingConfig(): IConfig;
	validate(): { success: boolean; errors?: string[] };
}
