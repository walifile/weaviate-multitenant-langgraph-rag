import { streamDelegatingAgent } from "./agents/delegatingAgent.js";

const query = process.argv.slice(2).join(" ") ||
  "Provide a chart and answer the warranty question from the database.";

console.log(`Query: ${query}`);

(async () => {
  for await (const chunk of streamDelegatingAgent(query)) {
    console.log(JSON.stringify(chunk));
  }
})().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
