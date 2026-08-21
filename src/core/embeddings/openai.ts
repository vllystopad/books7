import { EmbeddingProvider } from "./types";
import { OpenAI } from "openai";

export class OpenAIEmbedding implements EmbeddingProvider {
  private client: OpenAI;
  modelName = "text-embedding-3-small";

  constructor(apiKey?: string) {
    const key = apiKey || process.env.NEXT_APP_OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "NEXT_APP_OPENAI_API_KEY is not set. OpenAI embeddings require an API key."
      );
    }
    this.client = new OpenAI({ apiKey: key });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: text,
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: texts,
    });

    // Sort by index to ensure correct order
    return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
