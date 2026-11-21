# scripts/

## `ai-smoke.mjs` — teste manual da Groq (fora do CI e do jest)

Gera **1 questão** a partir de um parágrafo fixo e imprime **só a questão** (modelo, enunciado, alternativas; `*` marca a correta). Serve para conferir, à mão, que a chave, o endpoint e o modelo funcionam. **Não** exercita o adaptador do repositório (tool calling, validação): isso é coberto pelos testes com `fetch` falso.

```bash
export GROQ_API_KEY=...        # nunca commitar; em Codespaces, use Codespaces Secrets
node scripts/ai-smoke.mjs      # AI_MODEL opcional (padrão: openai/gpt-oss-120b)
```

- Sem `GROQ_API_KEY`, o script avisa e sai com código 2 sem chamar a rede.
- A chave nunca é impressa; erros mostram só o status HTTP.
- Consome 1 requisição da cota gratuita da Groq (limites por organização).
- Não é chamado por `nx`, `npm test` nem pelo CI.
