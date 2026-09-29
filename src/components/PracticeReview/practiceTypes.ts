export type SupportedPracticePlatform = 'eun1' | 'euw1';

export type PracticeMetricKey =
    | 'csAt10'
    | 'deathsAtOrBefore10'
    | 'totalGoldAt10';

export type PracticeMetricUnit = 'cs' | 'deaths' | 'gold';
export type PracticeMetricAggregation = 'median' | 'mean';

export type PracticeMetricDefinition = {
    key: PracticeMetricKey;
    unit: PracticeMetricUnit;
    aggregation: PracticeMetricAggregation;
};

export type PracticeMatchExclusionReason =
    | 'queue_invalid'
    | 'not_ranked_solo'
    | 'game_time_invalid'
    | 'game_duration_invalid'
    | 'short_game'
    | 'patch_invalid'
    | 'player_missing'
    | 'player_ambiguous'
    | 'participant_id_invalid'
    | 'role_missing'
    | 'not_bottom'
    | 'champion_missing'
    | 'timeline_match_mismatch'
    | 'timeline_player_missing'
    | 'timeline_player_ambiguous'
    | 'timeline_participant_mismatch'
    | 'ten_minute_frame_missing'
    | 'ten_minute_frame_ambiguous'
    | 'participant_frame_missing'
    | 'participant_frame_mismatch'
    | 'timeline_unavailable'
    | 'metric_value_invalid';

export type PracticeMatchReference = {
    matchId: string;
    gameStartTimestamp: number | null;
    queueId: number | null;
    role: string | null;
    championName: string | null;
    patch: string | null;
};

export type PracticeMetricObservation = {
    value: number;
    unit: PracticeMetricUnit;
    observedAtMilliseconds: number;
};

export type PracticeMatchEvidence = {
    matchId: string;
    gameStartTimestamp: number;
    queueId: number;
    role: string;
    championName: string;
    patch: string;
    metrics: {
        csAt10: PracticeMetricObservation;
        deathsAtOrBefore10: PracticeMetricObservation;
        totalGoldAt10: PracticeMetricObservation;
    };
};

export type PracticeEvidenceMatch = {
    status: 'evidence';
    evidence: PracticeMatchEvidence;
};

export type PracticeExcludedMatch = {
    status: 'excluded';
    match: PracticeMatchReference;
    reasons: PracticeMatchExclusionReason[];
};

export type PracticeMatchCalculation = PracticeEvidenceMatch | PracticeExcludedMatch;

export type PracticeBaselineMatch = {
    matchId: string;
    gameStartTimestamp: number;
    queueId: number;
    role: string;
    championName: string;
    patch: string;
    metricValue: number;
    observedAtMilliseconds: number;
};

export type SavedPracticeFocus = {
    storageVersion: number;
    metricVersion: number;
    ownerPUUID: string;
    metricKey: PracticeMetricKey;
    savedAt: string;
    baselineMatches: PracticeBaselineMatch[];
};

export type PracticeComparisonSample = {
    matches: PracticeBaselineMatch[];
    aggregate: number | null;
};

export type PracticeComparisonSeparationReason =
    | 'not_in_baseline_before_focus'
    | 'game_time_unavailable'
    | 'baseline_identity_mismatch';

export type PracticeComparisonSeparationExclusion = {
    match: PracticeMatchReference;
    reason: PracticeComparisonSeparationReason;
};

export type PracticeComparison = {
    metricKey: PracticeMetricKey;
    aggregation: PracticeMetricAggregation;
    savedAt: string;
    baseline: PracticeComparisonSample;
    followUp: PracticeComparisonSample;
    difference: number | null;
    currentBaselineMatchCount: number;
    excludedFollowUpMatches: PracticeExcludedMatch[];
    separationExclusions: PracticeComparisonSeparationExclusion[];
};

export type PracticeReport = {
    status: 'ready' | 'unsupported_platform';
    version: number;
    generatedAt: string;
    platform: string;
    supportedPlatforms: SupportedPracticePlatform[];
    queueId: number;
    role: string;
    metrics: PracticeMetricDefinition[];
    matches: PracticeMatchCalculation[];
    consideredMatchCount: number;
    eligibleMatchCount: number;
    excludedMatchCount: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isSafeNonNegativeInteger = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
);

const isSafePositiveInteger = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const isIsoTimestamp = (value: unknown): value is string => {
    if (typeof value !== 'string') {
        return false;
    }

    const timestamp = new Date(value);
    return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
};

const isGameTimestamp = (value: unknown): value is number => (
    isSafePositiveInteger(value) && !Number.isNaN(new Date(value).getTime())
);

const isNullableString = (value: unknown): value is string | null => (
    value === null || (typeof value === 'string' && value.trim().length > 0)
);

const isNullableGameTimestamp = (value: unknown): value is number | null => (
    value === null || isGameTimestamp(value)
);

const isNullableQueueId = (value: unknown): value is number | null => (
    value === null || isSafeNonNegativeInteger(value)
);

const isSupportedPracticePlatform = (value: unknown): value is SupportedPracticePlatform => (
    value === 'eun1' || value === 'euw1'
);

export const isPracticeMetricKey = (value: unknown): value is PracticeMetricKey => (
    value === 'csAt10'
    || value === 'deathsAtOrBefore10'
    || value === 'totalGoldAt10'
);

const isPracticeMetricDefinition = (value: unknown): value is PracticeMetricDefinition => {
    if (!isRecord(value)) {
        return false;
    }

    if (value.key === 'csAt10') {
        return value.unit === 'cs' && value.aggregation === 'median';
    }

    if (value.key === 'deathsAtOrBefore10') {
        return value.unit === 'deaths' && value.aggregation === 'mean';
    }

    if (value.key === 'totalGoldAt10') {
        return value.unit === 'gold' && value.aggregation === 'median';
    }

    return false;
};

const isPracticeMatchExclusionReason = (
    value: unknown
): value is PracticeMatchExclusionReason => (
    value === 'queue_invalid'
    || value === 'not_ranked_solo'
    || value === 'game_time_invalid'
    || value === 'game_duration_invalid'
    || value === 'short_game'
    || value === 'patch_invalid'
    || value === 'player_missing'
    || value === 'player_ambiguous'
    || value === 'participant_id_invalid'
    || value === 'role_missing'
    || value === 'not_bottom'
    || value === 'champion_missing'
    || value === 'timeline_match_mismatch'
    || value === 'timeline_player_missing'
    || value === 'timeline_player_ambiguous'
    || value === 'timeline_participant_mismatch'
    || value === 'ten_minute_frame_missing'
    || value === 'ten_minute_frame_ambiguous'
    || value === 'participant_frame_missing'
    || value === 'participant_frame_mismatch'
    || value === 'timeline_unavailable'
    || value === 'metric_value_invalid'
);

const isPracticeMatchReference = (value: unknown): value is PracticeMatchReference => (
    isRecord(value)
    && typeof value.matchId === 'string'
    && value.matchId.trim().length > 0
    && isNullableGameTimestamp(value.gameStartTimestamp)
    && isNullableQueueId(value.queueId)
    && isNullableString(value.role)
    && isNullableString(value.championName)
    && isNullableString(value.patch)
);

const isPracticeMetricObservation = (
    value: unknown,
    unit: PracticeMetricUnit
): value is PracticeMetricObservation => (
    isRecord(value)
    && isSafeNonNegativeInteger(value.value)
    && value.unit === unit
    && value.observedAtMilliseconds === 600000
);

const isPracticeMatchEvidence = (value: unknown): value is PracticeMatchEvidence => {
    if (!isRecord(value) || !isRecord(value.metrics)) {
        return false;
    }

    return typeof value.matchId === 'string'
        && value.matchId.trim().length > 0
        && isGameTimestamp(value.gameStartTimestamp)
        && value.queueId === 420
        && value.role === 'BOTTOM'
        && typeof value.championName === 'string'
        && value.championName.trim().length > 0
        && typeof value.patch === 'string'
        && /^\d+\.\d+$/.test(value.patch)
        && isPracticeMetricObservation(value.metrics.csAt10, 'cs')
        && isPracticeMetricObservation(value.metrics.deathsAtOrBefore10, 'deaths')
        && isPracticeMetricObservation(value.metrics.totalGoldAt10, 'gold');
};

const isPracticeMatchCalculation = (value: unknown): value is PracticeMatchCalculation => {
    if (!isRecord(value)) {
        return false;
    }

    if (value.status === 'evidence') {
        return isPracticeMatchEvidence(value.evidence);
    }

    if (value.status === 'excluded') {
        return isPracticeMatchReference(value.match)
            && Array.isArray(value.reasons)
            && value.reasons.length > 0
            && value.reasons.every(isPracticeMatchExclusionReason);
    }

    return false;
};

export const isPracticeReport = (value: unknown): value is PracticeReport => {
    if (
        !isRecord(value)
        || (value.status !== 'ready' && value.status !== 'unsupported_platform')
        || value.version !== 1
        || !isIsoTimestamp(value.generatedAt)
        || typeof value.platform !== 'string'
        || value.platform.trim().length === 0
        || value.queueId !== 420
        || value.role !== 'BOTTOM'
        || !Array.isArray(value.supportedPlatforms)
        || value.supportedPlatforms.length !== 2
        || !value.supportedPlatforms.every(isSupportedPracticePlatform)
        || !value.supportedPlatforms.includes('eun1')
        || !value.supportedPlatforms.includes('euw1')
        || !Array.isArray(value.metrics)
        || value.metrics.length !== 3
        || !value.metrics.every(isPracticeMetricDefinition)
        || !Array.isArray(value.matches)
        || !value.matches.every(isPracticeMatchCalculation)
        || !isSafeNonNegativeInteger(value.consideredMatchCount)
        || !isSafeNonNegativeInteger(value.eligibleMatchCount)
        || !isSafeNonNegativeInteger(value.excludedMatchCount)
    ) {
        return false;
    }

    const metricKeys = value.metrics.map(metric => metric.key);
    const matchIds = value.matches.map(match => (
        match.status === 'evidence' ? match.evidence.matchId : match.match.matchId
    ));
    const eligibleMatchCount = value.matches.filter(match => match.status === 'evidence').length;
    const excludedMatchCount = value.matches.length - eligibleMatchCount;

    if (
        new Set(metricKeys).size !== value.metrics.length
        || new Set(matchIds).size !== matchIds.length
        || value.consideredMatchCount !== value.matches.length
        || value.eligibleMatchCount !== eligibleMatchCount
        || value.excludedMatchCount !== excludedMatchCount
    ) {
        return false;
    }

    if (value.status === 'unsupported_platform') {
        return value.matches.length === 0
            && value.consideredMatchCount === 0
            && value.eligibleMatchCount === 0
            && value.excludedMatchCount === 0;
    }

    return isSupportedPracticePlatform(value.platform);
};
