import type {
    PracticeEvidenceMatch,
    PracticeExcludedMatch,
    PracticeMatchCalculation,
    PracticeMatchExclusionReason,
    PracticeMetricAggregation,
    PracticeMetricKey,
    PracticeReport,
} from './practiceTypes';

type PracticeReviewProps = {
    practice: PracticeReport;
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

const calculateAggregate = (
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

function PracticeReview({ practice }: PracticeReviewProps) {
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

    const evidenceMatches = practice.matches.filter(isEvidenceMatch);
    const excludedMatches = practice.matches.filter(isExcludedMatch);

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

            {evidenceMatches.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dark-silver bg-dark-plume/45 p-5">
                    <h3 className="text-lg">Not enough comparable data yet</h3>
                    <p className="mt-2 text-gray-light">
                        No recent ranked-solo BOTTOM match has complete, trustworthy 10-minute timeline data. Exclusion details are shown below when available.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {practice.metrics.map(metric => {
                            const values = evidenceMatches.map(
                                match => match.evidence.metrics[metric.key].value
                            );
                            const aggregate = calculateAggregate(values, metric.aggregation);
                            const presentation = metricPresentation[metric.key];

                            return (
                                <article
                                    key={metric.key}
                                    className="rounded-lg border border-dark-silver bg-dark-plume/45 p-5"
                                >
                                    <p className="text-sm text-gray-light">{getAggregateLabel(metric.aggregation)}</p>
                                    <h3 className="mt-1 text-lg">{presentation.title}</h3>
                                    <p className="mt-3 text-3xl">
                                        {aggregate === null ? 'Unavailable' : metricNumberFormatter.format(aggregate)}
                                    </p>
                                    <p className="mt-2 text-sm text-gray-light">
                                        {getSampleLabel(values.length)}
                                    </p>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-8">
                        <h3 className="text-xl">Match evidence</h3>
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
