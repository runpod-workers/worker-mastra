import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export const webSearchTool = createTool({
  id: "web-search",
  description:
    "Search the web for information on a given query. Returns relevant results with titles, URLs, and content snippets.",
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe("The search query"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("Maximum number of results to return (1-10, default 5)"),
  }),
  outputSchema: z.array(
    z.object({
      title: z.string().nullable(),
      url: z.string(),
      content: z.string(),
      publishedDate: z.string().optional(),
    })
  ),
  execute: async ({ context }) => {
    const { results } = await exa.searchAndContents(context.query, {
      livecrawl: "always",
      numResults: context.maxResults || 5,
    });

    return results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.text.slice(0, 1000),
      publishedDate: result.publishedDate,
    }));
  },
});

