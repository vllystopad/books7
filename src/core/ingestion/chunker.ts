import { encodingForModel } from "js-tiktoken";

const enc = encodingForModel("gpt-3.5-turbo");

export interface SemanticChunk {
  content: string;
  tokens: number;
}

export async function semanticChunk(
  text: string,
  targetTokens = 800,
  overlapTokens = 100
): Promise<SemanticChunk[]> {
  if (!text || text.trim().length === 0) return [];

  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: SemanticChunk[] = [];
  let currentChunk = "";
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paraTokens = enc.encode(paragraph).length;

    if (currentTokens + paraTokens > targetTokens && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokens: currentTokens,
      });

      const overlapStart = Math.max(
        0,
        currentChunk.length -
          Math.floor((currentChunk.length * overlapTokens) / currentTokens)
      );
      currentChunk = currentChunk.substring(overlapStart) + " " + paragraph;
      currentTokens = enc.encode(currentChunk).length;
    } else {
      currentChunk += (currentChunk.length > 0 ? " " : "") + paragraph;
      currentTokens = enc.encode(currentChunk).length;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      tokens: currentTokens,
    });
  }

  return chunks;
}
