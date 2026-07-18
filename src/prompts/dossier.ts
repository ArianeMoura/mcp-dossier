import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const userText = (text: string) => ({
  messages: [
    { role: "user" as const, content: { type: "text" as const, text } },
  ],
});

export function registerDossierPrompts(server: McpServer) {
  server.registerPrompt(
    "onboard-me",
    {
      title: "Get me up to speed",
      description: "Repository overview for someone just arriving.",
    },
    () =>
      userText(
        "I just arrived in this repository and don't know it. Use the repo_briefing tool for the overview and hotspots for where complexity concentrates. Then explain, in a few lines: what this project is, which areas concentrate risk, and where to start reading.",
      ),
  );

  server.registerPrompt(
    "review-my-branch",
    {
      title: "Review my branch before the PR",
      description: "Points out what usually changes together and you forgot.",
    },
    () =>
      userText(
        "I'm about to open a PR. Use the review_gap tool to see what I changed on this branch and which files historically change together that I haven't touched yet. List what I should review or complete before opening the PR, with the reason for each item.",
      ),
  );

  server.registerPrompt(
    "standup",
    {
      title: "My standup",
      description: "Summary of what's been happening in the repository.",
    },
    () =>
      userText(
        "I need a short summary for standup. Use the repo_briefing tool to see the time span and recent activity, and give me 3 to 5 bullets on what's been happening in the repository.",
      ),
  );
}
