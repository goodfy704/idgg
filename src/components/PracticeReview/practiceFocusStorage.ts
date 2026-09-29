import {
    isPracticeMetricKey,
    type PracticeBaselineMatch,
    type PracticeMatchEvidence,
    type PracticeMetricKey,
    type SavedPracticeFocus,
} from './practiceTypes';

type LoadPracticeFocusResult =
    | {
        status: 'empty';
    }
    | {
        status: 'loaded';
        focus: SavedPracticeFocus;
    }
    | {
        status: 'invalid';
    }
    | {
        status: 'unavailable';
    };

type SavePracticeFocusInput = {
    ownerPUUID: string;
    metricVersion: number;
    metricKey: PracticeMetricKey;
    evidence: PracticeMatchEvidence[];
};

type SavePracticeFocusResult =
    | {
        status: 'saved';
        focus: SavedPracticeFocus;
    }
    | {
        status: 'invalid_input';
    }
    | {
        status: 'unavailable';
    };

const storageVersion = 1;
const storageKeyPrefix = 'idgg:practice-focus:v1:';
const tenMinuteTimestampMilliseconds = 600000;

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

const isPracticeBaselineMatch = (value: unknown): value is PracticeBaselineMatch => (
    isRecord(value)
    && typeof value.matchId === 'string'
    && value.matchId.trim().length > 0
    && isGameTimestamp(value.gameStartTimestamp)
    && value.queueId === 420
    && value.role === 'BOTTOM'
    && typeof value.championName === 'string'
    && value.championName.trim().length > 0
    && typeof value.patch === 'string'
    && /^\d+\.\d+$/.test(value.patch)
    && isSafeNonNegativeInteger(value.metricValue)
    && value.observedAtMilliseconds === tenMinuteTimestampMilliseconds
);

const isSavedPracticeFocus = (
    value: unknown,
    ownerPUUID: string
): value is SavedPracticeFocus => {
    if (
        !isRecord(value)
        || value.storageVersion !== storageVersion
        || value.metricVersion !== 1
        || value.ownerPUUID !== ownerPUUID
        || !isPracticeMetricKey(value.metricKey)
        || !isIsoTimestamp(value.savedAt)
        || !Array.isArray(value.baselineMatches)
        || value.baselineMatches.length === 0
        || !value.baselineMatches.every(isPracticeBaselineMatch)
    ) {
        return false;
    }

    const savedAtTimestamp = new Date(value.savedAt).getTime();
    const matchIds = value.baselineMatches.map(match => match.matchId);

    return new Set(matchIds).size === matchIds.length
        && value.baselineMatches.every(
            match => match.gameStartTimestamp <= savedAtTimestamp
        );
};

const getStorageKey = (ownerPUUID: string): string => (
    `${storageKeyPrefix}${encodeURIComponent(ownerPUUID)}`
);

const getBaselineMatches = (
    evidence: PracticeMatchEvidence[],
    metricKey: PracticeMetricKey
): PracticeBaselineMatch[] => evidence.map(match => ({
    matchId: match.matchId,
    gameStartTimestamp: match.gameStartTimestamp,
    queueId: match.queueId,
    role: match.role,
    championName: match.championName,
    patch: match.patch,
    metricValue: match.metrics[metricKey].value,
    observedAtMilliseconds: match.metrics[metricKey].observedAtMilliseconds,
}));

export function loadPracticeFocus(ownerPUUID: string): LoadPracticeFocusResult {
    const normalizedPUUID = ownerPUUID.trim();

    if (!normalizedPUUID) {
        return { status: 'invalid' };
    }

    try {
        const storedValue = window.localStorage.getItem(getStorageKey(normalizedPUUID));

        if (storedValue === null) {
            return { status: 'empty' };
        }

        const parsedValue: unknown = JSON.parse(storedValue);

        if (!isSavedPracticeFocus(parsedValue, normalizedPUUID)) {
            return { status: 'invalid' };
        }

        return {
            status: 'loaded',
            focus: parsedValue,
        };
    } catch {
        return { status: 'unavailable' };
    }
}

export function savePracticeFocus(
    input: SavePracticeFocusInput
): SavePracticeFocusResult {
    const normalizedPUUID = input.ownerPUUID.trim();

    if (
        !normalizedPUUID
        || input.metricVersion !== 1
        || input.evidence.length === 0
    ) {
        return { status: 'invalid_input' };
    }

    const savedAt = new Date().toISOString();
    const baselineMatches = getBaselineMatches(input.evidence, input.metricKey);
    const focus: SavedPracticeFocus = {
        storageVersion,
        metricVersion: input.metricVersion,
        ownerPUUID: normalizedPUUID,
        metricKey: input.metricKey,
        savedAt,
        baselineMatches,
    };

    if (!isSavedPracticeFocus(focus, normalizedPUUID)) {
        return { status: 'invalid_input' };
    }

    try {
        window.localStorage.setItem(getStorageKey(normalizedPUUID), JSON.stringify(focus));
        return {
            status: 'saved',
            focus,
        };
    } catch {
        return { status: 'unavailable' };
    }
}
