declare module "consistent-path" {
	const getPath: {
		(): string;
		async(): Promise<string>;
	}
	export = getPath;
}
