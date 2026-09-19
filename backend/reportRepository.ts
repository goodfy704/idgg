import { queryDatabase } from './database';
import { isPlayerReport, type PlayerReport } from './riotSchemas';

type ReportCacheRow = {
    game_name: unknown;
    tag_line: unknown;
    puuid: unknown;
    platform: unknown;
    regional_route: unknown;
    report: unknown;
    fetched_at: unknown;
};

export type CachedReport = {
    gameName: string;
    tagLine: string;
    puuid: string;
    platform: string;
    regionalRoute: string;
    report: PlayerReport;
    fetchedAt: Date;
};

type SaveReportInput = {
    gameName: string;
    tagLine: string;
    platform: string;
    regionalRoute: string;
    report: PlayerReport;
};

const normalizeCachePart = (value: string) => (
    value.normalize('NFKC').toLocaleLowerCase('en-US')
);

export const getReportCacheKey = (gameName: string, tagLine: string) => (
    `${normalizeCachePart(gameName)}#${normalizeCachePart(tagLine)}`
);

const isValidDate = (value: unknown): value is Date => (
    value instanceof Date && !Number.isNaN(value.getTime())
);

const parseCachedReport = (
    row: ReportCacheRow,
    expectedCacheKey: string
): CachedReport => {
    if (
        typeof row.game_name !== 'string'
        || typeof row.tag_line !== 'string'
        || typeof row.puuid !== 'string'
        || typeof row.platform !== 'string'
        || row.platform.length === 0
        || typeof row.regional_route !== 'string'
        || row.regional_route.length === 0
        || !isPlayerReport(row.report)
        || row.report.summoner.puuid !== row.puuid
        || !isValidDate(row.fetched_at)
        || getReportCacheKey(row.game_name, row.tag_line) !== expectedCacheKey
    ) {
        throw new Error('Stored report is invalid.');
    }

    return {
        gameName: row.game_name,
        tagLine: row.tag_line,
        puuid: row.puuid,
        platform: row.platform,
        regionalRoute: row.regional_route,
        report: row.report,
        fetchedAt: row.fetched_at,
    };
};

export async function getCachedReport(
    gameName: string,
    tagLine: string
): Promise<CachedReport | null> {
    const cacheKey = getReportCacheKey(gameName, tagLine);
    const result = await queryDatabase<ReportCacheRow>(`
        SELECT game_name, tag_line, puuid, platform, regional_route, report, fetched_at
        FROM report_cache
        WHERE cache_key = $1
    `, [cacheKey]);

    if (result.rows.length === 0) {
        return null;
    }

    return parseCachedReport(result.rows[0], cacheKey);
}

export async function saveCachedReport(input: SaveReportInput): Promise<CachedReport> {
    if (
        !input.gameName.trim()
        || !input.tagLine.trim()
        || !input.platform.trim()
        || !input.regionalRoute.trim()
        || !isPlayerReport(input.report)
    ) {
        throw new Error('Report cache input is invalid.');
    }

    const cacheKey = getReportCacheKey(input.gameName, input.tagLine);
    const serializedReport = JSON.stringify(input.report);

    const result = await queryDatabase<ReportCacheRow>(`
        INSERT INTO report_cache (
            cache_key,
            game_name,
            tag_line,
            puuid,
            platform,
            regional_route,
            report
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        ON CONFLICT (cache_key) DO UPDATE SET
            game_name = EXCLUDED.game_name,
            tag_line = EXCLUDED.tag_line,
            puuid = EXCLUDED.puuid,
            platform = EXCLUDED.platform,
            regional_route = EXCLUDED.regional_route,
            report = EXCLUDED.report,
            fetched_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        RETURNING game_name, tag_line, puuid, platform, regional_route, report, fetched_at
    `, [
        cacheKey,
        input.gameName,
        input.tagLine,
        input.report.summoner.puuid,
        input.platform,
        input.regionalRoute,
        serializedReport,
    ]);

    if (result.rows.length !== 1) {
        throw new Error('Stored report could not be returned.');
    }

    return parseCachedReport(result.rows[0], cacheKey);
}
