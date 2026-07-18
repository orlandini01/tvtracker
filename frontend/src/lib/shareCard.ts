import type { WrappedResponse } from "./wrapped";

// Card compartilhável do Wrapped, gerado 100% no cliente via Canvas —
// evita a fragilidade de renderizar isso no backend (Python/Pillow
// precisaria de fontes instaladas no servidor; aqui reaproveitamos a
// fonte Inter que o navegador já carregou pro resto do app). Formato
// "story" (9:16), o mesmo usado por Instagram/WhatsApp status.
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  } catch {
    // Sem logo não é motivo pra falhar o card inteiro.
    return null;
  }
}

export async function generateWrappedShareCard(data: WrappedResponse, username: string): Promise<Blob> {
  // Garante que a Inter já carregou antes de desenhar texto — sem isso o
  // primeiro desenho pode sair com a fonte de fallback do sistema.
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado");

  // Fundo: gradiente roxo escuro -> preto, igual ao card do Wrapped na UI.
  const bgGradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGradient.addColorStop(0, "#2e1065");
  bgGradient.addColorStop(0.45, "#150a2e");
  bgGradient.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const centerX = CARD_WIDTH / 2;

  // Logo + nome do app.
  const logo = await loadImage("/icon-192.png");
  let headerY = 140;
  if (logo) {
    const logoSize = 96;
    ctx.drawImage(logo, centerX - logoSize / 2, headerY - logoSize + 20, logoSize, logoSize);
    headerY += 40;
  }
  ctx.fillStyle = "#e5d9ff";
  ctx.font = "600 34px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TRACKERTV", centerX, headerY + 60);

  // "Wrapped {ano}" + username.
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 88px Inter, sans-serif";
  ctx.fillText(`Wrapped ${data.year}`, centerX, headerY + 190);

  ctx.fillStyle = "#c4a6ff";
  ctx.font = "500 40px Inter, sans-serif";
  ctx.fillText(`@${username}`, centerX, headerY + 250);

  // Bloco central: total de horas assistidas.
  const hoursBlockY = headerY + 330;
  roundedRect(ctx, 80, hoursBlockY, CARD_WIDTH - 160, 300, 32);
  ctx.fillStyle = "rgba(147, 51, 234, 0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#d8b4fe";
  ctx.font = "500 32px Inter, sans-serif";
  ctx.fillText("HORAS ASSISTIDAS", centerX, hoursBlockY + 70);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 150px Inter, sans-serif";
  ctx.fillText(String(data.total_hours), centerX, hoursBlockY + 220);

  // Linha de 3 estatísticas: filmes / séries / episódios.
  const statsY = hoursBlockY + 380;
  const stats: [string, string][] = [
    [String(data.total_movies), "FILMES"],
    [String(data.total_shows), "SÉRIES"],
    [String(data.total_episodes), "EPISÓDIOS"],
  ];
  const statWidth = (CARD_WIDTH - 160) / 3;
  stats.forEach(([value, label], idx) => {
    const x = 80 + statWidth * idx + statWidth / 2;
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 70px Inter, sans-serif";
    ctx.fillText(value, x, statsY);
    ctx.fillStyle = "#a78bfa";
    ctx.font = "500 26px Inter, sans-serif";
    ctx.fillText(label, x, statsY + 44);
  });

  // Top gêneros (chips de texto).
  let cursorY = statsY + 140;
  if (data.top_genres.length > 0) {
    ctx.fillStyle = "#e5d9ff";
    ctx.font = "600 32px Inter, sans-serif";
    ctx.fillText("GÊNEROS MAIS ASSISTIDOS", centerX, cursorY);
    cursorY += 60;

    const topGenres = data.top_genres.slice(0, 3);
    ctx.font = "500 34px Inter, sans-serif";
    const chipPadding = 28;
    const chipHeight = 64;
    const gap = 18;
    const widths = topGenres.map((g) => ctx.measureText(`${g.name}`).width + chipPadding * 2);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (topGenres.length - 1);
    let chipX = centerX - totalWidth / 2;
    topGenres.forEach((g, idx) => {
      const w = widths[idx];
      roundedRect(ctx, chipX, cursorY, w, chipHeight, chipHeight / 2);
      ctx.fillStyle = idx === 0 ? "#9333ea" : "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(g.name, chipX + w / 2, cursorY + chipHeight / 2 + 12);
      chipX += w + gap;
    });
    cursorY += chipHeight + 70;
  }

  // Destaques: título mais assistido / filme favorito (só texto, sem
  // pôster — evita depender do TMDB liberar CORS pra imagem em canvas).
  const highlights: [string, string][] = [];
  if (data.top_show) highlights.push(["SÉRIE DO ANO", data.top_show.title]);
  if (data.top_movie) highlights.push(["FILME DO ANO", data.top_movie.title]);

  for (const [label, title] of highlights) {
    ctx.fillStyle = "#a78bfa";
    ctx.font = "600 28px Inter, sans-serif";
    ctx.fillText(label, centerX, cursorY);
    cursorY += 48;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px Inter, sans-serif";
    ctx.fillText(title, centerX, cursorY, CARD_WIDTH - 160);
    cursorY += 80;
  }

  // Rodapé.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "500 28px Inter, sans-serif";
  ctx.fillText("trackertv", centerX, CARD_HEIGHT - 70);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao gerar imagem do card"));
    }, "image/png");
  });
}

// Tenta o Web Share API (comum em celular — abre direto o menu de
// compartilhar do sistema); se não suportado, cai pro download comum.
export async function shareOrDownloadCard(blob: Blob, filename: string, shareText: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "TrackerTV Wrapped", text: shareText });
      return "shared";
    } catch {
      // Usuário cancelou o compartilhamento (ou falhou) — cai pro download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
