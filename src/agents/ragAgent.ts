import type { WeaviateObject } from "weaviate-client";
import { callChatModel } from "../llm.js";
import { config } from "../config.js";
import { getWeaviateClient, getTenantCollection, QAPair } from "../weaviate.js";

export type RagObject = {
  id: string;
  fileId: string;
  question: string;
  answer: string;
  pageNumber: string[];
};

export type RagReference = {
  index: number;
  fileId: string;
  pages: string[];
};

export type RagData = {
  type: "rag_references";
  source: string;
  llmUsed: boolean;
  tenant: string;
  collection: string;
  references: RagReference[];
  objects: RagObject[];
};

export type RagResult = {
  answer: string;
  data: RagData[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreObject(object: RagObject, queryTokens: Set<string>): number {
  const haystack = `${object.question} ${object.answer}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function rankObjects(objects: RagObject[], question: string, limit: number): RagObject[] {
  const queryTokens = new Set(tokenize(question));
  const scored = objects.map((object) => ({
    object,
    score: scoreObject(object, queryTokens)
  }));

  scored.sort((a, b) => b.score - a.score);

  const filtered = scored.filter((entry) => entry.score > 0);
  const selected = (filtered.length > 0 ? filtered : scored)
    .slice(0, limit)
    .map((entry) => entry.object);

  return selected;
}

function buildReferences(objects: RagObject[]) {
  const fileOrder: string[] = [];
  const fileIndex = new Map<string, number>();
  const pagesByFile = new Map<string, Set<string>>();

  for (const object of objects) {
    if (!object.fileId) {
      continue;
    }

    if (!fileIndex.has(object.fileId)) {
      fileIndex.set(object.fileId, fileOrder.length + 1);
      fileOrder.push(object.fileId);
    }

    if (!pagesByFile.has(object.fileId)) {
      pagesByFile.set(object.fileId, new Set());
    }

    for (const page of object.pageNumber || []) {
      if (page) {
        pagesByFile.get(object.fileId)?.add(String(page));
      }
    }
  }

  const references: RagReference[] = fileOrder.map((fileId, index) => {
    const pages = Array.from(pagesByFile.get(fileId) || []);
    pages.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return {
      index: index + 1,
      fileId,
      pages
    };
  });

  const referenceTags = references.flatMap((ref) =>
    ref.pages.map((page) => `${ref.index}- Page ${page}`)
  );

  return { references, referenceTags, fileIndex };
}

function formatSnippets(objects: RagObject[], referenceInfo: ReturnType<typeof buildReferences>): string {
  return objects
    .map((object, index) => {
      const fileIndex = referenceInfo.fileIndex.get(object.fileId) || "?";
      const tags = (object.pageNumber || []).map(
        (page) => `${fileIndex}- Page ${page}`
      );

      return [
        `Snippet ${index + 1}:`,
        `File: ${object.fileId}`,
        `Reference tags: ${tags.join(", ") || "N/A"}`,
        `Question: ${object.question}`,
        `Answer: ${object.answer}`
      ].join("\n");
    })
    .join("\n\n");
}

function buildFallbackAnswer(objects: RagObject[], referenceInfo: ReturnType<typeof buildReferences>): string {
  if (objects.length === 0) {
    return "I could not find relevant entries in the database.";
  }

  const primary = objects[0];
  const refs = referenceInfo.referenceTags.join(", ");
  return `${primary.answer} References: ${refs || "N/A"}.`;
}

async function retrieveFromWeaviate(question: string): Promise<{ objects: WeaviateObject<QAPair, undefined>[]; source: string }> {
  const client = await getWeaviateClient();
  const tenantCollection = await getTenantCollection(client);
  let source = "fetchObjects";
  let objects: WeaviateObject<QAPair, undefined>[] = [];

  try {
    if (config.weaviateVectorSearch) {
      const nearTextResult = await tenantCollection.query.nearText(question, {
        limit: Math.max(config.maxResults, 3)
      });
      objects = nearTextResult.objects || [];
      source = "nearText";
    }
  } catch (error) {
    source = "fetchObjects";
  }

  if (objects.length === 0) {
    const fallbackResult = await tenantCollection.query.fetchObjects({
      limit: Math.max(config.maxResults, 6)
    });
    objects = fallbackResult.objects || [];
  }

  await client.close();
  return { objects, source };
}

export async function ragAgent(question: string): Promise<RagResult> {
  const { objects: rawObjects, source } = await retrieveFromWeaviate(question);

  const normalized: RagObject[] = rawObjects.map((obj) => ({
    id: obj.uuid,
    fileId: obj.properties?.fileId || "",
    question: obj.properties?.question || "",
    answer: obj.properties?.answer || "",
    pageNumber: Array.isArray(obj.properties?.pageNumber)
      ? (obj.properties.pageNumber as string[])
      : []
  }));

  const ranked = rankObjects(normalized, question, config.maxResults);
  const referenceInfo = buildReferences(ranked);
  const snippets = formatSnippets(ranked, referenceInfo);

  let answer = "";
  let llmUsed = true;

  try {
    answer = await callChatModel(
      "You are a RAG assistant. Use only the provided snippets to answer. " +
        "Always include references in the format 'X- Page Y' where X matches " +
        "the file index in the references. If uncertain, say you do not know.",
      [
        `Question: ${question}`,
        "",
        "Snippets:",
        snippets,
        "",
        "Allowed reference tags:",
        referenceInfo.referenceTags.join(", "),
        "",
        "Answer with references included:"
      ].join("\n")
    );
  } catch (error) {
    llmUsed = false;
    answer = buildFallbackAnswer(ranked, referenceInfo);
  }

  return {
    answer,
    data: [
      {
        type: "rag_references",
        source,
        llmUsed,
        tenant: config.weaviateTenant,
        collection: config.weaviateCollection,
        references: referenceInfo.references,
        objects: ranked
      }
    ]
  };
}
