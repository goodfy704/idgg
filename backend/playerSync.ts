import {
    getCachedReport,
    getReportCacheKey,
    saveCachedReport,
} from './reportRepository';
import type { PlayerReport } from './riotSchemas';

export type PlayerReportSync = {
    platform: string;
    regionalRoute: string;
    report: PlayerReport;
};

export type PlayerReportResult = {
    report: PlayerReport;
    source: 'cache' | 'sync';
    fetchedAt: Date;
};

type SynchronizePlayerReport = () => Promise<PlayerReportSync | null>;

const reportFreshnessMilliseconds = 5 * 60 * 1000;
const activePlayerSyncs = new Map<string, Promise<PlayerReportResult | null>>();

const resolvePlayerReport = async (
    gameName: string,
    tagLine: string,
    synchronize: SynchronizePlayerReport
): Promise<PlayerReportResult | null> => {
    const cachedReport = await getCachedReport(gameName, tagLine);

    if (
        cachedReport
        && Date.now() - cachedReport.fetchedAt.getTime() <= reportFreshnessMilliseconds
    ) {
        return {
            report: cachedReport.report,
            source: 'cache',
            fetchedAt: cachedReport.fetchedAt,
        };
    }

    const synchronizedReport = await synchronize();

    if (!synchronizedReport) {
        return null;
    }

    const storedReport = await saveCachedReport({
        gameName,
        tagLine,
        platform: synchronizedReport.platform,
        regionalRoute: synchronizedReport.regionalRoute,
        report: synchronizedReport.report,
    });

    return {
        report: storedReport.report,
        source: 'sync',
        fetchedAt: storedReport.fetchedAt,
    };
};

export async function getOrSyncPlayerReport(
    gameName: string,
    tagLine: string,
    synchronize: SynchronizePlayerReport
): Promise<PlayerReportResult | null> {
    const cacheKey = getReportCacheKey(gameName, tagLine);
    const activeSync = activePlayerSyncs.get(cacheKey);

    if (activeSync) {
        return activeSync;
    }

    const sync = resolvePlayerReport(gameName, tagLine, synchronize);
    activePlayerSyncs.set(cacheKey, sync);

    try {
        return await sync;
    } finally {
        if (activePlayerSyncs.get(cacheKey) === sync) {
            activePlayerSyncs.delete(cacheKey);
        }
    }
}
