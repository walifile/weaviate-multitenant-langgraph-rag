import weaviate from "weaviate-client";
import { config } from "./config.js";
export async function getWeaviateClient() {
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
export async function getTenantCollection(client) {
    const collection = client.collections.get(config.weaviateCollection);
    return collection.withTenant(config.weaviateTenant);
}
