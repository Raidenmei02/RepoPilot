CREATE TABLE repositories (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    clone_url TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'go',
    default_branch TEXT NOT NULL,
    github_installation_id BIGINT,
    allowed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner, name)
);

CREATE TABLE task_runs (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('analyze', 'review')),
    repository_id TEXT NOT NULL REFERENCES repositories (id),
    status TEXT NOT NULL,
    question TEXT,
    pr_number INTEGER,
    base_sha TEXT,
    head_sha TEXT,
    commit_sha TEXT NOT NULL DEFAULT '',
    model_name TEXT NOT NULL DEFAULT '',
    prompt_version TEXT NOT NULL DEFAULT '',
    retrieval JSONB NOT NULL DEFAULT '{}',
    budget JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    comment_posted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX task_runs_review_dedup
    ON task_runs (repository_id, pr_number, head_sha)
    WHERE kind = 'review' AND pr_number IS NOT NULL AND head_sha <> '';

CREATE TABLE run_steps (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES task_runs (id),
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    duration_ms BIGINT NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_id, name)
);

CREATE TABLE tool_calls (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES task_runs (id),
    name TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE findings (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES task_runs (id),
    path TEXT NOT NULL,
    line INTEGER NOT NULL,
    rule TEXT NOT NULL,
    severity TEXT NOT NULL,
    evidence TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE artifacts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES task_runs (id),
    kind TEXT NOT NULL CHECK (kind IN ('report', 'diff', 'scan_output')),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
