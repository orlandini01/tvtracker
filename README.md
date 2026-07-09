# TrackerTV — Fase 1.0 (scaffolding)

Tracker de séries/filmes estilo TV Time, para uso entre amigos. Este é o
esqueleto inicial do projeto: backend FastAPI + frontend React, prontos
para rodar localmente, sem nenhuma feature de produto ainda — isso vem
nas próximas fases.

## Stack

- Backend: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL
- Frontend: React + TypeScript (Vite) + Tailwind v4 + React Query + i18next (PT/EN/IT)
- Auth (fase 1.1): JWT com hash de senha via passlib/bcrypt
- Dev local: Postgres via Docker Compose, backend e frontend rodando direto na máquina (hot-reload)

## Pré-requisitos (Windows)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Python 3.12+ (`python --version` no PowerShell)
- Node 20+ (`node --version` no PowerShell)
- Uma chave de API do TMDB (grátis): https://www.themoviedb.org/settings/api

## Passo a passo (PowerShell)

### 1. Subir o Postgres

```powershell
cd tvtracker
docker compose up -d db
docker compose ps    # confirma que "db" está "healthy"
```

### 2. Configurar e rodar o backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

copy .env.example .env
# abra o .env e troque SECRET_KEY por um valor aleatório
# (ex: python -c "import secrets; print(secrets.token_hex(32))")
# e cole sua chave do TMDB em TMDB_API_KEY

uvicorn app.main:app --reload
```

Deixe esse terminal aberto. A API sobe em `http://localhost:8000`.

**Teste rápido**: abra `http://localhost:8000/docs` no navegador — deve
aparecer a documentação Swagger da API. Abra também
`http://localhost:8000/health` — deve responder `{"status":"ok"}`.

### 3. Configurar e rodar o frontend

Em **outro** terminal PowerShell:

```powershell
cd tvtracker\frontend
copy .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador.

## Teste de UI da Fase 1.0 (critério de aceite)

1. Com backend e frontend rodando, abrir `http://localhost:5173`.
2. A página deve mostrar o título "TrackerTV" e uma caixa de status do
   backend em **verde** com o texto "Backend conectado (status: ok)".
   Se aparecer vermelho, o frontend não está conseguindo falar com o
   backend — confira se o backend está rodando e se `CORS_ORIGINS` no
   `.env` do backend inclui `http://localhost:5173`.
3. Clicar nos botões PT / EN / IT no topo da página — o título e o
   texto abaixo dele devem trocar de idioma imediatamente, sem recarregar
   a página.
4. Abrir o DevTools do navegador (F12) → aba Network → clicar em
   `health` → conferir que a chave do TMDB **não aparece em nenhum
   lugar** da requisição (ainda não é usada nesta fase, mas o hábito de
   checar isso começa agora).
5. Parar o backend (Ctrl+C no terminal dele) e recarregar o frontend —
   a caixa de status deve virar **vermelha** com "Não foi possível falar
   com o backend". Isso confirma que o tratamento de erro funciona.

Se os 5 passos acima passarem, a Fase 1.0 está validada e podemos seguir
para a Fase 1.1 (autenticação).

## Segurança — já ativo nesta fase

- Segredos (chave do TMDB, `SECRET_KEY`) só existem em `.env`, que está
  no `.gitignore` — nunca vai pro Git. Só os `.env.example` (sem valores
  reais) são versionados.
- CORS do backend restrito explicitamente a `http://localhost:5173`,
  nunca `*`.
- CI (`.github/workflows/ci.yml`) já roda `pip-audit` e `npm audit` a
  cada push, para pegar dependências vulneráveis cedo.

## Estrutura do repositório

```
tvtracker/
  backend/           FastAPI (app/), Alembic (alembic/), requirements.txt, Dockerfile
  frontend/          React + Vite + Tailwind (src/)
  docker-compose.yml Postgres local
  .github/workflows/ CI (lint/build/audit)
```

## Próxima fase

Fase 1.1 — Autenticação (signup/login/logout com JWT e hash de senha).
Veja o documento de arquitetura completo (`arquitetura-fase1.md`) para o
plano das próximas sub-fases.
