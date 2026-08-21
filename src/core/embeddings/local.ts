import { EmbeddingProvider } from "./types";
import { pipeline } from "@xenova/transformers";

export class LocalEmbedding implements EmbeddingProvider {
  private extractor: any = null;
  modelName = "Xenova/all-MiniLM-L6-v2";

  async initialize() {
    if (!this.extractor) {
      this.extractor = await pipeline("feature-extraction", this.modelName);
    }
  }

  async embed(text: string): Promise<number[]> {
    await this.initialize();
    const result = await this.extractor(text, { pooling: "mean" });
    return Array.from(result.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    await this.initialize();
    const results = await Promise.all(
      texts.map((text) =>
        this.extractor(text, { pooling: "mean" })
      )
    );

    return results.map((result) => Array.from(result.data as Float32Array));
  }
}
