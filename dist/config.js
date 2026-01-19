import "dotenv/config";
export const config = {
    weaviateUrl: process.env.WEAVIATE_URL || "http://localhost:8080",
    weaviateGrpcPort: Number(process.env.WEAVIATE_GRPC_PORT || 50051),
    weaviateTenant: process.env.WEAVIATE_TENANT || "tenant-a",
    weaviateCollection: process.env.WEAVIATE_COLLECTION || "QAPair",
    weaviateVectorSearch: process.env.WEAVIATE_VECTOR_SEARCH === "true",
    weaviateApiKey: process.env.WEAVIATE_API_KEY || "",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    maxResults: Number(process.env.RAG_MAX_RESULTS || 4)
};
