import { useEffect, useState } from 'react';

import {
    buildPracticeComparison,
    calculatePracticeAggregate,
} from './practiceComparison';
import { loadPracticeFocus, savePracticeFocus } from './practiceFocusStorage';
import type {
    PracticeBaselineMatch,
    PracticeEvidenceMatch,
    PracticeExcludedMatch,
    PracticeComparisonSeparationReason,
    PracticeMatchCalculation,
    PracticeMatchExclusionReason,
    PracticeMetricAggregation,
    PracticeMetricKey,
    PracticeReport,
    SavedPracticeFocus,
} from './practiceTypes';

type PracticeReviewProps = {
    practice: PracticeReport;
    playerPUUID: string;
};

type MetricPresentation = {
    title: string;
    shortLabel: string;
};

const metricPresentation: Record<PracticeMetricKey, MetricPresentation> = {
    csAt10: {
        title: 'CS at 10 minutes',
        shortLabel: 'CS',
    },
    deathsAtOrBefore10: {
        title: 'Deaths by 10 minutes',
        shortLabel: 'deaths',
    },
    totalGoldAt10: {
        title: 'Total gold at 10 minutes',
        shortLabel: 'gold',
    },
};

const exclusionMessages: Record<PracticeMatchExclusionReason, string> = {
    queue_invalid: 'Queue information was invalid.',
    not_ranked_solo: 'The match was not ranked solo.',
    game_time_invalid: 'The game date was unavailable.',
    game_duration_invalid: 'The game duration was invalid.',
    short_game: 'The match ended before 10 minutes.',
    patch_invalid: 'The game patch was unavailable.',
    player_missing: 'The player was missing from the match.',
    player_ambiguous: 'The player appeared more than once in the match.',
    participant_id_invalid: 'The player participant ID was invalid.',
    role_missing: 'The assigned role was unavailable.',
    not_bottom: 'The player was not assigned BOTTOM.',
    champion_missing: 'The champion was unavailable.',
    timeline_match_mismatch: 'The stored timeline belonged to another match.',
    timeline_player_missing: 'The player was missing from the timeline.',
    timeline_player_ambiguous: 'The player appeared more than once in the timeline.',
    timeline_participant_mismatch: 'The match and timeline participant IDs did not agree.',
    ten_minute_frame_missing: 'The timeline did not contain an exact 10-minute frame.',
    ten_minute_frame_ambiguous: 'The timeline contained multiple 10-minute frames.',
    participant_frame_missing: 'The player frame at 10 minutes was missing.',
    participant_frame_mismatch: 'The player frame at 10 minutes did not match.',
    timeline_unavailable: 'The match timeline was unavailable from Riot.',
    metric_value_invalid: 'One or more metric values were invalid.',
};

const separationMessages: Record<PracticeComparisonSeparationReason, string> = {
    not_in_baseline_before_focus: 'The match started before the focus was saved but was not part of its baseline.',
    game_time_unavailable: 'The match could not be placed before or after the focus because its game time was unavailable.',
    baseline_identity_mismatch: 'The match ID matched the baseline, but its game time did not.',
};

const metricNumberFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
});

const wholeNumberFormatter = new Intl.NumberFormat();

const gameDateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const isEvidenceMatch = (
    match: PracticeMatchCalculation
): match is PracticeEvidenceMatch => match.status === 'evidence';

const isExcludedMatch = (
    match: PracticeMatchCalculation
): match is PracticeExcludedMatch => match.status === 'excluded';

const getAggregateLabel = (aggregation: PracticeMetricAggregation): string => (
    aggregation === 'median' ? 'Median' : 'Average'
);

const getGameDate = (timestamp: number | null): string => (
    timestamp === null ? 'Date unavailable' : gameDateFormatter.format(new Date(timestamp))
);

const getQueueLabel = (queueId: number | null): string => {
    if (queueId === null) {
        return 'Queue unavailable';
    }

    return queueId === 420 ? 'Ranked solo (420)' : `Queue ${queueId}`;
};

const getSampleLabel = (sampleSize: number): string => (
    `${sampleSize} comparable ${sampleSize === 1 ? 'match' : 'matches'}`
);

const getDifferenceLabel = (difference: number | null): string => {
    if (difference === null) {
        return 'Waiting for a follow-up sample';
    }

    if (difference === 0) {
        return 'No difference from baseline';
    }

    const direction = difference > 0 ? 'higher' : 'lower';
    return `${metricNumberFormatter.format(Math.abs(difference))} ${direction} than baseline`;
};

type FocusEvidenceCardProps = {
    match: PracticeBaselineMatch;
    metricKey: PracticeMetricKey;
    sampleLabel: 'Baseline' | 'Follow-up';
};

function FocusEvidenceCard({ match, metricKey, sampleLabel }: FocusEvidenceCardProps) {
    return (
        <article className="min-w-0 rounded-lg border border-dark-silver bg-black-russian/60 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-widest text-gray-light">{sampleLabel}</p>
                    <h5 className="mt-1 text-lg">{match.championName}</h5>
                    <p className="text-sm text-gray-light">{getGameDate(match.gameStartTimestamp)}</p>
                </div>
                <p className="text-sm text-gray-light">Patch {match.patch}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-dark-silver px-3 py-1">
                    {getQueueLabel(match.queueId)}
                </span>
                <span className="rounded-full border border-dark-silver px-3 py-1">
                    Role {match.role}
                </span>
                <span className="rounded-full border border-dark-silver px-3 py-1">
                    Timeline {match.observedAtMilliseconds / 60000}:00
                </span>
            </div>
            <dl className="mt-4 rounded-lg bg-dark-plume/70 p-3">
                <dt className="text-sm text-gray-light">{metricPresentation[metricKey].title}</dt>
                <dd className="mt-1 text-2xl">{wholeNumberFormatter.format(match.metricValue)}</dd>
            </dl>
            <p className="mt-3 break-all text-xs text-gray-light">Match {match.matchId}</p>
        </article>
    );
}

function PracticeReview({ practice, playerPUUID }: PracticeReviewProps) {
    const evidenceMatches = practice.matches.filter(isEvidenceMatch);
    const excludedMatches = practice.matches.filter(isExcludedMatch);
    const [selectedMetricKey, setSelectedMetricKey] = useState<PracticeMetricKey | null>(null);
    const [savedFocus, setSavedFocus] = useState<SavedPracticeFocus | null>(null);
    const [focusLoadedForPUUID, setFocusLoadedForPUUID] = useState<string | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);

    useEffect(() => {
        setFocusLoadedForPUUID(null);
        setSaveConfirmation(null);

        const result = loadPracticeFocus(playerPUUID);

        if (result.status === 'loaded') {
            setSavedFocus(result.focus);
            setSelectedMetricKey(result.focus.metricKey);
            setStorageError(null);
        } else if (result.status === 'empty') {
            setSavedFocus(null);
            setSelectedMetricKey(null);
            setStorageError(null);
        } else if (result.status === 'invalid') {
            setSavedFocus(null);
            setSelectedMetricKey(null);
            setStorageError('The saved focus for this player is invalid. Saving a new focus will replace it.');
        } else {
            setSavedFocus(null);
            setSelectedMetricKey(null);
            setStorageError('Browser storage is unavailable. Your focus cannot be loaded or saved.');
        }

        setFocusLoadedForPUUID(playerPUUID);
    }, [playerPUUID]);

    const focusIsLoading = focusLoadedForPUUID !== playerPUUID;
    const selectedMetricDefinition = selectedMetricKey === null
        ? null
        : practice.metrics.find(metric => metric.key === selectedMetricKey) ?? null;
    const savedMetricDefinition = savedFocus === null
        ? null
        : practice.metrics.find(metric => metric.key === savedFocus.metricKey) ?? null;
    const comparison = savedFocus && savedMetricDefinition
        ? buildPracticeComparison(
            savedFocus,
            practice.matches,
            savedMetricDefinition.aggregation
        )
        : null;

    const handleSaveFocus = () => {
        if (!selectedMetricDefinition || evidenceMatches.length === 0 || focusIsLoading) {
            return;
        }

        const result = savePracticeFocus({
            ownerPUUID: playerPUUID,
            metricVersion: practice.version,
            metricKey: selectedMetricDefinition.key,
            evidence: evidenceMatches.map(match => match.evidence),
        });

        if (result.status === 'saved') {
            setSavedFocus(result.focus);
            setStorageError(null);
            setSaveConfirmation(
                `Focus and ${getSampleLabel(result.focus.baselineMatches.length)} saved in this browser.`
            );
            return;
        }

        setSaveConfirmation(null);
        setStorageError(
            result.status === 'unavailable'
                ? 'Browser storage is unavailable. Your focus could not be saved.'
                : 'The current focus or baseline data is invalid and was not saved.'
        );
    };

    if (practice.status === 'unsupported_platform') {
        return (
            <section className="rounded-xl border-2 border-dark-silver bg-black-russian/35 p-6 drop-shadow-plume">
                <h2 className="text-2xl">Practice review</h2>
                <p className="mt-2 text-gray-light">
                    Practice review currently supports EUW and EUNE accounts. This account resolved to {practice.platform.toUpperCase()}.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-xl border-2 border-dark-silver bg-black-russian/35 p-6 drop-shadow-plume hover:drop-shadow-goldish transition ease-in-out delay-150">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-widest text-gray-light">Ranked solo · BOTTOM</p>
                    <h2 className="text-2xl">Practice review</h2>
                    <p className="mt-2 max-w-3xl text-gray-light">
                        These values compare only this player&apos;s recent comparable matches. They describe the sample and do not explain wins or losses.
                    </p>
                </div>
                <div className="text-sm text-gray-light lg:text-right">
                    <p>{getSampleLabel(practice.eligibleMatchCount)}</p>
                    <p>{practice.excludedMatchCount} excluded of {practice.consideredMatchCount} considered</p>
                </div>
            </div>

            {focusIsLoading ? (
                <p className="mt-6 text-gray-light">Loading saved focus...</p>
            ) : savedFocus && savedMetricDefinition && comparison ? (
                <div className="mt-6 rounded-lg border border-purple bg-purple/10 p-5">
                    <p className="text-sm uppercase tracking-widest text-gray-light">Saved focus</p>
                    <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h3 className="text-xl">{metricPresentation[savedFocus.metricKey].title}</h3>
                            <p className="mt-2 text-gray-light">
                                Matches are compared only with this player&apos;s saved {getAggregateLabel(savedMetricDefinition.aggregation).toLowerCase()} baseline.
                            </p>
                        </div>
                        <p className="text-sm text-gray-light">
                            Saved {gameDateFormatter.format(new Date(savedFocus.savedAt))}
                        </p>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-black-russian/60 p-4">
                            <p className="text-sm text-gray-light">Baseline</p>
                            <p className="mt-1 text-3xl">
                                {comparison.baseline.aggregate === null
                                    ? 'Unavailable'
                                    : metricNumberFormatter.format(comparison.baseline.aggregate)}
                            </p>
                            <p className="mt-2 text-sm text-gray-light">
                                {getSampleLabel(comparison.baseline.matches.length)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-black-russian/60 p-4">
                            <p className="text-sm text-gray-light">Follow-up</p>
                            <p className="mt-1 text-3xl">
                                {comparison.followUp.aggregate === null
                                    ? 'Waiting'
                                    : metricNumberFormatter.format(comparison.followUp.aggregate)}
                            </p>
                            <p className="mt-2 text-sm text-gray-light">
                                {getSampleLabel(comparison.followUp.matches.length)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-black-russian/60 p-4">
                            <p className="text-sm text-gray-light">Observed difference</p>
                            <p className="mt-1 text-xl">{getDifferenceLabel(comparison.difference)}</p>
                            <p className="mt-2 text-sm text-gray-light">
                                This is a comparison, not an explanation of match results.
                            </p>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-light">
                        {comparison.currentBaselineMatchCount} saved baseline {comparison.currentBaselineMatchCount === 1 ? 'match is' : 'matches are'} still in the current report and not counted again. Only different match IDs with game starts after the saved time can enter follow-up.
                    </p>
                    {comparison.followUp.matches.length === 0 && (
                        <p className="mt-4 rounded-lg border border-dark-silver bg-dark-plume/45 p-4 text-gray-light">
                            No comparable post-focus matches yet. Return after playing a newer ranked-solo BOTTOM match.
                        </p>
                    )}
                    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <div>
                            <h4 className="text-lg">Baseline evidence</h4>
                            <p className="mt-1 text-sm text-gray-light">
                                Fixed when the focus was saved.
                            </p>
                            <div className="mt-3 space-y-3">
                                {comparison.baseline.matches.map(match => (
                                    <FocusEvidenceCard
                                        key={match.matchId}
                                        match={match}
                                        metricKey={comparison.metricKey}
                                        sampleLabel="Baseline"
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-lg">Follow-up evidence</h4>
                            <p className="mt-1 text-sm text-gray-light">
                                Comparable matches that started after the focus was saved.
                            </p>
                            {comparison.followUp.matches.length > 0 ? (
                                <div className="mt-3 space-y-3">
                                    {comparison.followUp.matches.map(match => (
                                        <FocusEvidenceCard
                                            key={match.matchId}
                                            match={match}
                                            metricKey={comparison.metricKey}
                                            sampleLabel="Follow-up"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-3 rounded-lg bg-black-russian/60 p-4 text-gray-light">
                                    Follow-up evidence will appear here when a comparable newer match is available.
                                </p>
                            )}
                        </div>
                    </div>
                    {(comparison.excludedFollowUpMatches.length > 0
                        || comparison.separationExclusions.length > 0) && (
                        <details className="mt-6 rounded-lg border border-dark-silver bg-dark-plume/45 p-4">
                            <summary className="cursor-pointer text-lg">
                                Comparison exclusions ({comparison.excludedFollowUpMatches.length + comparison.separationExclusions.length})
                            </summary>
                            <div className="mt-4 space-y-4">
                                {comparison.excludedFollowUpMatches.map(match => (
                                    <article key={match.match.matchId} className="rounded-lg bg-black-russian/60 p-4">
                                        <p>{match.match.championName ?? 'Champion unavailable'} / {getGameDate(match.match.gameStartTimestamp)}</p>
                                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-light">
                                            {match.reasons.map(reason => (
                                                <li key={reason}>{exclusionMessages[reason]}</li>
                                            ))}
                                        </ul>
                                        <p className="mt-2 break-all text-xs text-gray-light">Match {match.match.matchId}</p>
                                    </article>
                                ))}
                                {comparison.separationExclusions.map(exclusion => (
                                    <article key={exclusion.match.matchId} className="rounded-lg bg-black-russian/60 p-4">
                                        <p>{exclusion.match.championName ?? 'Champion unavailable'} / {getGameDate(exclusion.match.gameStartTimestamp)}</p>
                                        <p className="mt-2 text-sm text-gray-light">
                                            {separationMessages[exclusion.reason]}
                                        </p>
                                        <p className="mt-2 break-all text-xs text-gray-light">Match {exclusion.match.matchId}</p>
                                    </article>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            ) : null}

            {storageError && (
                <p role="alert" className="mt-4 rounded-lg border border-red bg-red/10 p-4 text-gray-light">
                    {storageError}
                </p>
            )}

            {saveConfirmation && (
                <p role="status" className="mt-4 rounded-lg border border-green bg-green/10 p-4 text-gray-light">
                    {saveConfirmation}
                </p>
            )}

            {evidenceMatches.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dark-silver bg-dark-plume/45 p-5">
                    <h3 className="text-lg">Not enough comparable data yet</h3>
                    <p className="mt-2 text-gray-light">
                        No recent ranked-solo BOTTOM match has complete, trustworthy 10-minute timeline data. Exclusion details are shown below when available.
                    </p>
                </div>
            ) : (
                <>
                    <fieldset className="mt-6">
                        <legend className="text-xl">Choose one practice focus</legend>
                        <p className="mt-1 text-sm text-gray-light">
                            Saving a focus captures the current comparable matches as its fixed baseline.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            {practice.metrics.map(metric => {
                                const values = evidenceMatches.map(
                                    match => match.evidence.metrics[metric.key].value
                                );
                                const aggregate = calculatePracticeAggregate(values, metric.aggregation);
                                const presentation = metricPresentation[metric.key];
                                const selected = selectedMetricKey === metric.key;

                                return (
                                    <label
                                        key={metric.key}
                                        className={`cursor-pointer rounded-lg border bg-dark-plume/45 p-5 transition ${selected ? 'border-purple ring-2 ring-purple/40' : 'border-dark-silver'}`}
                                    >
                                        <span className="flex items-start justify-between gap-3">
                                            <span>
                                                <span className="block text-sm text-gray-light">
                                                    {getAggregateLabel(metric.aggregation)}
                                                </span>
                                                <span className="mt-1 block text-lg">{presentation.title}</span>
                                            </span>
                                            <input
                                                type="radio"
                                                name="practice-focus"
                                                value={metric.key}
                                                checked={selected}
                                                onChange={() => {
                                                    setSelectedMetricKey(metric.key);
                                                    setSaveConfirmation(null);
                                                }}
                                                className="mt-1 h-5 w-5 accent-purple"
                                            />
                                        </span>
                                        <span className="mt-3 block text-3xl">
                                            {aggregate === null ? 'Unavailable' : metricNumberFormatter.format(aggregate)}
                                        </span>
                                        <span className="mt-2 block text-sm text-gray-light">
                                            {getSampleLabel(values.length)}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={handleSaveFocus}
                                disabled={selectedMetricKey === null || focusIsLoading}
                                className="rounded-lg bg-purple px-5 py-3 font-semibold text-white transition hover:bg-purple/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savedFocus ? 'Replace saved focus and baseline' : 'Save focus and baseline'}
                            </button>
                            {selectedMetricKey === null && (
                                <p className="text-sm text-gray-light">Select one metric before saving.</p>
                            )}
                        </div>
                    </fieldset>

                    <div className="mt-8">
                        <h3 className="text-xl">Current report evidence</h3>
                        <p className="mt-1 text-sm text-gray-light">
                            Every value below comes from that match&apos;s exact 10-minute timeline frame.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {evidenceMatches.map(match => (
                                <article
                                    key={match.evidence.matchId}
                                    className="min-w-0 rounded-lg border border-dark-silver bg-dark-plume/45 p-5"
                                >
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h4 className="text-lg">{match.evidence.championName}</h4>
                                            <p className="text-sm text-gray-light">
                                                {getGameDate(match.evidence.gameStartTimestamp)}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-light">Patch {match.evidence.patch}</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                        <span className="rounded-full border border-dark-silver px-3 py-1">
                                            {getQueueLabel(match.evidence.queueId)}
                                        </span>
                                        <span className="rounded-full border border-dark-silver px-3 py-1">
                                            Role {match.evidence.role}
                                        </span>
                                        <span className="rounded-full border border-dark-silver px-3 py-1">
                                            Timeline 10:00
                                        </span>
                                    </div>
                                    <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                                        {practice.metrics.map(metric => {
                                            const observation = match.evidence.metrics[metric.key];
                                            const presentation = metricPresentation[metric.key];

                                            return (
                                                <div key={metric.key} className="min-w-0 rounded-lg bg-black-russian/60 p-3">
                                                    <dt className="text-xs text-gray-light">{presentation.shortLabel}</dt>
                                                    <dd className="mt-1 text-xl">
                                                        {wholeNumberFormatter.format(observation.value)}
                                                    </dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                    <p className="mt-4 break-all text-xs text-gray-light">
                                        Match {match.evidence.matchId}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {excludedMatches.length > 0 && (
                <details className="mt-8 rounded-lg border border-dark-silver bg-dark-plume/45 p-5">
                    <summary className="cursor-pointer text-lg">
                        Excluded matches ({excludedMatches.length})
                    </summary>
                    <p className="mt-2 text-sm text-gray-light">
                        Excluded matches do not contribute to the metric sample.
                    </p>
                    <div className="mt-4 space-y-4">
                        {excludedMatches.map(match => (
                            <article key={match.match.matchId} className="rounded-lg bg-black-russian/60 p-4">
                                <div className="flex flex-col gap-1 md:flex-row md:justify-between">
                                    <div>
                                        <h4>{match.match.championName ?? 'Champion unavailable'}</h4>
                                        <p className="text-sm text-gray-light">
                                            {getGameDate(match.match.gameStartTimestamp)}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-light">
                                        {getQueueLabel(match.match.queueId)} · {match.match.role ?? 'Role unavailable'} · {match.match.patch ? `Patch ${match.match.patch}` : 'Patch unavailable'}
                                    </p>
                                </div>
                                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-light">
                                    {match.reasons.map(reason => (
                                        <li key={reason}>{exclusionMessages[reason]}</li>
                                    ))}
                                </ul>
                                <p className="mt-3 break-all text-xs text-gray-light">
                                    Match {match.match.matchId}
                                </p>
                            </article>
                        ))}
                    </div>
                </details>
            )}
        </section>
    );
}

export default PracticeReview;
