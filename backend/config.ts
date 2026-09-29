import 'dotenv/config';

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export type RiotPlatform =
    | 'br1'
    | 'eun1'
    | 'euw1'
    | 'jp1'
    | 'kr'
    | 'la1'
    | 'la2'
    | 'me1'
    | 'na1'
    | 'oc1'
    | 'ph2'
    | 'ru'
    | 'sg2'
    | 'th2'
    | 'tr1'
    | 'tw2'
    | 'vn2';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type ServerConfig = {
    environment: DeploymentEnvironment;
    port: number;
    publicOrigin: string;
    trustProxyHops: number;
    shutdownGraceMilliseconds: number;
    releaseVersion: string;
    supportedPlatforms: readonly RiotPlatform[];
    logLevel: LogLevel;
};

export type DatabaseConfig = {
    connectionString: string;
};

export type RiotClientConfig = {
    apiKey: string;
};

const riotPlatforms: readonly RiotPlatform[] = [
    'br1', 'eun1', 'euw1', 'jp1', 'kr', 'la1', 'la2', 'me1', 'na1',
    'oc1', 'ph2', 'ru', 'sg2', 'th2', 'tr1', 'tw2', 'vn2',
];

const riotPlatformSet = new Set<string>(riotPlatforms);

const getOptionalEnvironmentValue = (name: string): string | null => {
    const value = process.env[name]?.trim();
    return value ? value : null;
};

const getRequiredEnvironmentValue = (name: string): string => {
    const value = getOptionalEnvironmentValue(name);

    if (!value) {
        throw new Error(`${name} environment variable is required.`);
    }

    return value;
};

const getDeploymentEnvironment = (): DeploymentEnvironment => {
    const value = getOptionalEnvironmentValue('NODE_ENV') ?? 'development';

    if (value !== 'development' && value !== 'staging' && value !== 'production') {
        throw new Error('NODE_ENV environment variable must be development, staging, or production.');
    }

    return value;
};

const getIntegerEnvironmentValue = (
    name: string,
    defaultValue: number | null,
    minimum: number,
    maximum: number
): number => {
    const configuredValue = getOptionalEnvironmentValue(name);

    if (!configuredValue && defaultValue !== null) {
        return defaultValue;
    }

    const value = configuredValue ?? getRequiredEnvironmentValue(name);

    if (!/^\d+$/.test(value)) {
        throw new Error(`${name} environment variable must be an integer between ${minimum} and ${maximum}.`);
    }

    const parsedValue = Number(value);

    if (!Number.isSafeInteger(parsedValue) || parsedValue < minimum || parsedValue > maximum) {
        throw new Error(`${name} environment variable must be an integer between ${minimum} and ${maximum}.`);
    }

    return parsedValue;
};

const getPublicOrigin = (environment: DeploymentEnvironment): string => {
    const configuredOrigin = getOptionalEnvironmentValue('PUBLIC_ORIGIN');

    if (!configuredOrigin && environment === 'development') {
        return 'http://localhost:3000';
    }

    const originValue = configuredOrigin ?? getRequiredEnvironmentValue('PUBLIC_ORIGIN');
    let origin: URL;

    try {
        origin = new URL(originValue);
    } catch {
        throw new Error('PUBLIC_ORIGIN environment variable must be a valid origin URL.');
    }

    const hasRootPath = origin.pathname === '' || origin.pathname === '/';
    const hasAllowedProtocol = environment === 'development'
        ? origin.protocol === 'http:' || origin.protocol === 'https:'
        : origin.protocol === 'https:';

    if (
        !hasAllowedProtocol
        || !origin.hostname
        || origin.username
        || origin.password
        || !hasRootPath
        || origin.search
        || origin.hash
        || origin.origin === 'null'
    ) {
        const protocolRequirement = environment === 'development'
            ? 'HTTP or HTTPS'
            : 'HTTPS';
        throw new Error(`PUBLIC_ORIGIN environment variable must be a credential-free ${protocolRequirement} origin.`);
    }

    return origin.origin;
};

const getReleaseVersion = (environment: DeploymentEnvironment): string => {
    const configuredVersion = getOptionalEnvironmentValue('RELEASE_VERSION');

    if (!configuredVersion && environment === 'development') {
        return 'development';
    }

    const releaseVersion = configuredVersion ?? getRequiredEnvironmentValue('RELEASE_VERSION');

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(releaseVersion)) {
        throw new Error('RELEASE_VERSION environment variable must be a valid release identifier.');
    }

    return releaseVersion;
};

const isRiotPlatform = (value: string): value is RiotPlatform => (
    riotPlatformSet.has(value)
);

const getSupportedPlatforms = (): readonly RiotPlatform[] => {
    const configuredPlatforms = getOptionalEnvironmentValue('SUPPORTED_PLATFORMS')
        ?? 'eun1,euw1';
    const values = configuredPlatforms.split(',').map(value => (
        value.trim().toLocaleLowerCase('en-US')
    ));
    const supportedPlatforms: RiotPlatform[] = [];
    const selectedPlatforms = new Set<RiotPlatform>();

    for (const value of values) {
        if (!value || !isRiotPlatform(value) || selectedPlatforms.has(value)) {
            throw new Error('SUPPORTED_PLATFORMS environment variable must contain unique supported Riot platform values.');
        }

        supportedPlatforms.push(value);
        selectedPlatforms.add(value);
    }

    return supportedPlatforms;
};

const getLogLevel = (): LogLevel => {
    const value = getOptionalEnvironmentValue('LOG_LEVEL') ?? 'info';

    if (value !== 'debug' && value !== 'info' && value !== 'warn' && value !== 'error') {
        throw new Error('LOG_LEVEL environment variable must be debug, info, warn, or error.');
    }

    return value;
};

const getDatabaseConnectionString = (name: string): string => {
    const connectionString = getRequiredEnvironmentValue(name);
    let databaseUrl: URL;

    try {
        databaseUrl = new URL(connectionString);
    } catch {
        throw new Error(`${name} environment variable must be a valid PostgreSQL connection URL.`);
    }

    if (
        (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:')
        || !databaseUrl.pathname
        || databaseUrl.pathname === '/'
        || databaseUrl.hash
    ) {
        throw new Error(`${name} environment variable must be a valid PostgreSQL connection URL.`);
    }

    return connectionString;
};

export const getServerConfig = (): ServerConfig => {
    const environment = getDeploymentEnvironment();
    const trustProxyDefault = environment === 'development' ? 0 : null;

    return {
        environment,
        port: getIntegerEnvironmentValue('PORT', 4000, 1, 65535),
        publicOrigin: getPublicOrigin(environment),
        trustProxyHops: getIntegerEnvironmentValue(
            'TRUST_PROXY_HOPS',
            trustProxyDefault,
            0,
            16
        ),
        shutdownGraceMilliseconds: getIntegerEnvironmentValue(
            'SHUTDOWN_GRACE_MS',
            25000,
            1000,
            120000
        ),
        releaseVersion: getReleaseVersion(environment),
        supportedPlatforms: getSupportedPlatforms(),
        logLevel: getLogLevel(),
    };
};

export const getDatabaseConfig = (): DatabaseConfig => ({
    connectionString: getDatabaseConnectionString('DATABASE_URL'),
});

export const getMigrationDatabaseConfig = (): DatabaseConfig => {
    const environment = getDeploymentEnvironment();
    const migrationConnectionString = getOptionalEnvironmentValue(
        'MIGRATION_DATABASE_URL'
    );

    if (migrationConnectionString) {
        return {
            connectionString: getDatabaseConnectionString('MIGRATION_DATABASE_URL'),
        };
    }

    if (environment !== 'development') {
        throw new Error('MIGRATION_DATABASE_URL environment variable is required outside development.');
    }

    return getDatabaseConfig();
};

export const getRiotClientConfig = (): RiotClientConfig => ({
    apiKey: getRequiredEnvironmentValue('RIOT_API_KEY'),
});
