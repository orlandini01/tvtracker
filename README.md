# TrackerTV

App estilo TV Time/Letterboxd pra acompanhar filmes e séries com os
amigos: o que você já assistiu, o que quer assistir, notas, comentários,
listas, calendário de lançamentos, recomendações e um "Wrapped" anual —
tudo isso puxando dados reais do TMDB.

## Funcionalidades

- **Conta e login**: cadastro/login com senha (hash bcrypt), sessão via
  JWT + refresh token, recuperação de senha por email, edição de perfil
  e upload de avatar.
- **Busca e descoberta**: busca de filmes/séries no TMDB (cross-idioma),
  filtros avançados (gênero, ano, nota, provedor de streaming), detalhe
  completo com trailer e elenco.
- **Minha lista**: marcar como favorito, "quero assistir"/"assistindo"/
  "assistido", nota, progresso por temporada/episódio (com nota por
  episódio), contador de rewatch.
- **Social**: amigos (pedir/aceitar/recusar), feed de atividades,
  comentários (com marcação de spoiler), comparação de gosto entre
  amigos, perfil público compartilhável.
- **Listas**: listas customizadas próprias e colaborativas.
- **Calendário**: próximos lançamentos de filmes/episódios dos títulos
  que você acompanha, com exportação `.ics` e link direto pro Google
  Agenda.
- **Watch party**: marcar uma sessão com amigos, convite/confirmação e
  lembrete automático por email.
- **Recomendações**: sugestões personalizadas com base no seu histórico
  e recomendações por humor (feliz, triste, emocionante, assustador,
  relaxante, reflexivo).
- **Engajamento**: conquistas/emblemas, diário cronológico, estatísticas
  avançadas, roleta pra decidir o que assistir, desafios sazonais,
  Wrapped anual com card compartilhável (canvas) pra postar nas redes.
- **Notificações**: notificação in-app e push (Web Push) de novos
  episódios, com preferência de email configurável.
- **Outros**: tema claro/escuro, PWA instalável (funciona como app no
  celular/desktop), i18n completo em português, inglês e italiano.

## Stack

**Backend**: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL, JWT
(access token + refresh cookie httpOnly), APScheduler pra jobs
periódicos (checagem de episódios novos e lembretes de watch party),
proxy com cache pro TMDB.

**Frontend**: React + TypeScript + Vite, Tailwind CSS v4, React Query,
i18next (pt/en/it), React Router.

## Segurança

Requisito não-negociável do projeto desde o início:

- Senhas nunca em texto puro — hash com bcrypt (`passlib`).
- Proteção contra SQL injection — todo acesso ao banco via SQLAlchemy
  ORM/queries parametrizadas, nunca SQL concatenado.
- Segredos fora do código — chaves de API, `SECRET_KEY`, credenciais de
  email e chaves VAPID só existem em variáveis de ambiente (`.env`,
  nunca commitado — ver `.gitignore`).
- Validação de entrada — schemas Pydantic em todos os endpoints.
- HTTPS em produção — cookies com `Secure`/`SameSite` ajustados pra
  cross-domain (ver `DEPLOY.md`).
- CI (`.github/workflows/ci.yml`) roda `pip-audit` e `npm audit` a cada
  push pra flagar dependências vulneráveis.

## Rodando localmente

Pré-requisitos: Docker, Python 3.12+, Node 20+.

```powershell
# 1. Banco de dados (Postgres via Docker)
cd tvtracker
docker compose up -d db

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edite o .env: pelo menos TMDB_API_KEY e SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (em outro terminal)
cd frontend
npm install
copy .env.example .env
npm run dev
```

Backend em `http://localhost:8000` (docs em `/docs`), frontend em
`http://localhost:5173`.

### Variáveis de ambiente

`backend/.env.example` traz todas as chaves necessárias: `DATABASE_URL`,
`SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`,
`TMDB_API_KEY`, `TMDB_API_BASE_URL`, `CORS_ORIGINS`, `ENVIRONMENT`,
configuração de SMTP (`SMTP_HOST/PORT/USER/PASSWORD/FROM`) pra emails de
recuperação de senha e lembrete de watch party, `FRONTEND_URL`,
`EPISODE_CHECK_INTERVAL_HOURS` e as chaves de push
(`VAPID_PUBLIC_KEY/PRIVATE_KEY/CLAIMS_EMAIL`).

`frontend/.env.example` só precisa de `VITE_API_BASE_URL`.

## Estrutura do repositório

```
tvtracker/
├── backend/
│   ├── app/
│   │   ├── api/        # rotas (auth, media, library, friends, feed,
│   │   │               #   comments, notifications, wrapped,
│   │   │               #   recommendations, lists, calendar, profile,
│   │   │               #   achievements, diary, stats, roulette,
│   │   │               #   challenges, push, watch_party...)
│   │   ├── core/        # config, segurança, dependências
│   │   ├── db/          # sessão e base do SQLAlchemy
│   │   ├── models/      # modelos ORM
│   │   ├── schemas/     # schemas Pydantic
│   │   ├── scripts/     # scripts utilitários (ex: gerar chaves VAPID)
│   │   └── services/    # regras de negócio
│   └── alembic/         # migrations
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/     # Auth, Theme
│       ├── i18n/        # locales pt/en/it
│       ├── lib/         # clients de API
│       └── pages/       # uma página por feature
└── docker-compose.yml   # só o Postgres local
```
