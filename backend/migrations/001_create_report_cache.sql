CREATE TABLE report_cache (
    cache_key TEXT PRIMARY KEY,
    game_name TEXT NOT NULL,
    tag_line TEXT NOT NULL,
    puuid TEXT NOT NULL,
    platform TEXT NOT NULL,
    regional_route TEXT NOT NULL,
    report JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT report_cache_report_is_object CHECK (jsonb_typeof(report) = 'object')
);

CREATE INDEX report_cache_puuid_index ON report_cache (puuid);
