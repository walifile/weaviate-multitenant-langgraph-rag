# Weaviate + LangGraph Assessment

This repo implements a multi-tenant Weaviate setup, a LangGraph delegating agent, a mocked Chart.js tool, and a RAG agent that references file and page numbers in its answer, all in TypeScript.

## What is included
- Dockerized Weaviate with multi-tenancy enabled.
- A collection schema with `fileId`, `question`, `answer`, and `pageNumber`.
- Seed data script that inserts three fictional entries.
- LangGraph delegating agent that routes to:
  - Chart.js tool (mock config)
  - RAG agent (Weaviate fetchObjects fallback)
  - Direct LLM response
- Streaming response shape: `{ answer: string, data: object[] }`.

## Requirements
- Node.js 18+
- Docker
- A Gemini API key (or update the LLM implementation to your local model)

## Setup
1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install dependencies: `npm install`.
3. Start Weaviate: `npm run weaviate:up`.
4. Create schema and seed data: `npm run weaviate:setup`.

## Run a demo
```bash
npm run demo -- "Provide a chart and answer the warranty question from the database."
```

The demo prints JSON lines that represent streaming chunks. The final chunk includes the `data` array with chart configs or RAG references.

## Example queries
- "Show me a chart of quarterly revenue"
- "From the policy handbook, what is the warranty period?"
- "Pull the incident guide answer and include a chart in parallel"
- "First retrieve the answer then show a chart"

## How references work
- RAG answers include references like `1- Page 3`.
- The number maps to the order of `fileId` values in the `data` references list.
- Pages are grouped per file in the `data` object.

## Project layout
- `docker-compose.yml`
- `src/cli.ts`
- `src/scripts/setupWeaviate.ts`
- `src/agents/delegatingAgent.ts`
- `src/agents/ragAgent.ts`
- `src/agents/chartTool.ts`
- `src/clients/weaviate.ts`
- `src/clients/llm.ts`
- `src/config/index.ts`

## Notes
- The RAG agent attempts `nearText` if `WEAVIATE_VECTOR_SEARCH=true`, otherwise it falls back to `fetchObjects`.
- The LLM uses Gemini via LangChain. Set `GEMINI_MODEL` to override the default.
