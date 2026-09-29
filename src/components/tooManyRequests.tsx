import { useLocation, useNavigate } from 'react-router-dom';

type PlayerLoadFailureReason =
    | 'rate_limited'
    | 'service_unavailable'
    | 'invalid_response'
    | 'asset_data_unavailable';

type PlayerLoadFailure = {
    reason: PlayerLoadFailureReason;
    retryPath: string | null;
};

type FailurePresentation = {
    title: string;
    message: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isPlayerLoadFailureReason = (value: unknown): value is PlayerLoadFailureReason => (
    value === 'rate_limited'
    || value === 'service_unavailable'
    || value === 'invalid_response'
    || value === 'asset_data_unavailable'
);

const getPlayerLoadFailure = (value: unknown): PlayerLoadFailure => {
    if (!isRecord(value) || !isPlayerLoadFailureReason(value.reason)) {
        return {
            reason: 'service_unavailable',
            retryPath: null,
        };
    }

    const retryPath = typeof value.retryPath === 'string'
        && value.retryPath.startsWith('/player/')
        ? value.retryPath
        : null;

    return {
        reason: value.reason,
        retryPath,
    };
};

const failurePresentations: Record<PlayerLoadFailureReason, FailurePresentation> = {
    rate_limited: {
        title: 'Riot is limiting requests',
        message: 'The coordinated retry window could not complete this report yet. Wait briefly, then retry the same player.',
    },
    service_unavailable: {
        title: 'Player data is temporarily unavailable',
        message: 'The report service could not complete the request. Your saved browser focus has not been changed.',
    },
    invalid_response: {
        title: 'The report could not be verified',
        message: 'The response did not match the data required for a trustworthy practice report, so it was not displayed.',
    },
    asset_data_unavailable: {
        title: 'Game assets are temporarily unavailable',
        message: 'The player report loaded, but the current Data Dragon version could not be verified. Retry when Riot assets are available.',
    },
};

function TooManyRequests() {
    const location = useLocation();
    const navigate = useNavigate();
    const locationState: unknown = location.state;
    const failure = getPlayerLoadFailure(locationState);
    const presentation = failurePresentations[failure.reason];
    const retryPath = failure.retryPath;

    return (
        <div className="w-full min-h-screen px-4 text-white flex items-center justify-center">
            <main className="w-full max-w-2xl rounded-xl border-2 border-dark-silver bg-black-russian/60 p-8 text-center drop-shadow-plume">
                <h1 className="text-3xl">{presentation.title}</h1>
                <p className="mt-4 text-gray-light">{presentation.message}</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    {retryPath && (
                        <button
                            type="button"
                            onClick={() => navigate(retryPath, { replace: true })}
                            className="rounded-lg bg-purple px-5 py-3 font-semibold text-white transition hover:bg-purple/80"
                        >
                            Retry this player
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/', { replace: true })}
                        className="rounded-lg border border-dark-silver px-5 py-3 text-gray-light transition hover:text-white"
                    >
                        Search another player
                    </button>
                </div>
            </main>
        </div>
    );
}

export default TooManyRequests;
