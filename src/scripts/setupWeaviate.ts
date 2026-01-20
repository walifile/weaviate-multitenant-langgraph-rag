import weaviate from "weaviate-client";
import type { Collection, WeaviateClient } from "weaviate-client";
import { config } from "../config/index.js";
import { getWeaviateClient, QAPair } from "../clients/weaviate.js";

const SEED_DATA: QAPair[] = [
  {
    fileId: "policy-handbook",
    question: "What is the warranty period?",
    answer: "The warranty lasts 12 months from the purchase date.",
    pageNumber: ["3"]
  },
  {
    fileId: "employee-manual",
    question: "How many vacation days are offered?",
    answer: "Full-time employees receive 20 vacation days per year.",
    pageNumber: ["11", "12"]
  },
  {
    fileId: "incident-guide",
    question: "Who should be notified for a critical incident?",
    answer: "Notify the on-call lead and the security team immediately.",
    pageNumber: ["5"]
  }
];
const SEED_VECTOR = [0.01, 0.02, 0.03];

async function ensureCollection(client: WeaviateClient) {
  const exists = await client.collections.exists(config.weaviateCollection);
  if (exists) {
    return;
  }

  await client.collections.create<QAPair>({
    name: config.weaviateCollection,
    description: "Fictional Q&A pairs for RAG demos.",
    multiTenancy: {
      enabled: true
    },
    vectorizers: weaviate.configure.vectorizer.none(),
    properties: [
      {
        name: "fileId",
        dataType: "text",
        indexFilterable: false,
        indexSearchable: false,
        skipVectorization: true
      },
      {
        name: "question",
        dataType: "text"
      },
      {
        name: "answer",
        dataType: "text"
      },
      {
        name: "pageNumber",
        dataType: "text[]"
      }
    ]
  });
}

async function ensureTenant(collection: Collection<QAPair>) {
  const existing = await collection.tenants.getByName(config.weaviateTenant);
  if (existing) {
    return;
  }

  await collection.tenants.create({
    name: config.weaviateTenant
  });
}

async function seedData(collection: Collection<QAPair>) {
  const tenantCollection = collection.withTenant(config.weaviateTenant);
  const existing = await tenantCollection.query.fetchObjects({ limit: 1 });

  if (existing.objects.length > 0) {
    return;
  }

  const objects = SEED_DATA.map((entry) => ({
    properties: entry,
    vectors: SEED_VECTOR
  }));

  const result = await tenantCollection.data.insertMany(objects);
  if (result.hasErrors) {
    const errorDetails = Object.values(result.errors)
      .map((error) => error.message)
      .join("; ");
    throw new Error(`Seed insert failed: ${errorDetails || "Unknown error"}`);
  }
}

async function main() {
  const client = await getWeaviateClient();
  await ensureCollection(client);

  const collection = client.collections.get<QAPair>(config.weaviateCollection);
  await ensureTenant(collection);
  await seedData(collection);

  console.log("Weaviate schema and seed data are ready.");
  await client.close();
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
