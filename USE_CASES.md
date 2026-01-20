# Use Cases and Test Steps

## 1) Weaviate container starts with multi-tenancy
Goal: The Dockerized Weaviate instance boots and supports multi-tenancy.

Test:
- `docker compose up -d`
- `npm run weaviate:setup`

Expected:
- Setup finishes with "Weaviate schema and seed data are ready."

## 2) Schema creation (multi-tenant, fields present)
Goal: A collection exists with `fileId`, `question`, `answer`, `pageNumber`.

Test:
- `npm run weaviate:setup`

Expected:
- No schema errors and setup completes.

## 3) Seed data insertion
Goal: Seed data is inserted successfully.

Test:
- Run `npm run weaviate:setup` after a fresh container start.
- Optionally wipe data: `docker compose down -v` then re-run setup.

Expected:
- No "Seed insert failed" errors.

## 4) RAG agent (fetchObjects fallback)
Goal: RAG answers use Weaviate results from the collection.

Test:
- Run:
  - `npm run demo -- "From the policy handbook, what is the warranty period?" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- Answer references `1- Page 3`
- `data[0].type` is `rag_references`
- `data[0].references` includes `policy-handbook`

## 5) RAG agent with OpenAI LLM
Goal: LLM is used for the final answer.

Test:
- Ensure `.env` has `OPENAI_API_KEY=...` and optional `OPENAI_MODEL=gpt-4o-mini`
- Run a RAG query:
  - `npm run demo -- "From the policy handbook, what is the warranty period?" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- `data[0].llmUsed` is `true`
- Answer includes formatted reference tags.

## 6) Chart tool (mock Chart.js config)
Goal: Chart tool returns a mocked Chart.js configuration.

Test:
- `npm run demo -- "Show me a chart of quarterly revenue" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- `data` contains an object with `type: "chartjs_config"`
- Answer mentions the chart config was generated.

## 7) Delegating agent: direct answer
Goal: If query does not need chart or RAG, answer directly.

Test:
- `npm run demo -- "Summarize what this project does." | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- `data` contains `type: "direct_answer"`

## 8) Delegating agent: RAG + chart in parallel
Goal: Use both tools in the same response.

Test:
- `npm run demo -- "Pull the incident guide answer and include a chart in parallel" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- `data` includes both `rag_references` and `chartjs_config`
- Answer includes RAG text and a chart note.

## 9) Delegating agent: RAG then chart (sequential)
Goal: Sequential tool usage based on the query.

Test:
- `npm run demo -- "First retrieve the answer then show a chart" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- Answer begins with the RAG answer and then notes the chart config.
- `data` includes both `rag_references` and `chartjs_config`.

## 10) Streaming output format
Goal: Output chunks are streamed as `{ answer, data }`.

Test:
- Run any demo command (with the pretty output pipeline).

Expected:
- Each line is JSON with `answer` and `data`.
- Only the final chunk includes the populated `data` array.

## 11) Error handling: missing API key
Goal: Clear behavior when OpenAI key is missing.

Test:
- Remove `OPENAI_API_KEY` from `.env`
- Run:
  - `npm run demo -- "From the policy handbook, what is the warranty period?" | Where-Object { $_ -match '^\{' } | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Depth 6 }`

Expected:
- RAG still returns a fallback answer if LLM is unavailable.
- `data[0].llmUsed` is `false` and the answer is minimal.
