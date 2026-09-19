import 'dotenv/config';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required.');
}

const databasePool = new Pool({
    connectionString: databaseUrl,
});

let closeDatabasePromise: Promise<void> | null = null;

databasePool.on('error', () => {
    console.error('Unexpected PostgreSQL connection error.');
});

export function queryDatabase<Row extends QueryResultRow>(
    queryText: string,
    values: unknown[] = []
): Promise<QueryResult<Row>> {
    return databasePool.query<Row, unknown[]>(queryText, values);
}

export async function verifyDatabaseConnection(): Promise<void> {
    const client = await databasePool.connect();

    try {
        await client.query('SELECT 1');
    } finally {
        client.release();
    }
}

export function closeDatabase(): Promise<void> {
    if (!closeDatabasePromise) {
        closeDatabasePromise = databasePool.end();
    }

    return closeDatabasePromise;
}
