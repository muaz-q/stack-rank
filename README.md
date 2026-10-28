# CS Geek

**Live:** https://stack-rank-one.vercel.app

A daily trivia game for CS students. Each day you get seven "Name a…" prompts on topics like OS, networks
and databases. **The rarer your correct answer, the more it scores**, and at the end you see where you
sit on a bell curve against other players.

## How popularity is measured

1. **Real players.** Each player's final answer to each question is stored in Postgres, once per player
   per question. An answer's share is the number of players who gave it.
2. **Starting numbers, used until enough players arrive.** These come from published sources only:
   - Surveys for 27 questions: Stack Overflow Developer Survey 2022/2024/2025, StatCounter, the
     JetBrains CI/CD survey, W3Techs and DB-Engines. See `data/survey_stats.json`, which gives the source
     URL and metric for each.
   - Wikipedia page views for 4 questions, with every answer-to-article match checked by hand.
   - The rest are marked "estimated" in the game.

   The share shown is `(real picks + 25 × starting share) / (players + 25)`, so the starting numbers
   fade out as real data comes in.
3. **Rejected guesses are logged** at `/api/misses`. This list shows which answers and spellings the
   answer bank is missing.

## API (Vercel functions + Neon Postgres)

| Route | |
|---|---|
| `POST /api/answer` | `{client, sid, answer, raw, wrong[], tries, mode, day}`. Each player counts once per question. |
| `GET /api/stats` | `{sid: {n, passed, answers: {name: count}}}`, cached for 2 minutes at the edge. |
| `GET /api/misses` | The 500 most common rejected guesses. |

The schema is in `db/schema.sql`, and the API also creates it the first time it's called. The only
setting needed is `DATABASE_URL`, which the Neon integration fills in.
