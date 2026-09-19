import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

type AppliedMigration = {
    checksum: string;
};

const migrationFilePattern = /^\d{3}_[a-z0-9_]+\.sql$/;
const migrationLockName = 'idgg_schema_migrations';

const getDatabaseUrl = () => {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required.');
    }

    return databaseUrl;
};

const getMigrationFiles = async () => {
    const migrationsDirectory = join(__dirname, 'migrations');
    const entries = await readdir(migrationsDirectory, { withFileTypes: true });

    return entries
        .filter(entry => entry.isFile() && migrationFilePattern.test(entry.name))
        .map(entry => ({
            name: entry.name,
            path: join(migrationsDirectory, entry.name),
        }))
        .sort((first, second) => first.name.localeCompare(second.name));
};

export async function runMigrations(): Promise<string[]> {
    const migrationFiles = await getMigrationFiles();
    const client = new Client({ connectionString: getDatabaseUrl() });
    const appliedMigrations: string[] = [];

    try {
        await client.connect();
        await client.query(
            'SELECT pg_advisory_lock(hashtext($1))',
            [migrationLockName]
        );
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        for (const migrationFile of migrationFiles) {
            const sql = await readFile(migrationFile.path, 'utf8');
            const normalizedSql = sql.replace(/\r\n/g, '\n');

            if (!normalizedSql.trim()) {
                continue;
            }

            const checksum = createHash('sha256').update(normalizedSql).digest('hex');
            const existingMigration = await client.query<AppliedMigration>(
                'SELECT checksum FROM schema_migrations WHERE name = $1',
                [migrationFile.name]
            );

            if (existingMigration.rows.length > 0) {
                if (existingMigration.rows[0].checksum !== checksum) {
                    throw new Error(`Applied migration has changed: ${migrationFile.name}`);
                }

                continue;
            }

            await client.query('BEGIN');

            try {
                await client.query(normalizedSql);
                await client.query(
                    'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
                    [migrationFile.name, checksum]
                );
                await client.query('COMMIT');
                appliedMigrations.push(migrationFile.name);
            } catch (error: unknown) {
                await client.query('ROLLBACK');
                throw error;
            }
        }
    } finally {
        await client.end();
    }

    return appliedMigrations;
}

const migrate = async () => {
    try {
        const appliedMigrations = await runMigrations();

        if (appliedMigrations.length === 0) {
            console.log('Database schema is up to date.');
            return;
        }

        console.log(`Applied database migrations: ${appliedMigrations.join(', ')}`);
    } catch {
        console.error('Database migration failed.');
        process.exitCode = 1;
    }
};

if (require.main === module) {
    void migrate();
}
