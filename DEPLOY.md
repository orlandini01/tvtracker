# Publicando o TrackerTV de verdade (Render + Vercel)

Guia pra colocar o app no ar pra você e seus amigos acessarem de qualquer
lugar — não só no seu computador. Backend + banco de dados ficam no
Render (pago, ~US$13-15/mês no total, sem "esfriar" quando ninguém usa);
o frontend fica no Vercel (gratuito).

Custo estimado: Web Service Starter (~US$7/mês) + Postgres básico
(~US$6-8/mês) = por volta de **US$13-15/mês** (uns R$70-85/mês).

## Antes de começar

Você vai precisar, à mão:
- Sua chave de API do TMDB (a mesma que já usa em dev).
- Uma senha de app do Gmail pra enviar email de verdade (se ainda não
  configurou, veja o comentário no `.env.example` do backend — é rápido).
- O repositório já commitado e no GitHub (já está).

## Passo 1 — Backend + banco no Render

O jeito mais rápido é usar o `render.yaml` que já está na raiz do
projeto (um "Blueprint" — o Render lê esse arquivo e cria o Web Service
e o banco de dados de uma vez só).

1. Crie uma conta em https://render.com (dá pra entrar direto com o
   GitHub).
2. No painel, clique em **New** → **Blueprint**.
3. Conecte o repositório `tvtracker` do seu GitHub.
4. O Render vai ler o `render.yaml` e mostrar o que vai criar: um banco
   Postgres (`trackertv-db`) e um Web Service (`trackertv-backend`).
   Alguns campos vêm marcados como "vazios de propósito" — preencha:
   - `TMDB_API_KEY`: sua chave do TMDB.
   - `CORS_ORIGINS`: por enquanto deixe `https://placeholder.vercel.app`
     — você troca pelo valor real depois do Passo 4 (é normal, o
     frontend ainda não existe nesse momento).
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`: seus dados do Gmail
     (`smtp.gmail.com`, seu email, a senha de app).
   - `SMTP_FROM`: `TrackerTV <seu-email@gmail.com>`.
   - `FRONTEND_URL`: mesma coisa do CORS_ORIGINS por enquanto, ajusta
     depois.
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CLAIMS_EMAIL`:
     deixe em branco por agora — geramos no Passo 3.
   - `SECRET_KEY` já é gerado sozinho pelo Render (`generateValue`), não
     precisa mexer.
5. Clique em **Apply** e aguarde o build (uns 3-5 minutos na primeira
   vez).
6. Quando o serviço `trackertv-backend` ficar "Live", copie a URL dele
   (algo como `https://trackertv-backend.onrender.com`) — vai precisar
   dela no Passo 4.

**Se preferir criar tudo manualmente** (sem Blueprint): New → PostgreSQL
(plano pago, guarda a "Internal Database URL"), depois New → Web
Service → aponte pro repo, Root Directory `backend`, Runtime Docker, e
cole as mesmas variáveis de ambiente acima manualmente, usando a
Internal Database URL do banco como `DATABASE_URL`.

## Passo 2 — Rodar as migrations em produção

O banco acabou de nascer vazio — precisa criar as tabelas.

No painel do Render, abra o serviço `trackertv-backend` → aba **Shell**
→ rode:

```
alembic upgrade head
```

## Passo 3 — Gerar chaves VAPID de produção

**Nunca reaproveite as chaves VAPID do seu `.env` local** — gere um par
novo só pra produção, na mesma aba Shell do Render:

```
python -m app.scripts.gen_vapid_keys
```

Copie as duas linhas impressas e cole em **Environment** → edite
`VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` com esses valores. O serviço
reinicia sozinho depois de salvar.

## Passo 4 — Frontend no Vercel

1. Crie uma conta em https://vercel.com (dá pra entrar com o GitHub).
2. **Add New** → **Project** → selecione o repositório `tvtracker`.
3. Em **Root Directory**, escolha `frontend`.
4. Em **Environment Variables**, adicione:
   - `VITE_API_BASE_URL` = a URL do backend do Passo 1 (ex:
     `https://trackertv-backend.onrender.com`, **sem** barra no final).
5. Clique em **Deploy**.
6. Quando terminar, copie a URL final (algo como
   `https://tvtracker.vercel.app`).

## Passo 5 — Fechar o ciclo: atualizar CORS no backend

Volte no Render, no serviço `trackertv-backend` → **Environment**:
- `CORS_ORIGINS` = a URL real do Vercel (ex:
  `https://tvtracker.vercel.app`, sem barra no final).
- `FRONTEND_URL` = a mesma URL.

Salve — o backend reinicia sozinho. Agora os dois lados sabem um do
outro.

## Passo 6 — Testar

Abra a URL do Vercel, crie uma conta, confirme que:
- Login/signup funciona e a sessão sobrevive a um F5 (é exatamente o
  cookie cross-domain que ajustamos no código antes de publicar).
- Busca de filme/série funciona (confirma que o TMDB_API_KEY está ok).
- "Esqueci minha senha" chega no email de verdade.
- Notificação push ativa sem erro no Perfil.

## Sobre o banco de dados de teste

Você não precisa "limpar" nada em produção — ele nasce vazio, direto do
Passo 2. O banco com os dados de teste que você via nas capturas de tela
é só o Postgres local (Docker), separado. Se quiser zerar ele também pra
continuar desenvolvendo com uma base limpa:

```powershell
cd tvtracker
docker compose down -v
docker compose up -d db
docker compose ps
cd backend
alembic upgrade head
```

Isso derruba o volume do Postgres local (apaga tudo) e recria as tabelas
do zero a partir das migrations — sem nenhum usuário/filme/comentário de
teste sobrando.
