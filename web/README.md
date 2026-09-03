# Painel (app React) — Meta Ads × Hotmart

App web do painel em **React + TypeScript + Tailwind CSS**, seguindo a estrutura
do **shadcn** (componentes de UI em `src/components/ui/`). É um SPA estático que
conversa com o Supabase por CORS (Supabase Auth + PostgREST), então roda em
qualquer host estático.

> Por que um app React? O gateway do Supabase bloqueia servir HTML por Edge
> Function (força `text/plain` + CSP `sandbox`). Um build estático resolve isso e
> ainda permite usar o `FunnelChart` (componente animado com `motion`).

## Estrutura

```
web/
  index.html
  src/
    main.tsx, App.tsx, index.css      # app + tema (claro/escuro/sistema)
    lib/
      supabase.ts                     # cliente + URL/anon key (env override)
      format.ts                       # nBR, rs, pct, taxa, custo…
      utils.ts                        # cn() (clsx + tailwind-merge)
    components/
      ui/funnel-chart.tsx             # o FunnelChart (shadcn-style)
      ui/primitives.tsx               # Card, Tile, Pill, Tabs, DataTable…
      LineChart.tsx                   # gráfico de linha (2 séries, hover)
      FunnelVisual.tsx                # monta estágios do FunnelChart
```

> **Por que `src/components/ui/`?** É a convenção do shadcn: os componentes de UI
> reutilizáveis (como `funnel-chart.tsx`) ficam em `@/components/ui`, e o alias
> `@` aponta para `src` (veja `vite.config.ts` e `tsconfig.json`). Se você adicionar
> mais componentes shadcn, coloque-os nessa pasta para o import `@/components/ui/...`
> funcionar.

## Rodar / build

```bash
cd web
npm install
npm run dev          # desenvolvimento (localhost:5173)
npm run build        # gera dist/ (tsc --noEmit + vite build)
npm run preview      # serve o dist/ em localhost:4173
```

Dependências externas do `FunnelChart`: `motion`, `clsx`, `tailwind-merge`
(já no `package.json`), mais `@supabase/supabase-js` para dados/login.

## Configuração

O `src/lib/supabase.ts` já vem com a URL e a **anon key** do projeto
`pallgafprdnswzigomyl` (a anon key é pública por design; quem protege os dados é o
RLS + login). Para apontar para outro projeto, crie um `.env`:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Publicar (host estático)

Qualquer um serve o `dist/`:

- **Vercel:** `Framework preset: Vite`, `Root directory: web`, build `npm run build`, output `dist`.
- **Netlify / Cloudflare Pages:** base `web`, build `npm run build`, publish `web/dist`.
- **GitHub Pages:** publique o conteúdo de `web/dist` (o `base: "./"` do Vite já deixa os caminhos relativos).

Crie o usuário de login em **Supabase → Authentication → Users → Add user**
(marque *Auto Confirm*).
