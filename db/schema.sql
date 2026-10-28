-- One row per player per question: what they finally answered and what they tried first.
CREATE TABLE IF NOT EXISTS plays (
  id        bigserial PRIMARY KEY,
  ts        timestamptz NOT NULL DEFAULT now(),
  client    text        NOT NULL,          -- random id kept in the player's browser, nothing personal
  sid       text        NOT NULL,          -- stable question id (hash of edition + prompt)
  answer    text,                          -- matched answer's display name; NULL = passed / timed out
  raw       text        NOT NULL DEFAULT '',
  wrong     text[]      NOT NULL DEFAULT '{}', -- rejected guesses, used to find missing aliases
  tries     int         NOT NULL DEFAULT 0,
  mode      text        NOT NULL,
  day       int         NOT NULL,
  UNIQUE (client, sid)                     -- a player counts once per question
);
CREATE INDEX IF NOT EXISTS plays_sid ON plays (sid);
