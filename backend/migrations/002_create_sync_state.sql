CREATE TABLE report_sync_state (
    cache_key TEXT PRIMARY KEY,
    owner_id UUID NOT NULL,
    lease_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX report_sync_state_lease_expires_at_index
    ON report_sync_state (lease_expires_at);
