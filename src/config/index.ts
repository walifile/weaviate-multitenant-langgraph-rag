import "dotenv/config";

export type AppConfig = {
  weaviateUrl: string;
  weaviateGrpcPort: number;
  weaviateTenant: string;
  weaviateCollection: string;
  weaviateApiKey: string;
  openAiApiKey: string;
  openAiModel: string;
  maxResults: number;
};

export const config: AppConfig = {
  weaviateUrl: process.env.WEAVIATE_URL || "http://localhost:8080",
  weaviateGrpcPort: Number(process.env.WEAVIATE_GRPC_PORT || 50051),
  weaviateTenant: process.env.WEAVIATE_TENANT || "tenant-a",
  weaviateCollection: process.env.WEAVIATE_COLLECTION || "QAPair",
  weaviateApiKey: process.env.WEAVIATE_API_KEY || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  maxResults: Number(process.env.RAG_MAX_RESULTS || 4)
};
