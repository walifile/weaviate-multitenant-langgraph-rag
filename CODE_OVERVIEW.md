# Project Code Overview

This project demonstrates a multi-tenant Weaviate database, a LangGraph-based delegating agent, a mocked Chart.js tool, and a RAG flow that answers questions with file/page references. It retrieves stored Q&A entries from Weaviate, ranks them locally, and uses an OpenAI LLM to produce a final response that includes citations. Responses are streamed as JSON chunks so the UI can show progressive output and reference metadata.

This document explains the source code layout inside `src/`.

## src/cli.ts
- CLI entry point used by `npm run demo`.
- Reads the user query from command line arguments.
- Calls the delegating agent and prints each streamed chunk as JSON.
- Useful for quick testing without any UI.

## src/config/index.ts
- Central configuration loader.
- Reads `.env` variables and returns one typed `config` object.
- Keeps credentials, Weaviate settings, and limits in one place.
- All other files import from here instead of reading `process.env` directly.
- Fields explained:
  - `weaviateUrl`: Base URL for the Weaviate server (Docker defaults to `http://localhost:8080`).
  - `weaviateGrpcPort`: gRPC port used by the Weaviate JS client (default `50051`).
  - `weaviateTenant`: Tenant name for multi-tenant isolation.
  - `weaviateCollection`: Collection/class name for Q&A objects.
  - `weaviateApiKey`: Optional API key if Weaviate is secured.
  - `openAiApiKey`: OpenAI API key used by the LLM client.
  - `openAiModel`: OpenAI model name (default `gpt-4o-mini`).
  - `maxResults`: Max number of objects retrieved for RAG ranking.

## src/clients/llm.ts
- OpenAI LLM client wrapper (via LangChain).
- `getChatModel()` builds the model using `OPENAI_API_KEY` and `OPENAI_MODEL`.
- `callChatModel()` sends system + user prompts and returns plain text.
- This file isolates LLM logic so the rest of the code stays clean.

## src/clients/weaviate.ts
- Weaviate client wrapper.
- Creates a client for local or HTTPS deployments.
- Exposes a helper to get the tenant-scoped collection.
- Keeps Weaviate connection logic in one place.
- What it does in plain words:
  - Reads the Weaviate URL and gRPC port from `config`.
  - If the URL is `https`, it uses a secure client connection.
  - If the URL is `http`, it uses the local connection helper (Docker default).
  - Returns a collection already scoped to the tenant, so other code stays simple.

## src/agents/delegating/index.ts
- Main router for the whole system.
- Decides which tools to use based on keywords in the query.
  - Direct answer (LLM only)
  - RAG (Weaviate + LLM)
  - Chart tool (mock config)
  - Both tools (parallel or sequential)
- Streams the answer in chunks so output is progressive.
- This is where the overall response format `{ answer, data }` is enforced.

## src/agents/rag/index.ts
- Retrieval-Augmented Generation (RAG) logic.
- Pulls objects from Weaviate using `fetchObjects`.
- Ranks results with simple keyword scoring.
- Builds references like `1- Page 3` from fileId + pageNumber.
- Sends snippets to the LLM and returns the final answer plus references.
- Easy explanation:
  - Gets stored Q&A entries from Weaviate.
  - Chooses the most relevant ones for the question.
  - Creates reference tags from file + page.
  - Uses the LLM to write a clean answer with citations.

## src/scripts/setupWeaviate.ts
- One-time setup script for Weaviate.
- Creates the collection schema with multi-tenancy enabled.
- Inserts seed Q&A data (including project overview).
- Adds a tiny placeholder vector because `vectorizer: none` requires manual vectors.
- Safe to run multiple times: it only inserts missing entries.

## src/tools/chart.ts
- Mock Chart.js tool.
- Returns a fixed Chart.js config object (no real chart rendering).
- Used when the user asks for a chart.

## src/utils/text.ts
- Helper for streaming output.
- Splits long answers into smaller chunks.
- Ensures only the final chunk carries the `data` payload.
