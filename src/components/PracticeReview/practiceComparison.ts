import type {
    PracticeBaselineMatch,
    PracticeComparison,
    PracticeComparisonSeparationExclusion,
    PracticeMatchCalculation,
    PracticeMatchEvidence,
    PracticeMatchReference,
    PracticeMetricAggregation,
    PracticeMetricKey,
    SavedPracticeFocus,
} from './practiceTypes';

const getMatchReference = (match: PracticeMatchCalculation): PracticeMatchReference => {
    if (match.status === 'excluded') {
        return match.match;
    }

    return {
        matchId: match.evidence.matchId,
        gameStartTimestamp: match.evidence.gameStartTimestamp,
        queueId: match.evidence.queueId,
        role: match.evidence.role,
        championName: match.evidence.championName,
        patch: match.evidence.patch,
    };
};

const getComparisonMatch = (
    evidence: PracticeMatchEvidence,
    metricKey: PracticeMetricKey
): PracticeBaselineMatch => ({
    matchId: evidence.matchId,
    gameStartTimestamp: evidence.gameStartTimestamp,
    queueId: evidence.queueId,
    role: evidence.role,
    championName: evidence.championName,
    patch: evidence.patch,
    metricValue: evidence.metrics[metricKey].value,
    observedAtMilliseconds: evidence.metrics[metricKey].observedAtMilliseconds,
});

const sortMatchesByGameTime = (
    matches: PracticeBaselineMatch[]
): PracticeBaselineMatch[] => (
    [...matches].sort(
        (left, right) => right.gameStartTimestamp - left.gameStartTimestamp
    )
);

export const calculatePracticeAggregate = (
    values: number[],
    aggregation: PracticeMetricAggregation
): number | null => {
    if (values.length === 0) {
        return null;
    }

    if (aggregation === 'mean') {
        return values.reduce((total, value) => total + value, 0) / values.length;
    }

    const sortedValues = [...values].sort((left, right) => left - right);
    const middleIndex = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 1) {
        return sortedValues[middleIndex];
    }

    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
};

export function buildPracticeComparison(
    savedFocus: SavedPracticeFocus,
    currentMatches: PracticeMatchCalculation[],
    aggregation: PracticeMetricAggregation
): PracticeComparison {
    const savedAtTimestamp = new Date(savedFocus.savedAt).getTime();
    const baselineMatchesById = new Map(
        savedFocus.baselineMatches.map(match => [match.matchId, match])
    );
    const followUpMatches: PracticeBaselineMatch[] = [];
    const excludedFollowUpMatches: PracticeComparison['excludedFollowUpMatches'] = [];
    const separationExclusions: PracticeComparisonSeparationExclusion[] = [];
    let currentBaselineMatchCount = 0;

    for (const match of currentMatches) {
        const reference = getMatchReference(match);
        const baselineMatch = baselineMatchesById.get(reference.matchId);

        if (baselineMatch) {
            if (reference.gameStartTimestamp !== baselineMatch.gameStartTimestamp) {
                separationExclusions.push({
                    match: reference,
                    reason: 'baseline_identity_mismatch',
                });
            } else {
                currentBaselineMatchCount += 1;
            }

            continue;
        }

        if (reference.gameStartTimestamp === null) {
            separationExclusions.push({
                match: reference,
                reason: 'game_time_unavailable',
            });
            continue;
        }

        if (reference.gameStartTimestamp <= savedAtTimestamp) {
            separationExclusions.push({
                match: reference,
                reason: 'not_in_baseline_before_focus',
            });
            continue;
        }

        if (match.status === 'excluded') {
            excludedFollowUpMatches.push(match);
            continue;
        }

        followUpMatches.push(getComparisonMatch(match.evidence, savedFocus.metricKey));
    }

    const baselineMatches = sortMatchesByGameTime(savedFocus.baselineMatches);
    const sortedFollowUpMatches = sortMatchesByGameTime(followUpMatches);
    const baselineAggregate = calculatePracticeAggregate(
        baselineMatches.map(match => match.metricValue),
        aggregation
    );
    const followUpAggregate = calculatePracticeAggregate(
        sortedFollowUpMatches.map(match => match.metricValue),
        aggregation
    );

    return {
        metricKey: savedFocus.metricKey,
        aggregation,
        savedAt: savedFocus.savedAt,
        baseline: {
            matches: baselineMatches,
            aggregate: baselineAggregate,
        },
        followUp: {
            matches: sortedFollowUpMatches,
            aggregate: followUpAggregate,
        },
        difference: baselineAggregate === null || followUpAggregate === null
            ? null
            : followUpAggregate - baselineAggregate,
        currentBaselineMatchCount,
        excludedFollowUpMatches,
        separationExclusions,
    };
}
