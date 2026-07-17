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
      title: "Cheguei agora, me situa",
      description: "Panorama do repositório para quem está chegando.",
    },
    () =>
      userText(
        "Cheguei agora neste repositório e não o conheço. Use a tool repo_briefing para o panorama e hotspots para onde a complexidade se concentra. Depois me explique, em poucas linhas: o que é este projeto, quais áreas concentram risco, e por onde começar a ler.",
      ),
  );

  server.registerPrompt(
    "review-my-branch",
    {
      title: "Revisar minha branch antes do PR",
      description: "Aponta o que costuma mudar junto e você esqueceu.",
    },
    () =>
      userText(
        "Vou abrir um PR. Use a tool review_gap para ver o que mudei nesta branch e quais arquivos historicamente mudam junto que eu ainda não toquei. Liste o que eu deveria revisar ou completar antes de abrir o PR, com o porquê de cada item.",
      ),
  );

  server.registerPrompt(
    "standup",
    {
      title: "Meu standup",
      description: "Resumo do que andou acontecendo no repositório.",
    },
    () =>
      userText(
        "Preciso de um resumo curto para o standup. Use a tool repo_briefing para ver o período e a atividade recente, e me dê 3 a 5 bullets do que andou acontecendo no repositório.",
      ),
  );
}
