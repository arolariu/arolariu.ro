/** @format */

const DefaultAzureCredential = require("@azure/identity").DefaultAzureCredential;
const SecretClient = require("@azure/keyvault-secrets").SecretClient;
const dotenv = require("dotenv");
const pc = require("picocolors");
const fs = require("fs");

// Load the deployment stage environment variable from the .env file
type Environment = "DEVELOPMENT" | "PREPRODUCTION" | "PRODUCTION";
dotenv.config();
const requiredVars = [
	//Required for the platform:
	"SITE_NAME",
	"SITE_URL",

	//Required for the OAuth 2.0 providers:
	"GITHUB_CLIENT_ID",
	"GITHUB_CLIENT_SECRET",
	"DISCORD_CLIENT_ID",
	"DISCORD_CLIENT_SECRET",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",

	//Required for the OAuth 2.0 persistence:
	"OAUTH2_DATABASE_URL",
	"OAUTH2_SHADOW_DATABASE_URL",
];

async function main() {
	const environement = process.env.NODE_ENVIRONMENT as Environment;
	switch (environement) {
		case "DEVELOPMENT":
			console.info(pc.bold(pc.green("Development environment detected.")));
			validateDevelopmentEnvironment();
			break;
		case "PREPRODUCTION":
			console.info(pc.bold(pc.green("Preproduction environment detected.")));
			await fetchAndSetSecretsAsync(environement);
			break;
		case "PRODUCTION":
			console.info(pc.bold(pc.green("Production environment detected.")));
			await fetchAndSetSecretsAsync(environement);
			break;
		default:
			throw new Error(`Environment ${environement} not supported.`);
	}
}

main();

function validateDevelopmentEnvironment(): void {
	console.warn(
		pc.yellow("For development purposes, the environment variables are loaded from the .env file."),
	);
	console.warn(
		pc.yellow(
			"The script will only validate that environment variables names are set-up correctly.",
		),
	);

	dotenv.config({path: ".env.local"});
	const envVars = Object.keys(process.env);

	const missingVars = requiredVars.filter((requiredVar) => !envVars.includes(requiredVar));
	if (missingVars.length > 0) {
		console.error(
			`The following environment variables are missing:\n${pc.cyan(missingVars.join("\n"))}`,
		);
		throw new Error(pc.bold(pc.red("The environment variables names are not set-up correctly...")));
	} else {
		console.info(
			pc.bold(
				pc.blue("The environment variables names (not their values!) are set as expected..."),
			),
		);
	}
}

async function fetchAndSetSecretsAsync(environement: Environment): Promise<void> {
	const kvName = process.env.KEYVAULT_NAME ?? "";
	console.log(pc.bold(pc.blue(`Fetching secrets from the Azure Key Vault: ${kvName}...`)));
	const kvUrl = `https://${kvName}.vault.azure.net`;
	const credentials = new DefaultAzureCredential();
	const client = new SecretClient(kvUrl, credentials);

	const fetchSecretFromKVAsync = async (secretName: string): Promise<string> => {
		const secret = await client.getSecret(secretName);
		if (secret === undefined || secret.value === undefined) {
			throw new Error(`Secret ${secretName} not found in the Azure Key Vault: ${kvName}.`);
		} else {
			console.info(pc.green(`Secret ${secretName} was found in the Azure Key Vault: ${kvName}.`));
			return secret.value;
		}
	};

	const secrets: any = {};
	for (const requiredVar of requiredVars) {
		const secretName = requiredVar.replace(/_/g, "-") + "-" + environement;
		const secretValue = await fetchSecretFromKVAsync(secretName);
		secrets[requiredVar] = '"' + secretValue + '"';
	}

	const envContent = Object.entries(secrets)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");

	fs.writeFileSync(`.env.local`, envContent);
	console.log(pc.bold(pc.green("Configured environment variables successfully!")));
}
