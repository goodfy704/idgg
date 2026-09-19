import { randomUUID } from 'node:crypto';

import {
    acquireReportSyncLease,
    getCachedMatchTimeline,
    getCachedReport,
    getReportCacheKey,
    releaseReportSyncLease,
    renewReportSyncLease,
    saveCachedReport,
    saveMatchTimeline,
} from './reportRepository';
import type { MatchTimeline, PlayerReport } from './riotSchemas';

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

export type MatchTimelineResult = {
    timeline: MatchTimeline;
    source: 'cache' | 'sync';
    fetchedAt: Date;
};

type SynchronizePlayerReport = () => Promise<PlayerReportSync | null>;
type SynchronizeMatchTimeline = () => Promise<MatchTimeline | null>;

const reportFreshnessMilliseconds = 5 * 60 * 1000;
const syncLeaseDurationMilliseconds = 60 * 1000;
const syncLeaseRenewalMilliseconds = 20 * 1000;
const syncLeaseRetryMilliseconds = 500;
const activePlayerSyncs = new Map<string, Promise<PlayerReportResult | null>>();
const activeMatchTimelineSyncs = new Map<string, Promise<MatchTimelineResult | null>>();

const delay = async (milliseconds: number): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, milliseconds));
};

const getFreshCachedReport = async (
    gameName: string,
    tagLine: string
): Promise<PlayerReportResult | null> => {
    const cachedReport = await getCachedReport(gameName, tagLine);

    if (
        !cachedReport
        || Date.now() - cachedReport.fetchedAt.getTime() > reportFreshnessMilliseconds
    ) {
        return null;
    }

    return {
        report: cachedReport.report,
        source: 'cache',
        fetchedAt: cachedReport.fetchedAt,
    };
};

const synchronizeWithLease = async (
    cacheKey: string,
    ownerId: string,
    gameName: string,
    tagLine: string,
    synchronize: SynchronizePlayerReport
): Promise<PlayerReportResult | null> => {
    let leaseError: Error | null = null;
    let activeRenewal: Promise<void> | null = null;

    const renewLease = () => {
        if (activeRenewal || leaseError) {
            return;
        }

        activeRenewal = (async () => {
            try {
                const renewed = await renewReportSyncLease(
                    cacheKey,
                    ownerId,
                    syncLeaseDurationMilliseconds
                );

                if (!renewed) {
                    leaseError = new Error('Report sync lease was lost.');
                }
            } catch (error: unknown) {
                leaseError = error instanceof Error
                    ? error
                    : new Error('Report sync lease renewal failed.');
            } finally {
                activeRenewal = null;
            }
        })();
    };

    const renewalTimer = setInterval(renewLease, syncLeaseRenewalMilliseconds);

    try {
        const synchronizedReport = await synchronize();

        if (!synchronizedReport) {
            return null;
        }

        if (activeRenewal) {
            await activeRenewal;
        }

        if (leaseError) {
            throw leaseError;
        }

        const renewed = await renewReportSyncLease(
            cacheKey,
            ownerId,
            syncLeaseDurationMilliseconds
        );

        if (!renewed) {
            throw new Error('Report sync lease was lost.');
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
    } finally {
        clearInterval(renewalTimer);

        if (activeRenewal) {
            await activeRenewal;
        }
    }
};

const resolvePlayerReport = async (
    gameName: string,
    tagLine: string,
    synchronize: SynchronizePlayerReport
): Promise<PlayerReportResult | null> => {
    const cacheKey = getReportCacheKey(gameName, tagLine);
    const ownerId = randomUUID();

    while (true) {
        const cachedReport = await getFreshCachedReport(gameName, tagLine);

        if (cachedReport) {
            return cachedReport;
        }

        const acquired = await acquireReportSyncLease(
            cacheKey,
            ownerId,
            syncLeaseDurationMilliseconds
        );

        if (!acquired) {
            await delay(syncLeaseRetryMilliseconds);
            continue;
        }

        try {
            const refreshedReport = await getFreshCachedReport(gameName, tagLine);

            if (refreshedReport) {
                return refreshedReport;
            }

            return await synchronizeWithLease(
                cacheKey,
                ownerId,
                gameName,
                tagLine,
                synchronize
            );
        } finally {
            await releaseReportSyncLease(cacheKey, ownerId);
        }
    }
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

const resolveMatchTimeline = async (
    matchId: string,
    regionalRoute: string,
    synchronize: SynchronizeMatchTimeline
): Promise<MatchTimelineResult | null> => {
    const cachedTimeline = await getCachedMatchTimeline(matchId, regionalRoute);

    if (cachedTimeline) {
        return {
            timeline: cachedTimeline.timeline,
            source: 'cache',
            fetchedAt: cachedTimeline.fetchedAt,
        };
    }

    const synchronizedTimeline = await synchronize();

    if (!synchronizedTimeline) {
        return null;
    }

    const storedTimeline = await saveMatchTimeline({
        matchId,
        regionalRoute,
        timeline: synchronizedTimeline,
    });

    return {
        timeline: storedTimeline.timeline,
        source: 'sync',
        fetchedAt: storedTimeline.fetchedAt,
    };
};

export async function getOrSyncMatchTimeline(
    matchId: string,
    regionalRoute: string,
    synchronize: SynchronizeMatchTimeline
): Promise<MatchTimelineResult | null> {
    const syncKey = `${regionalRoute.trim().toLocaleLowerCase('en-US')}:${matchId.trim()}`;
    const activeSync = activeMatchTimelineSyncs.get(syncKey);

    if (activeSync) {
        return activeSync;
    }

    const sync = resolveMatchTimeline(matchId, regionalRoute, synchronize);
    activeMatchTimelineSyncs.set(syncKey, sync);

    try {
        return await sync;
    } finally {
        if (activeMatchTimelineSyncs.get(syncKey) === sync) {
            activeMatchTimelineSyncs.delete(syncKey);
        }
    }
}
