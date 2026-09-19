import { queryDatabase } from './database';
import {
    isMatchTimeline,
    isPlayerReport,
    type MatchTimeline,
    type PlayerReport,
} from './riotSchemas';

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

type SyncLeaseRow = {
    lease_expires_at: unknown;
};

type MatchTimelineRow = {
    match_id: unknown;
    regional_route: unknown;
    timeline: unknown;
    fetched_at: unknown;
};

export type CachedMatchTimeline = {
    matchId: string;
    regionalRoute: string;
    timeline: MatchTimeline;
    fetchedAt: Date;
};

type SaveMatchTimelineInput = {
    matchId: string;
    regionalRoute: string;
    timeline: MatchTimeline;
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

const parseCachedMatchTimeline = (
    row: MatchTimelineRow,
    expectedMatchId: string,
    expectedRegionalRoute: string
): CachedMatchTimeline => {
    if (
        typeof row.match_id !== 'string'
        || row.match_id !== expectedMatchId
        || typeof row.regional_route !== 'string'
        || row.regional_route !== expectedRegionalRoute
        || !isMatchTimeline(row.timeline)
        || row.timeline.metadata.matchId !== row.match_id
        || !isValidDate(row.fetched_at)
    ) {
        throw new Error('Stored match timeline is invalid.');
    }

    return {
        matchId: row.match_id,
        regionalRoute: row.regional_route,
        timeline: row.timeline,
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

export async function getCachedMatchTimeline(
    matchId: string,
    regionalRoute: string
): Promise<CachedMatchTimeline | null> {
    const normalizedMatchId = matchId.trim();
    const normalizedRegionalRoute = regionalRoute.trim().toLocaleLowerCase('en-US');

    if (!normalizedMatchId || !normalizedRegionalRoute) {
        throw new Error('Match timeline identity is invalid.');
    }

    const result = await queryDatabase<MatchTimelineRow>(`
        SELECT match_id, regional_route, timeline, fetched_at
        FROM match_timelines
        WHERE match_id = $1
            AND regional_route = $2
    `, [normalizedMatchId, normalizedRegionalRoute]);

    if (result.rows.length === 0) {
        return null;
    }

    return parseCachedMatchTimeline(
        result.rows[0],
        normalizedMatchId,
        normalizedRegionalRoute
    );
}

export async function saveMatchTimeline(
    input: SaveMatchTimelineInput
): Promise<CachedMatchTimeline> {
    const matchId = input.matchId.trim();
    const regionalRoute = input.regionalRoute.trim().toLocaleLowerCase('en-US');

    if (
        !matchId
        || !regionalRoute
        || !isMatchTimeline(input.timeline)
        || input.timeline.metadata.matchId !== matchId
    ) {
        throw new Error('Match timeline input is invalid.');
    }

    const result = await queryDatabase<MatchTimelineRow>(`
        INSERT INTO match_timelines (
            match_id,
            regional_route,
            timeline
        )
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (match_id) DO UPDATE SET
            timeline = EXCLUDED.timeline,
            fetched_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE match_timelines.regional_route = EXCLUDED.regional_route
        RETURNING match_id, regional_route, timeline, fetched_at
    `, [matchId, regionalRoute, JSON.stringify(input.timeline)]);

    if (result.rows.length !== 1) {
        throw new Error('Match timeline could not be stored.');
    }

    return parseCachedMatchTimeline(result.rows[0], matchId, regionalRoute);
}

export async function acquireReportSyncLease(
    cacheKey: string,
    ownerId: string,
    leaseDurationMilliseconds: number
): Promise<boolean> {
    const result = await queryDatabase<SyncLeaseRow>(`
        INSERT INTO report_sync_state (
            cache_key,
            owner_id,
            lease_expires_at
        )
        VALUES (
            $1,
            $2::uuid,
            CURRENT_TIMESTAMP + ($3 * INTERVAL '1 millisecond')
        )
        ON CONFLICT (cache_key) DO UPDATE SET
            owner_id = EXCLUDED.owner_id,
            lease_expires_at = EXCLUDED.lease_expires_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE report_sync_state.lease_expires_at <= CURRENT_TIMESTAMP
        RETURNING lease_expires_at
    `, [cacheKey, ownerId, leaseDurationMilliseconds]);

    if (result.rows.length === 0) {
        return false;
    }

    if (!isValidDate(result.rows[0].lease_expires_at)) {
        throw new Error('Report sync lease is invalid.');
    }

    return true;
}

export async function renewReportSyncLease(
    cacheKey: string,
    ownerId: string,
    leaseDurationMilliseconds: number
): Promise<boolean> {
    const result = await queryDatabase<SyncLeaseRow>(`
        UPDATE report_sync_state
        SET
            lease_expires_at = CURRENT_TIMESTAMP + ($3 * INTERVAL '1 millisecond'),
            updated_at = CURRENT_TIMESTAMP
        WHERE cache_key = $1
            AND owner_id = $2::uuid
            AND lease_expires_at > CURRENT_TIMESTAMP
        RETURNING lease_expires_at
    `, [cacheKey, ownerId, leaseDurationMilliseconds]);

    if (result.rows.length === 0) {
        return false;
    }

    if (!isValidDate(result.rows[0].lease_expires_at)) {
        throw new Error('Report sync lease is invalid.');
    }

    return true;
}

export async function releaseReportSyncLease(
    cacheKey: string,
    ownerId: string
): Promise<void> {
    await queryDatabase(`
        DELETE FROM report_sync_state
        WHERE cache_key = $1
            AND owner_id = $2::uuid
    `, [cacheKey, ownerId]);
}
