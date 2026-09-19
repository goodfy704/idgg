CREATE TABLE match_timelines (
    match_id TEXT PRIMARY KEY,
    regional_route TEXT NOT NULL,
    timeline JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT match_timelines_match_id_not_empty
        CHECK (length(btrim(match_id)) > 0),
    CONSTRAINT match_timelines_regional_route_not_empty
        CHECK (length(btrim(regional_route)) > 0),
    CONSTRAINT match_timelines_timeline_is_object
        CHECK (jsonb_typeof(timeline) = 'object')
);

CREATE INDEX match_timelines_regional_route_index
    ON match_timelines (regional_route);
