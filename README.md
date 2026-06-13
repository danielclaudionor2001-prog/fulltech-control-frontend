# Fulltech Control Frontend

Antes de comecar novos desenvolvimentos, consulte junto com a IA o repositorio de documentacao chamado `fulltech-control-wiki-code`.

## Visao geral

Aplicacao SPA em React + Vite responsavel por:

- autenticacao com Clerk no cliente;
- roteamento entre paineis admin, supervisor e tecnico;
- operacao de ordens de servico;
- conclusao tecnica com anexos e assinatura;
- mapa da equipe;
- exportacao do PDF da OS no navegador.

## Scripts principais

```bash
npm install
npm run build
npm run lint
```

Para desenvolvimento manual local, o projeto tambem possui:

```bash
npm run dev
```

## Variaveis importantes

- `VITE_API_BASE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

## Arquivos importantes

- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/pages/AdminDashboard.jsx`
- `src/pages/TechnicianDashboard.jsx`
- `src/pages/OSForm.jsx`
- `src/pages/MapPage.jsx`
- `src/components/TechnicianConclusionModal.jsx`
- `src/utils/serviceOrderPdf.js`
- `src/utils/locationSupport.js`

## Regra de documentacao

Sempre que alterar fluxo de OS, localizacao, anexos, PDF, auth ou navegacao, atualize tambem o repositorio `fulltech-control-wiki-code`.
