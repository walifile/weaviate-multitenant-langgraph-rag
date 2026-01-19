import weaviate from "weaviate-client";
import type { WeaviateClient, Collection } from "weaviate-client";
import { config } from "../config/index.js";

export type QAPair = {
  fileId: string;
  question: string;
  answer: string;
  pageNumber: string[];
};

export async function getWeaviateClient(): Promise<WeaviateClient> {
  const url = new URL(config.weaviateUrl);
  const host = url.hostname;
  const port = url.port ? Number(url.port) : 8080;
  const grpcPort = config.weaviateGrpcPort || 50051;

  if (url.protocol === "https:") {
    return weaviate.connectToCustom({
      httpHost: host,
      httpPort: port,
      httpSecure: true,
      grpcHost: host,
      grpcPort,
      grpcSecure: true,
      authCredentials: config.weaviateApiKey || undefined
    });
  }

  return weaviate.connectToLocal({
    host,
    port,
    grpcPort,
    authCredentials: config.weaviateApiKey || undefined
  });
}

export async function getTenantCollection(
  client: WeaviateClient
): Promise<Collection<QAPair>> {
  const collection = client.collections.get<QAPair>(config.weaviateCollection);
  return collection.withTenant(config.weaviateTenant);
}
