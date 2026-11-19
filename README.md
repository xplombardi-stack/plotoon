# Plotoon

Estúdio pra criar historinhas em vídeo com personagens 3D. O Diretor (Claude) escreve a história em partes, e cada parte vira um vídeo curto.

## Rodar no computador

```bash
npm install
cp .env.example .env   # endereço e chave publicável do Supabase
npm run dev
```

Com `VITE_DEMO=1` no `.env`, o app roda como prévia (sem login, tudo salvo no navegador).

## Onde fica cada coisa

- `src/pages` — telas (Início, Nova historinha, Editor, Elenco, Planos, Conta…)
- `src/lib/store.tsx` — dados do app (prévia no navegador ou Supabase no ar)
- `src/lib/diretorApi.ts` — chamadas ao Diretor
- `src/assets/inicio` — imagens da página inicial
- `supabase/migrations` — banco de dados
- `supabase/functions/diretor` — função que conversa com o Claude

## Publicação

O Netlify publica sozinho a cada envio pro GitHub (`netlify.toml`).
A chave do Claude (`ANTHROPIC_API_KEY`) fica só nos segredos das funções do Supabase, nunca no código.
