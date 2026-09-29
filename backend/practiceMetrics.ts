import {
    isChampionKillTimelineEvent,
    type MatchData,
    type MatchParticipant,
    type MatchTimeline,
} from './riotSchemas';

export const practiceMetricVersion = 1;
export const practiceQueueId = 420;
export const practiceRole = 'BOTTOM';
export const tenMinuteTimestampMilliseconds = 10 * 60 * 1000;

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

export const practiceMetricDefinitions: readonly PracticeMetricDefinition[] = [
    {
        key: 'csAt10',
        unit: 'cs',
        aggregation: 'median',
    },
    {
        key: 'deathsAtOrBefore10',
        unit: 'deaths',
        aggregation: 'mean',
    },
    {
        key: 'totalGoldAt10',
        unit: 'gold',
        aggregation: 'median',
    },
];

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

export type EligiblePracticeMatch = {
    status: 'eligible';
    match: {
        matchId: string;
        gameStartTimestamp: number;
        queueId: number;
        role: string;
        championName: string;
        patch: string;
    };
    participantId: number;
    puuid: string;
};

export type ExcludedPracticeMatch = {
    status: 'excluded';
    match: PracticeMatchReference;
    reasons: PracticeMatchExclusionReason[];
};

export type PracticeMatchEligibility = EligiblePracticeMatch | ExcludedPracticeMatch;

export type PracticeMetricObservation = {
    value: number;
    unit: PracticeMetricUnit;
    observedAtMilliseconds: number;
};

export type PracticeMatchEvidence = EligiblePracticeMatch['match'] & {
    metrics: {
        csAt10: PracticeMetricObservation;
        deathsAtOrBefore10: PracticeMetricObservation;
        totalGoldAt10: PracticeMetricObservation;
    };
};

export type PracticeMatchCalculation =
    | {
        status: 'evidence';
        evidence: PracticeMatchEvidence;
    }
    | ExcludedPracticeMatch;

const isSafePositiveInteger = (value: number): boolean => (
    Number.isSafeInteger(value) && value > 0
);

const isSafeNonNegativeInteger = (value: number): boolean => (
    Number.isSafeInteger(value) && value >= 0
);

const getPatch = (gameVersion: string): string | null => {
    const versionMatch = /^(\d+)\.(\d+)(?:\.|$)/.exec(gameVersion.trim());

    if (!versionMatch) {
        return null;
    }

    const majorVersion = Number(versionMatch[1]);
    const minorVersion = Number(versionMatch[2]);

    if (!isSafeNonNegativeInteger(majorVersion) || !isSafeNonNegativeInteger(minorVersion)) {
        return null;
    }

    return `${majorVersion}.${minorVersion}`;
};

const getPlayerParticipants = (
    matchData: MatchData,
    puuid: string
): MatchParticipant[] => (
    matchData.info.participants.filter(participant => participant.puuid === puuid)
);

const getPracticeMatchReference = (
    matchData: MatchData,
    player: MatchParticipant | null,
    patch: string | null
): PracticeMatchReference => ({
    matchId: matchData.metadata.matchId,
    gameStartTimestamp: isSafePositiveInteger(matchData.info.gameStartTimestamp)
        ? matchData.info.gameStartTimestamp
        : null,
    queueId: isSafeNonNegativeInteger(matchData.info.queueId)
        ? matchData.info.queueId
        : null,
    role: player && player.teamPosition.trim() ? player.teamPosition : null,
    championName: player && player.championName.trim() ? player.championName : null,
    patch,
});

export function evaluatePracticeMatchEligibility(
    matchData: MatchData,
    puuid: string
): PracticeMatchEligibility {
    const normalizedPUUID = puuid.trim();

    if (!normalizedPUUID) {
        throw new Error('Player PUUID is required.');
    }

    const playerParticipants = getPlayerParticipants(matchData, normalizedPUUID);
    const player = playerParticipants.length === 1 ? playerParticipants[0] : null;
    const patch = getPatch(matchData.info.gameVersion);
    const reasons: PracticeMatchExclusionReason[] = [];

    if (!isSafeNonNegativeInteger(matchData.info.queueId)) {
        reasons.push('queue_invalid');
    } else if (matchData.info.queueId !== practiceQueueId) {
        reasons.push('not_ranked_solo');
    }

    if (!isSafePositiveInteger(matchData.info.gameStartTimestamp)) {
        reasons.push('game_time_invalid');
    }

    if (!Number.isFinite(matchData.info.gameDuration) || matchData.info.gameDuration < 0) {
        reasons.push('game_duration_invalid');
    } else if (matchData.info.gameDuration < tenMinuteTimestampMilliseconds / 1000) {
        reasons.push('short_game');
    }

    if (!patch) {
        reasons.push('patch_invalid');
    }

    if (playerParticipants.length === 0) {
        reasons.push('player_missing');
    } else if (playerParticipants.length > 1) {
        reasons.push('player_ambiguous');
    }

    if (player) {
        if (!isSafePositiveInteger(player.participantId)) {
            reasons.push('participant_id_invalid');
        }

        if (!player.teamPosition.trim()) {
            reasons.push('role_missing');
        } else if (player.teamPosition !== practiceRole) {
            reasons.push('not_bottom');
        }

        if (!player.championName.trim()) {
            reasons.push('champion_missing');
        }
    }

    if (
        reasons.length > 0
        || !player
        || !patch
        || !isSafePositiveInteger(matchData.info.gameStartTimestamp)
        || !isSafeNonNegativeInteger(matchData.info.queueId)
        || !isSafePositiveInteger(player.participantId)
    ) {
        return {
            status: 'excluded',
            match: getPracticeMatchReference(matchData, player, patch),
            reasons,
        };
    }

    return {
        status: 'eligible',
        match: {
            matchId: matchData.metadata.matchId,
            gameStartTimestamp: matchData.info.gameStartTimestamp,
            queueId: matchData.info.queueId,
            role: player.teamPosition,
            championName: player.championName,
            patch,
        },
        participantId: player.participantId,
        puuid: normalizedPUUID,
    };
}

export const excludePracticeMatch = (
    eligibleMatch: EligiblePracticeMatch,
    reason: PracticeMatchExclusionReason
): ExcludedPracticeMatch => ({
    status: 'excluded',
    match: eligibleMatch.match,
    reasons: [reason],
});

export function calculatePracticeMatchEvidence(
    eligibleMatch: EligiblePracticeMatch,
    timeline: MatchTimeline
): PracticeMatchCalculation {
    if (timeline.metadata.matchId !== eligibleMatch.match.matchId) {
        return excludePracticeMatch(eligibleMatch, 'timeline_match_mismatch');
    }

    const timelinePlayers = timeline.info.participants.filter(
        participant => participant.puuid === eligibleMatch.puuid
    );

    if (timelinePlayers.length === 0) {
        return excludePracticeMatch(eligibleMatch, 'timeline_player_missing');
    }

    if (timelinePlayers.length > 1) {
        return excludePracticeMatch(eligibleMatch, 'timeline_player_ambiguous');
    }

    const timelinePlayer = timelinePlayers[0];

    if (timelinePlayer.participantId !== eligibleMatch.participantId) {
        return excludePracticeMatch(eligibleMatch, 'timeline_participant_mismatch');
    }

    const tenMinuteFrames = timeline.info.frames.filter(
        frame => frame.timestamp === tenMinuteTimestampMilliseconds
    );

    if (tenMinuteFrames.length === 0) {
        return excludePracticeMatch(eligibleMatch, 'ten_minute_frame_missing');
    }

    if (tenMinuteFrames.length > 1) {
        return excludePracticeMatch(eligibleMatch, 'ten_minute_frame_ambiguous');
    }

    const tenMinuteFrame = tenMinuteFrames[0];
    const participantFrame = tenMinuteFrame.participantFrames[`${eligibleMatch.participantId}`];

    if (!participantFrame) {
        return excludePracticeMatch(eligibleMatch, 'participant_frame_missing');
    }

    if (participantFrame.participantId !== eligibleMatch.participantId) {
        return excludePracticeMatch(eligibleMatch, 'participant_frame_mismatch');
    }

    const csAt10 = participantFrame.minionsKilled + participantFrame.jungleMinionsKilled;
    const totalGoldAt10 = participantFrame.totalGold;
    let deathsAtOrBefore10 = 0;

    for (const frame of timeline.info.frames) {
        for (const event of frame.events) {
            if (
                isChampionKillTimelineEvent(event)
                && event.timestamp <= tenMinuteTimestampMilliseconds
                && event.victimId === eligibleMatch.participantId
            ) {
                deathsAtOrBefore10 += 1;
            }
        }
    }

    if (
        !isSafeNonNegativeInteger(csAt10)
        || !isSafeNonNegativeInteger(totalGoldAt10)
        || !isSafeNonNegativeInteger(deathsAtOrBefore10)
    ) {
        return excludePracticeMatch(eligibleMatch, 'metric_value_invalid');
    }

    return {
        status: 'evidence',
        evidence: {
            ...eligibleMatch.match,
            metrics: {
                csAt10: {
                    value: csAt10,
                    unit: 'cs',
                    observedAtMilliseconds: tenMinuteTimestampMilliseconds,
                },
                deathsAtOrBefore10: {
                    value: deathsAtOrBefore10,
                    unit: 'deaths',
                    observedAtMilliseconds: tenMinuteTimestampMilliseconds,
                },
                totalGoldAt10: {
                    value: totalGoldAt10,
                    unit: 'gold',
                    observedAtMilliseconds: tenMinuteTimestampMilliseconds,
                },
            },
        },
    };
}
