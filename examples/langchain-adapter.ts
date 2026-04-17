/**
 * Minimal LangChain JS memory adapter wrapping @vbcherepanov/total-agent-memory-client.
 *
 * Shows the pattern — adapt to your BaseMemory / BaseChatMemory implementation.
 */
import { connectStdio, type MemoryClient } from "../src/index.js";

export class TotalAgentMemoryLC {
  constructor(
    private readonly client: MemoryClient,
    private readonly project: string,
  ) {}

  static async create(project: string): Promise<TotalAgentMemoryLC> {
    const client = await connectStdio();
    return new TotalAgentMemoryLC(client, project);
  }

  /** Persist an interaction as a `solution` record. */
  async saveContext(input: string, output: string): Promise<void> {
    await this.client.save({
      type: "solution",
      project: this.project,
      content: `Q: ${input}\nA: ${output}`,
      tags: ["chat-turn"],
    });
  }

  /** Retrieve top-k relevant past interactions for prompt assembly. */
  async loadMemoryVariables(input: string, k = 5): Promise<{
    history: string;
  }> {
    const hits = await this.client.recallFlat({
      query: input,
      project: this.project,
      limit: k,
      detail: "summary",
    });
    const history = hits
      .map((h) => `- [${h.created_at}] ${h.content}`)
      .join("\n");
    return { history };
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
