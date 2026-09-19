CREATE TABLE riot_rate_limits (
    routing_value TEXT NOT NULL,
    window_seconds INTEGER NOT NULL,
    request_limit INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (routing_value, window_seconds),
    CONSTRAINT riot_rate_limits_routing_value_not_empty
        CHECK (length(btrim(routing_value)) > 0),
    CONSTRAINT riot_rate_limits_window_seconds_positive
        CHECK (window_seconds > 0),
    CONSTRAINT riot_rate_limits_request_limit_positive
        CHECK (request_limit > 0),
    CONSTRAINT riot_rate_limits_request_count_nonnegative
        CHECK (request_count >= 0)
);
