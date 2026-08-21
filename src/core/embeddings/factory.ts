import { EmbeddingProvider } from "./types";
import { OpenAIEmbedding } from "./openai";
import { LocalEmbedding } from "./local";

export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  const apiKey = process.env.NEXT_APP_OPENAI_API_KEY;

  if (apiKey) {
    return new OpenAIEmbedding(apiKey);
  }

  // Fall back to local embeddings
  const local = new LocalEmbedding();
  await local.initialize();
  return local;
}
