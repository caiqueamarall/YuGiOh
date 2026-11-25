import type { Player, Tournament, DeckCardItem } from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  calculateTournamentStandings,
  getTiebreakExplanations,
  sortPlayersForLeague,
  getLeagueTiebreakExplanations,
  getTournamentTopCut,
} from './swissEngine';
import {
  getEdisonCardByName,
  getCardCategory,
  getCardBanlistLimit,
} from './cardDatabase';

/**
 * Utilitário para desenhar retângulos com cantos arredondados no Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Quebra texto em múltiplas linhas para não vazar nem ser cortado no Canvas
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Função auxiliar para disparar o download ou compartilhamento da imagem PNG gerada
 */
async function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const fileNameWithExt = `${filename}.png`;

  // 1. Prioridade no App Nativo (Android APK / iOS): Salva no Cache e abre o Share Sheet nativo
  if (Capacitor.isNativePlatform()) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      const fileResult = await Filesystem.writeFile({
        path: fileNameWithExt,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: filename,
        text: `Yu-Gi-Oh! Edison League - ${filename}`,
        url: fileResult.uri,
        dialogTitle: 'Salvar ou Compartilhar Imagem PNG',
      });
      return;
    } catch (nativeErr) {
      console.warn('Erro ao salvar/compartilhar via Capacitor:', nativeErr);
    }
  }

  // 2. Web Share API para navegadores móveis (Chrome Mobile / Safari iOS)
  if (canvas.toBlob && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], fileNameWithExt, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
          });
          return;
        }
      }
    } catch (shareErr) {
      console.warn('Web Share API falhou, usando download convencional:', shareErr);
    }
  }

  // 3. Fallback clássico para navegadores Desktop (PC)
  if (canvas.toBlob) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameWithExt;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  } else {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileNameWithExt;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export type InstagramExportFormat = 'square' | 'vertical';

/**
 * Exibe um modal minimalista para o usuário escolher entre o Formato Quadrado (1:1)
 * e o Formato Reto da Tela (9:16) antes de exportar o PNG para o Instagram.
 */
function showInstagramFormatSelector(
  title: string,
  onSelect: (format: InstagramExportFormat) => void
): void {
  const existing = document.getElementById('ig-format-selector-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'ig-format-selector-modal';
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 4000;
    box-sizing: border-box;
    animation: fadeIn 150ms ease-out;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    width: 100%;
    max-width: 420px;
    background: #FFFFFF;
    border-radius: 22px;
    border: 1.5px solid #E2E8F0;
    box-shadow: 0 24px 50px -10px rgba(15, 23, 42, 0.28);
    overflow: hidden;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0F172A;
    animation: scaleUp 180ms ease-out;
  `;

  card.innerHTML = `
    <div style="padding: 16px 20px; border-bottom: 1px solid #EEF2F6; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div>
        <div style="font-size: 10.5px; font-weight: 800; color: #059669; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 2px;">
          EXPORTAÇÃO PARA INSTAGRAM
        </div>
        <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0F172A;">
          ${title}
        </h3>
      </div>
      <button type="button" id="ig-format-close-btn" style="width: 32px; height: 32px; border-radius: 50%; background: #F1F5F9; border: none; color: #64748B; font-size: 18px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center;">
        ✕
      </button>
    </div>

    <div style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; background: #F8FAFC;">
      <p style="margin: 0 0 2px 0; font-size: 12.5px; color: #64748B; line-height: 1.4;">
        Escolha o formato e proporção da imagem PNG:
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <button type="button" id="ig-btn-format-square" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 18px 12px; background: #FFFFFF; border: 2px solid #A7F3D0; border-radius: 16px; cursor: pointer; transition: all 0.15s ease; text-align: center; box-shadow: 0 4px 12px rgba(6, 60, 53, 0.06);">
          <div style="width: 46px; height: 46px; border-radius: 10px; background: #ECFDF5; border: 2px solid #0D6E62; display: flex; align-items: center; justify-content: center; color: #063C35; font-weight: 800; font-size: 11px;">
            1:1
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">
              Formato Quadrado
            </div>
            <div style="font-size: 11px; color: #059669; font-weight: 700;">
              2160 × 2160 px (Ultra HD)
            </div>
            <div style="font-size: 10.5px; color: #64748B; margin-top: 3px;">
              Feed do Instagram
            </div>
          </div>
        </button>

        <button type="button" id="ig-btn-format-vertical" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 18px 12px; background: #FFFFFF; border: 2px solid #A7F3D0; border-radius: 16px; cursor: pointer; transition: all 0.15s ease; text-align: center; box-shadow: 0 4px 12px rgba(6, 60, 53, 0.06);">
          <div style="width: 32px; height: 52px; border-radius: 8px; background: #ECFDF5; border: 2px solid #0D6E62; display: flex; align-items: center; justify-content: center; color: #063C35; font-weight: 800; font-size: 10.5px;">
            9:16
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">
              Reto da Tela
            </div>
            <div style="font-size: 11px; color: #059669; font-weight: 700;">
              2160 × 3840 px (4K HD)
            </div>
            <div style="font-size: 10.5px; color: #64748B; margin-top: 3px;">
              Stories &amp; Tela Cheia
            </div>
          </div>
        </button>
      </div>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  card.querySelector('#ig-format-close-btn')?.addEventListener('click', close);

  card.querySelector('#ig-btn-format-square')?.addEventListener('click', () => {
    close();
    onSelect('square');
  });

  card.querySelector('#ig-btn-format-vertical')?.addEventListener('click', () => {
    close();
    onSelect('vertical');
  });
}

// Pré-carrega a nova logo oficial "Duel League" em memória para uso imediato nas exportações PNG
let cachedBrandLogoImg: HTMLImageElement | null = null;
if (typeof window !== 'undefined') {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const baseUrl = (import.meta as unknown as { env?: { BASE_URL?: string } })?.env?.BASE_URL || './';
  img.src = `${baseUrl}duel-league-logo.png`;
  img.onload = () => {
    cachedBrandLogoImg = img;
  };
}

/**
 * Desenha a logo oficial "Duel League" com borda branca diretamente sobre o banner escuro
 */
function drawMillenniumEmblem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();

  if (cachedBrandLogoImg && cachedBrandLogoImg.complete && cachedBrandLogoImg.naturalWidth > 0) {
    const scale = Math.min(size / cachedBrandLogoImg.naturalWidth, size / cachedBrandLogoImg.naturalHeight);
    const drawW = cachedBrandLogoImg.naturalWidth * scale;
    const drawH = cachedBrandLogoImg.naturalHeight * scale;
    const drawX = x + (size - drawW) / 2;
    const drawY = y + (size - drawH) / 2;
    ctx.drawImage(cachedBrandLogoImg, drawX, drawY, drawW, drawH);
    ctx.restore();
    return;
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRect(ctx, x, y, size, size, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, size, size, 14);
  ctx.stroke();

  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.34;

  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy + r * 0.85);
  ctx.lineTo(cx - r, cy + r * 0.85);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.15, r * 0.36, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.15, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Desenha um card de Pódio horizontal (largura total, empilhado um abaixo do outro)
 * com arte elaborada (medalhão metálico, faixas diagonais sutis, badge do deck e painel de métricas à direita).
 */
function drawElaborateStackedPodiumCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rank: number,
  playerName: string,
  deckName: string,
  pointsText: string,
  recordText: string,
  extraStatText: string,
  _isLeague: boolean
) {
  ctx.save();

  // Paleta por colocação: 1º Lugar = Dourado Imperial, 2º Lugar = Prata Real, 3º Lugar = Bronze Nobre, 4º+ = Esmeralda
  let bgStart = '#FFFDF0';
  let bgMid = '#FEF3C7';
  let bgEnd = '#FDE68A';
  let borderCol = '#D97706';
  let accentStart = '#F59E0B';
  let accentEnd = '#B45309';
  let medalOuter = '#FDE68A';
  let medalInnerStart = '#F59E0B';
  let medalInnerEnd = '#B45309';
  let titleText = `${rank}º LUGAR`;
  let titleColor = '#92400E';
  let statBoxBg = 'rgba(255, 255, 255, 0.88)';
  let statBoxBorder = '#F59E0B';
  let ptsColor = '#B45309';
  let deckTextColor = '#92400E';

  if (rank === 2) {
    bgStart = '#F8FAFC';
    bgMid = '#F1F5F9';
    bgEnd = '#E2E8F0';
    borderCol = '#94A3B8';
    accentStart = '#64748B';
    accentEnd = '#334155';
    medalOuter = '#E2E8F0';
    medalInnerStart = '#64748B';
    medalInnerEnd = '#334155';
    titleText = '2º LUGAR';
    titleColor = '#334155';
    statBoxBg = 'rgba(255, 255, 255, 0.88)';
    statBoxBorder = '#CBD5E1';
    ptsColor = '#334155';
    deckTextColor = '#334155';
  } else if (rank === 3) {
    bgStart = '#FFF7ED';
    bgMid = '#FFEDD5';
    bgEnd = '#FED7AA';
    borderCol = '#EA580C';
    accentStart = '#EA580C';
    accentEnd = '#9A3412';
    medalOuter = '#FED7AA';
    medalInnerStart = '#EA580C';
    medalInnerEnd = '#9A3412';
    titleText = '3º LUGAR';
    titleColor = '#9A3412';
    statBoxBg = 'rgba(255, 255, 255, 0.88)';
    statBoxBorder = '#FDBA74';
    ptsColor = '#9A3412';
    deckTextColor = '#9A3412';
  } else if (rank > 3) {
    bgStart = '#F0FDF4';
    bgMid = '#ECFDF5';
    bgEnd = '#D1FAE5';
    borderCol = '#10B981';
    accentStart = '#059669';
    accentEnd = '#063C35';
    medalOuter = '#A7F3D0';
    medalInnerStart = '#059669';
    medalInnerEnd = '#063C35';
    titleText = `${rank}º LUGAR`;
    titleColor = '#065F46';
    statBoxBg = 'rgba(255, 255, 255, 0.88)';
    statBoxBorder = '#A7F3D0';
    ptsColor = '#065F46';
    deckTextColor = '#063C35';
  }

  // 1. Corpo com Degradê Metálico Suave + Clip para texturas internas
  roundRect(ctx, x, y, w, h, 18);
  const cardGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  cardGrad.addColorStop(0, bgStart);
  cardGrad.addColorStop(0.55, bgMid);
  cardGrad.addColorStop(1, bgEnd);
  ctx.fillStyle = cardGrad;
  ctx.fill();

  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.clip();

  // Faixas diagonais decorativas sutis de fundo (estilo card colecionável)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 18;
  for (let i = -h; i < w + h; i += 64) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i - h, y + h);
    ctx.stroke();
  }

  // Círculo decorativo translúcido à direita
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(x + w - 90, y + h / 2, h * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Barra lateral esquerda de destaque
  const barGrad = ctx.createLinearGradient(x, y, x, y + h);
  barGrad.addColorStop(0, accentStart);
  barGrad.addColorStop(1, accentEnd);
  ctx.fillStyle = barGrad;
  ctx.fillRect(x, y, 12, h);

  ctx.restore();

  // Borda externa nítida
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = rank === 1 ? 2.5 : 1.8;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();

  // 2. Medalhão Metálico à Esquerda
  const medalR = Math.min(36, Math.floor(h * 0.31));
  const medalCX = x + 28 + medalR;
  const medalCY = y + h / 2;

  // Halo externo do medalhão
  ctx.fillStyle = medalOuter;
  ctx.beginPath();
  ctx.arc(medalCX, medalCY, medalR + 5, 0, Math.PI * 2);
  ctx.fill();

  // Círculo principal do medalhão
  const medalGrad = ctx.createLinearGradient(medalCX - medalR, medalCY - medalR, medalCX + medalR, medalCY + medalR);
  medalGrad.addColorStop(0, medalInnerStart);
  medalGrad.addColorStop(1, medalInnerEnd);
  ctx.fillStyle = medalGrad;
  ctx.beginPath();
  ctx.arc(medalCX, medalCY, medalR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(medalCX, medalCY, medalR - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${Math.round(medalR * 0.68)}px "Outfit", -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${rank}º`, medalCX, medalCY + 1);
  ctx.textBaseline = 'alphabetic';

  // 3. Painel Direito de Estatísticas (Pontuação em Destaque + V-E-D + Métrica Extra)
  const statW = 248;
  const statH = Math.min(h - 22, 96);
  const statX = x + w - statW - 18;
  const statY = y + (h - statH) / 2;

  // 4. Coluna Central: Colocação ("1º LUGAR") e Nome do Duelista à esquerda/centro,
  // e a Pílula do Deck ajustada dinamicamente ao texto, com margem segura para a caixa de pontuação
  const leftBound = medalCX + medalR + 18;
  const centerY = y + h / 2;

  const maxNameChars = 20;
  const cleanPlayerName =
    playerName.length > maxNameChars ? playerName.substring(0, maxNameChars - 1) + '…' : playerName;
  const cleanDeck = deckName.length > 22 ? deckName.substring(0, 21) + '…' : deckName;

  // Mede o texto puro do deck + espaço separado para o ícone de escudo
  let deckFontSize = 15.5;
  ctx.font = `800 ${deckFontSize}px "Outfit", -apple-system, sans-serif`;
  let deckPureTextW = ctx.measureText(cleanDeck).width;
  if (deckPureTextW > 185) {
    deckFontSize = 13.5;
    ctx.font = `800 ${deckFontSize}px "Outfit", -apple-system, sans-serif`;
    deckPureTextW = ctx.measureText(cleanDeck).width;
  }

  const iconSlotW = 22; // espaço para o escudo + gap
  const pillPadX = 28;  // 14px de cada lado
  const deckPillW = Math.min(245, Math.max(136, Math.ceil(deckPureTextW + iconSlotW + pillPadX)));
  const deckPillH = 38;

  // Posiciona a pílula do Deck com 18px de respiro para a caixa de pontuação à direita
  const deckRightGap = 18;
  const deckPillX = statX - deckRightGap - deckPillW;
  const deckPillY = centerY - deckPillH / 2;

  // Área disponível entre o medalhão esquerdo e a pílula do deck para centralizar "1º LUGAR" + Nome do Participante
  const playerAreaLeft = leftBound;
  const playerAreaRight = deckPillX - 16;
  const playerAreaW = Math.max(120, playerAreaRight - playerAreaLeft);
  const playerCenterX = playerAreaLeft + playerAreaW / 2;

  // Título da colocação ("1º LUGAR", "2º LUGAR", "3º LUGAR") centralizado sobre o nome
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = '800 13px "Outfit", -apple-system, sans-serif';
  ctx.fillText(titleText, playerCenterX, centerY - 17);

  // Nome do Participante com fonte grande centralizado abaixo do título
  let nameFontSize = 34;
  ctx.font = `900 ${nameFontSize}px "Outfit", -apple-system, sans-serif`;
  if (ctx.measureText(cleanPlayerName).width > playerAreaW - 8) {
    nameFontSize = 27;
    ctx.font = `900 ${nameFontSize}px "Outfit", -apple-system, sans-serif`;
  }
  if (ctx.measureText(cleanPlayerName).width > playerAreaW - 4) {
    nameFontSize = 22;
    ctx.font = `900 ${nameFontSize}px "Outfit", -apple-system, sans-serif`;
  }
  ctx.fillStyle = '#0F172A';
  ctx.fillText(cleanPlayerName, playerCenterX, centerY + 19);

  // Desenha a Pílula do Deck com clipping interno para nunca vazar das bordas
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  roundRect(ctx, deckPillX, deckPillY, deckPillW, deckPillH, 19);
  ctx.fill();
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.6;
  roundRect(ctx, deckPillX, deckPillY, deckPillW, deckPillH, 19);
  ctx.stroke();

  roundRect(ctx, deckPillX + 2, deckPillY + 2, deckPillW - 4, deckPillH - 4, 17);
  ctx.clip();

  const totalContentW = iconSlotW + deckPureTextW;
  const contentStartX = deckPillX + (deckPillW - totalContentW) / 2;

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(deckFontSize - 1)}px "Outfit", -apple-system, sans-serif`;
  ctx.fillText('🛡️', contentStartX, centerY + 1);

  ctx.font = `800 ${deckFontSize}px "Outfit", -apple-system, sans-serif`;
  ctx.fillStyle = deckTextColor;
  ctx.fillText(cleanDeck, contentStartX + iconSlotW, centerY + 1);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  // Renderiza o Painel Direito de Estatísticas
  ctx.fillStyle = statBoxBg;
  roundRect(ctx, statX, statY, statW, statH, 14);
  ctx.fill();
  ctx.strokeStyle = statBoxBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, statX, statY, statW, statH, 14);
  ctx.stroke();

  const statCenterX = statX + statW / 2;
  const statMidY = statY + statH / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = ptsColor;
  ctx.font = '900 22px "Outfit", -apple-system, sans-serif';
  ctx.fillText(pointsText, statCenterX, statMidY - 10);

  ctx.fillStyle = '#334155';
  ctx.font = '800 12.5px "Outfit", -apple-system, sans-serif';
  ctx.fillText(recordText, statCenterX, statMidY + 11);

  ctx.fillStyle = '#64748B';
  ctx.font = '700 11px "Outfit", -apple-system, sans-serif';
  ctx.fillText(extraStatText, statCenterX, statMidY + 29);

  ctx.restore();
}

/**
 * Exporta os Resultados de um Torneio Individual como imagem PNG para Instagram
 * (Permite escolher entre Formato Quadrado 1080x1080 e Formato Reto da Tela 1080x1920)
 */
export function exportTournamentResultsPNG(
  tournament: Tournament,
  players: Player[],
  format?: InstagramExportFormat
): void {
  if (!format) {
    showInstagramFormatSelector('Exportar Resultado do Torneio', (chosenFormat) => {
      exportTournamentResultsPNG(tournament, players, chosenFormat);
    });
    return;
  }

  const standings = calculateTournamentStandings(tournament, players);
  const playerDecks = tournament.playerDecks || {};
  const tiebreakNotes = getTiebreakExplanations(standings, tournament);

  const tournDate = tournament.date
    ? (/^\d{4}-\d{2}-\d{2}/.test(tournament.date)
        ? tournament.date.substring(0, 10).split('-').reverse().join('/')
        : new Date(tournament.date).toLocaleDateString('pt-BR'))
    : '-';

  const topCut = getTournamentTopCut(tournament);
  const isVertical = format === 'vertical';

  // No formato vertical (9:16), sempre exibimos pelo menos o Top 3 (1º, 2º e 3º) um abaixo do outro
  const podiumCount = isVertical
    ? Math.min(Math.max(3, topCut), standings.length)
    : Math.min(topCut, standings.length);
  const topStandings = standings.slice(0, podiumCount);

  const TARGET_W = 1080;
  const TARGET_H = isVertical ? 1920 : 1080;
  const outerMargin = 24;
  const padding = 48;
  const contentWidth = TARGET_W - padding * 2; // 984px

  const bannerH = isVertical ? 136 : 104;
  const tableHeaderHeight = isVertical ? 46 : 40;
  const legendHeight = 26;
  const footerHeight = 46;

  // Pré-calcula linhas de desempate
  const maxTiebreakTextWidth = contentWidth - 32;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (tempCtx) {
    tempCtx.font = '12px "Outfit", -apple-system, sans-serif';
  }
  const tourTiebreakLines: string[] = [];
  if (tempCtx && tiebreakNotes.length > 0) {
    tiebreakNotes.forEach((note) => {
      const rawText = `• [${note.points} Pts] Empate entre ${note.players.join(', ')}: ${note.reasons.join(' | ')}`;
      const wrapped = wrapCanvasText(tempCtx, rawText, maxTiebreakTextWidth);
      tourTiebreakLines.push(...wrapped);
    });
  }

  const tiebreakLineHeight = isVertical ? 22 : 19;
  const tiebreakHeight =
    tiebreakNotes.length > 0 ? 38 + tourTiebreakLines.length * tiebreakLineHeight : 0;

  // No formato vertical, os cards do Top 1, 2 e 3 ficam empilhados um abaixo do outro.
  // Distribuímos a altura das seções e linhas para preencher 100% da tela de forma uniforme!
  const podiumCardGap = 12;
  let stackedCardH = 116;
  let podiumTotalH =
    topStandings.length >= 2
      ? isVertical
        ? topStandings.length * stackedCardH + (topStandings.length - 1) * podiumCardGap
        : 136
      : 0;

  const countRows = Math.max(1, standings.length);
  const baseFixedH =
    padding +
    bannerH +
    (podiumTotalH > 0 ? podiumTotalH : 0) +
    tableHeaderHeight +
    legendHeight +
    (tiebreakHeight > 0 ? tiebreakHeight : 0) +
    footerHeight +
    padding;

  // Quantidade de intervalos verticais entre blocos principais
  const numSectionGaps = 2 + (podiumTotalH > 0 ? 1 : 0) + (tiebreakHeight > 0 ? 1 : 0);

  let rowHeight = isVertical ? 44 : 36;
  let sectionGap = 16;

  if (isVertical) {
    // Calcula espaço restante e distribui entre altura dos cards do pódio, linhas da tabela e espaçamentos
    const minTableRowsH = countRows * 40;
    const leftover = TARGET_H - (baseFixedH + minTableRowsH + numSectionGaps * 16);

    if (leftover > 0) {
      // 1. Expande os cards do Top 1, 2, 3 (até 148px cada)
      if (topStandings.length >= 2) {
        const addPerCard = Math.min(32, Math.floor((leftover * 0.35) / topStandings.length));
        stackedCardH += addPerCard;
        podiumTotalH = topStandings.length * stackedCardH + (topStandings.length - 1) * podiumCardGap;
      }

      // 2. Recalcula espaço restante para as linhas da tabela e gaps (sem deixar buraco branco antes do rodapé)
      const updatedFixedH =
        padding +
        bannerH +
        (podiumTotalH > 0 ? podiumTotalH : 0) +
        tableHeaderHeight +
        legendHeight +
        (tiebreakHeight > 0 ? tiebreakHeight : 0) +
        footerHeight +
        padding;

      const availForRowsAndGaps = TARGET_H - updatedFixedH;
      const maxRowH = 110;
      rowHeight = Math.max(42, Math.min(maxRowH, Math.floor((availForRowsAndGaps - numSectionGaps * 22) / countRows)));

      const remainingAfterRows = availForRowsAndGaps - countRows * rowHeight;
      sectionGap = Math.max(16, Math.min(54, Math.floor(remainingAfterRows / numSectionGaps)));
    } else {
      const availForRows = Math.max(countRows * 34, TARGET_H - baseFixedH - numSectionGaps * 12);
      rowHeight = Math.max(34, Math.floor(availForRows / countRows));
      sectionGap = 12;
    }
  } else {
    const availForRows = Math.max(countRows * 30, TARGET_H - baseFixedH - numSectionGaps * 14);
    rowHeight = Math.max(30, Math.min(48, Math.floor(availForRows / countRows)));
    sectionGap = 14;
  }

  const tableHeight = tableHeaderHeight + standings.length * rowHeight;
  const naturalHeight =
    padding +
    bannerH +
    sectionGap +
    (podiumTotalH > 0 ? podiumTotalH + sectionGap : 0) +
    tableHeight +
    10 +
    legendHeight +
    (tiebreakHeight > 0 ? tiebreakHeight + sectionGap : 0) +
    footerHeight +
    padding;

  const workH = Math.max(TARGET_H, naturalHeight);
  const HD_SCALE = 2; // Super-resolução 2x (2160x2160 ou 2160x3840 4K) para máxima nitidez
  const workCanvas = document.createElement('canvas');
  workCanvas.width = TARGET_W * HD_SCALE;
  workCanvas.height = workH * HD_SCALE;
  const ctx = workCanvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(HD_SCALE, HD_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Fundo Externo Verde Petróleo Midway
  const bgGrad = ctx.createLinearGradient(0, 0, TARGET_W, workH);
  bgGrad.addColorStop(0, '#042F29');
  bgGrad.addColorStop(0.5, '#063C35');
  bgGrad.addColorStop(1, '#0A4F46');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, TARGET_W, workH);

  // 2. Card Principal Branco ocupando toda a moldura do post
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, outerMargin, outerMargin, TARGET_W - outerMargin * 2, workH - outerMargin * 2, 26);
  ctx.fill();

  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 2;
  roundRect(ctx, outerMargin, outerMargin, TARGET_W - outerMargin * 2, workH - outerMargin * 2, 26);
  ctx.stroke();

  let curY = padding;

  // 3. Banner Superior Midway Deep Petrol Teal
  const bannerGrad = ctx.createLinearGradient(padding, curY, TARGET_W - padding, curY + bannerH);
  bannerGrad.addColorStop(0, '#063C35');
  bannerGrad.addColorStop(0.55, '#0A4F46');
  bannerGrad.addColorStop(1, '#0D6E62');

  ctx.fillStyle = bannerGrad;
  roundRect(ctx, padding, curY, contentWidth, bannerH, 18);
  ctx.fill();

  const emblemSize = isVertical ? 66 : 54;
  drawMillenniumEmblem(ctx, padding + 20, curY + (bannerH - emblemSize) / 2, emblemSize);

  const textStartX = padding + 20 + emblemSize + 16;
  const fmtName = (tournament.format || 'Edison').toUpperCase();

  ctx.fillStyle = '#6EE7B7';
  ctx.font = `800 ${isVertical ? '12.5px' : '11.5px'} "Outfit", -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`DUEL LEAGUE • FORMATO ${fmtName} • RESULTADO OFICIAL`, textStartX, curY + (isVertical ? 38 : 30));

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${isVertical ? '28px' : '24px'} "Outfit", -apple-system, sans-serif`;
  const displayTourName = tournament.name.length > 34 ? tournament.name.substring(0, 32) + '…' : tournament.name;
  ctx.fillText(displayTourName, textStartX, curY + (isVertical ? 76 : 62));

  if (isVertical) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = '600 13px "Outfit", -apple-system, sans-serif';
    ctx.fillText(
      tournament.countsForLeague !== false ? 'Torneio Oficial da Liga • Pontuação Válida' : 'Torneio Freeplay',
      textStartX,
      curY + 106
    );
  }

  // Metadados à direita no Banner
  ctx.textAlign = 'right';
  ctx.fillStyle = '#D1FAE5';
  ctx.font = '600 12.5px "Outfit", -apple-system, sans-serif';
  ctx.fillText(`Data: ${tournDate}`, TARGET_W - padding - 20, curY + (isVertical ? 40 : 32));

  const badgeW = 205;
  const badgeH = 30;
  const badgeX = TARGET_W - padding - 20 - badgeW;
  const badgeY = curY + (isVertical ? 58 : 46);
  ctx.fillStyle = '#ECFDF5';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
  ctx.fill();

  ctx.fillStyle = '#063C35';
  ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${tournament.playerIds.length} Duelistas • ${tournament.totalRounds} Rodadas`, badgeX + badgeW / 2, badgeY + 20);
  ctx.textAlign = 'left';

  curY += bannerH + sectionGap;

  // 4. Pódio: No formato Vertical (9:16), Top 1, 2 e 3 empilhados um abaixo do outro com arte elaborada
  if (podiumTotalH > 0 && topStandings.length >= 2) {
    if (isVertical) {
      topStandings.forEach((s, idx) => {
        const rank = idx + 1;
        const deckName = playerDecks[s.playerId] || 'Edison Deck';
        const diffStr = s.gameDiff > 0 ? `+${s.gameDiff}` : `${s.gameDiff}`;
        drawElaborateStackedPodiumCard(
          ctx,
          padding,
          curY,
          contentWidth,
          stackedCardH,
          rank,
          s.playerName,
          deckName,
          `${s.matchPoints} PTS`,
          `${s.matchWins}V - ${s.matchDraws}E - ${s.matchLosses}D (Saldo ${diffStr})`,
          `OMW: ${s.omwPercentage ?? 0}% • PGW: ${s.pgwPercentage ?? 0}%`,
          false
        );
        curY += stackedCardH + (idx < topStandings.length - 1 ? podiumCardGap : 0);
      });
      curY += sectionGap;
    } else {
      const numCards = topStandings.length;
      const cardGap = numCards >= 4 ? 10 : 14;
      const cardWidth = (contentWidth - cardGap * (numCards - 1)) / numCards;
      const sqPodiumH = 136;

      topStandings.forEach((s, idx) => {
        const rank = idx + 1;
        const cX = padding + (cardWidth + cardGap) * idx;
        const cY = curY;
        const deckName = playerDecks[s.playerId] || 'Edison Deck';
        const pillW = Math.min(165, cardWidth - 16);

        let borderColor = '#EA580C';
        let ribbonStart = '#EA580C';
        let ribbonEnd = '#C2410C';
        let ribbonTitle = `${rank}º LUGAR`;
        let pillBg = '#FFEDD5';
        let pillBorder = '#FDBA74';
        let pillText = '#9A3412';

        if (rank === 1) {
          borderColor = '#F59E0B';
          ribbonStart = '#F59E0B';
          ribbonEnd = '#D97706';
          ribbonTitle = '1º LUGAR';
          pillBg = '#FEF3C7';
          pillBorder = '#FCD34D';
          pillText = '#92400E';
        } else if (rank === 2) {
          borderColor = '#94A3B8';
          ribbonStart = '#64748B';
          ribbonEnd = '#475569';
          ribbonTitle = '2º LUGAR';
          pillBg = '#F1F5F9';
          pillBorder = '#CBD5E1';
          pillText = '#334155';
        }

        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, cX, cY, cardWidth, sqPodiumH, 14);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        roundRect(ctx, cX, cY, cardWidth, sqPodiumH, 14);
        ctx.stroke();

        const ribbonGrad = ctx.createLinearGradient(cX, cY, cX + cardWidth, cY);
        ribbonGrad.addColorStop(0, ribbonStart);
        ribbonGrad.addColorStop(1, ribbonEnd);
        ctx.fillStyle = ribbonGrad;
        roundRect(ctx, cX, cY, cardWidth, 30, 14);
        ctx.fill();
        ctx.fillRect(cX, cY + 16, cardWidth, 14);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${numCards >= 4 ? '10.5px' : '11.5px'} "Outfit", -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ribbonTitle, cX + cardWidth / 2, cY + 20);

        ctx.fillStyle = '#0F172A';
        ctx.font = `800 ${numCards >= 4 ? '14.5px' : '16.5px'} "Outfit", -apple-system, sans-serif`;
        const maxNameLen = numCards >= 5 ? 13 : numCards === 4 ? 16 : 22;
        const cleanPName = s.playerName.length > maxNameLen ? s.playerName.substring(0, maxNameLen - 1) + '…' : s.playerName;
        ctx.fillText(cleanPName, cX + cardWidth / 2, cY + 60);

        ctx.fillStyle = '#0D6E62';
        ctx.font = `600 ${numCards >= 4 ? '11.5px' : '12.5px'} "Outfit", -apple-system, sans-serif`;
        const cleanDName = deckName.length > maxNameLen + 2 ? deckName.substring(0, maxNameLen + 1) + '…' : deckName;
        ctx.fillText(cleanDName, cX + cardWidth / 2, cY + 82);

        const pY = cY + sqPodiumH - 38;
        ctx.fillStyle = pillBg;
        roundRect(ctx, cX + cardWidth / 2 - pillW / 2, pY, pillW, 26, 13);
        ctx.fill();
        ctx.strokeStyle = pillBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, cX + cardWidth / 2 - pillW / 2, pY, pillW, 26, 13);
        ctx.stroke();

        ctx.fillStyle = pillText;
        ctx.font = '800 11.5px "Outfit", -apple-system, sans-serif';
        ctx.fillText(`${s.matchPoints} pts (${s.matchWins}V-${s.matchDraws}E-${s.matchLosses}D)`, cX + cardWidth / 2, pY + 17);
        ctx.textAlign = 'left';
      });

      curY += sqPodiumH + sectionGap;
    }
  }

  // 5. Tabela de Classificação Final (Enquadrada para 1080px de largura)
  ctx.fillStyle = '#ECFDF5';
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 12);
  ctx.stroke();

  ctx.fillStyle = '#063C35';
  ctx.font = '800 11px "Outfit", -apple-system, sans-serif';

  const colX = {
    pos: padding + 14,
    name: padding + 62,
    deck: padding + 255,
    pts: padding + 435,
    ved: padding + 505,
    games: padding + 575,
    saldo: padding + 642,
    by: padding + 702,
    omw: padding + 750,
    pgw: padding + 838,
    ogw: padding + 914,
  };

  const thTextY = curY + Math.round(tableHeaderHeight * 0.62);
  ctx.fillText('POS', colX.pos, thTextY);
  ctx.fillText('DUELISTA', colX.name, thTextY);
  ctx.fillText('DECK', colX.deck, thTextY);
  ctx.fillText('PTS', colX.pts, thTextY);
  ctx.fillText('V-E-D', colX.ved, thTextY);
  ctx.fillText('GAMES', colX.games, thTextY);
  ctx.fillText('SALDO', colX.saldo, thTextY);
  ctx.fillText('BY', colX.by, thTextY);
  ctx.fillStyle = '#047857';
  ctx.fillText('OMW%', colX.omw, thTextY);
  ctx.fillStyle = '#063C35';
  ctx.fillText('PGW%', colX.pgw, thTextY);
  ctx.fillText('OGW%', colX.ogw, thTextY);

  curY += tableHeaderHeight;

  standings.forEach((s, idx) => {
    const rowY = curY;
    const isEven = idx % 2 === 0;

    if (idx === 0) {
      ctx.fillStyle = '#FFFBEB';
    } else if (idx < topCut) {
      ctx.fillStyle = '#F0FDF4';
    } else {
      ctx.fillStyle = isEven ? '#FFFFFF' : '#F8FAFC';
    }
    ctx.fillRect(padding, rowY, contentWidth, rowHeight);

    ctx.strokeStyle = '#EEF2F6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, rowY + rowHeight);
    ctx.lineTo(TARGET_W - padding, rowY + rowHeight);
    ctx.stroke();

    const textY = rowY + Math.round(rowHeight * 0.62);
    const fontSize = isVertical && rowHeight >= 46 ? '13.5px' : '12.5px';

    ctx.font = `800 ${fontSize} "Outfit", -apple-system, sans-serif`;
    ctx.fillStyle = s.rank === 1 ? '#B45309' : s.rank <= topCut ? '#0D6E62' : '#64748B';
    ctx.fillText(`${s.rank}º`, colX.pos, textY);

    ctx.fillStyle = '#0F172A';
    ctx.font = s.rank <= topCut ? `800 ${fontSize} "Outfit", -apple-system, sans-serif` : `600 ${fontSize} "Outfit", -apple-system, sans-serif`;
    const rawName = s.isDropped ? `${s.playerName} (Drop)` : s.playerName;
    const truncName = rawName.length > 18 ? rawName.substring(0, 17) + '…' : rawName;
    ctx.fillText(truncName, colX.name, textY);

    ctx.fillStyle = '#475569';
    ctx.font = `600 12px "Outfit", -apple-system, sans-serif`;
    const rawDeck = playerDecks[s.playerId] || 'Edison Deck';
    const truncDeck = rawDeck.length > 18 ? rawDeck.substring(0, 17) + '…' : rawDeck;
    ctx.fillText(truncDeck, colX.deck, textY);

    ctx.fillStyle = '#0D6E62';
    ctx.font = `800 ${fontSize} "Outfit", -apple-system, sans-serif`;
    ctx.fillText(`${s.matchPoints} pts`, colX.pts, textY);

    ctx.fillStyle = '#334155';
    ctx.font = '600 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${s.matchWins}-${s.matchDraws}-${s.matchLosses}`, colX.ved, textY);
    ctx.fillText(`${s.gamesWon}-${s.gamesLost}`, colX.games, textY);

    ctx.fillStyle = s.gameDiff > 0 ? '#059669' : s.gameDiff < 0 ? '#DC2626' : '#64748B';
    ctx.font = '700 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText(s.gameDiff > 0 ? `+${s.gameDiff}` : `${s.gameDiff}`, colX.saldo, textY);

    ctx.fillStyle = s.hadBy ? '#B45309' : '#94A3B8';
    ctx.font = '600 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText(s.hadBy ? 'Sim' : '-', colX.by, textY);

    ctx.fillStyle = '#0D6E62';
    ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${s.omwPercentage ?? 0}%`, colX.omw, textY);

    ctx.fillStyle = '#475569';
    ctx.font = '600 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${s.pgwPercentage ?? 0}%`, colX.pgw, textY);
    ctx.fillText(`${s.ogwPercentage ?? 0}%`, colX.ogw, textY);

    curY += rowHeight;
  });

  curY += 12;

  // Legenda Oficial de Desempate
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11px "Outfit", -apple-system, sans-serif';
  ctx.fillText(
    '* Desempate Suíço Oficial: Pontos > Sem BY > OMW% (Mínimos) > Saldo de Games > Confronto Direto > PGW% > OGW% (Piso: 33%)',
    padding + 4,
    curY + 12
  );

  curY += legendHeight;

  // 6. Observações de Desempate
  if (tiebreakNotes.length > 0) {
    ctx.fillStyle = '#FFFBEB';
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 1;
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 12);
    ctx.stroke();

    ctx.fillStyle = '#92400E';
    ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText('📌 Observações de Desempate (Duelistas com mesma pontuação):', padding + 14, curY + 22);

    let noteY = curY + 44;
    ctx.fillStyle = '#78350F';
    ctx.font = '600 11.5px "Outfit", -apple-system, sans-serif';
    tourTiebreakLines.forEach((line) => {
      ctx.fillText(line, padding + 14, noteY);
      noteY += tiebreakLineHeight;
    });
  }

  // 7. Rodapé Oficial fixado na base do Card
  const footerY = workH - outerMargin - 44;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, footerY - 8);
  ctx.lineTo(TARGET_W - padding, footerY - 8);
  ctx.stroke();

  ctx.fillStyle = '#0D6E62';
  ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Duel League • Gestão de Torneios', padding, footerY + 14);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11.5px "Outfit", -apple-system, sans-serif';
  ctx.fillText(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    TARGET_W - padding,
    footerY + 14
  );
  ctx.textAlign = 'left';

  // Garante a resolução final Ultra HD 2x (2160x2160 ou 2160x3840)
  let finalCanvas = workCanvas;
  if (workH !== TARGET_H) {
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = TARGET_W * HD_SCALE;
    finalCanvas.height = TARGET_H * HD_SCALE;
    const fCtx = finalCanvas.getContext('2d');
    if (fCtx) {
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.fillStyle = '#063C35';
      fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      const scale = Math.min(finalCanvas.width / workCanvas.width, finalCanvas.height / workCanvas.height);
      const drawW = workCanvas.width * scale;
      const drawH = workCanvas.height * scale;
      const drawX = (finalCanvas.width - drawW) / 2;
      const drawY = (finalCanvas.height - drawH) / 2;
      fCtx.drawImage(workCanvas, drawX, drawY, drawW, drawH);
    }
  }

  const suffix = isVertical ? 'Stories_9x16' : 'Feed_1x1';
  const safeFilename = `Resultado_${tournament.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${suffix}`;
  downloadCanvasAsPNG(finalCanvas, safeFilename);
}

/**
 * Exporta o Ranking Geral da Liga Oficial como imagem PNG para Instagram
 * (Permite escolher entre Formato Quadrado 1080x1080 e Formato Reto da Tela 1080x1920)
 */
export function exportLeagueRankingPNG(
  players: Player[],
  format?: InstagramExportFormat
): void {
  if (!format) {
    showInstagramFormatSelector('Exportar Ranking Geral da Liga', (chosenFormat) => {
      exportLeagueRankingPNG(players, chosenFormat);
    });
    return;
  }

  const activePlayers = sortPlayersForLeague(players.filter((p) => p.active));
  const tiebreakNotes = getLeagueTiebreakExplanations(activePlayers);
  const top3 = activePlayers.slice(0, 3);
  const isVertical = format === 'vertical';

  const TARGET_W = 1080;
  const TARGET_H = isVertical ? 1920 : 1080;
  const outerMargin = 24;
  const padding = 48;
  const contentWidth = TARGET_W - padding * 2; // 984px

  const bannerH = isVertical ? 136 : 104;
  const tableHeaderHeight = isVertical ? 46 : 40;
  const footerHeight = 46;

  // Pré-calcula linhas de desempate da Liga
  const maxTiebreakTextWidth = contentWidth - 32;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (tempCtx) {
    tempCtx.font = '12px "Outfit", -apple-system, sans-serif';
  }
  const leagueTiebreakLines: string[] = [];
  if (tempCtx && tiebreakNotes.length > 0) {
    tiebreakNotes.forEach((note) => {
      const rawText = `• [${note.points} Pts] Empate entre ${note.players.join(', ')}: ${note.reasons.join(' | ')}`;
      const wrapped = wrapCanvasText(tempCtx, rawText, maxTiebreakTextWidth);
      leagueTiebreakLines.push(...wrapped);
    });
  }

  const tiebreakLineHeight = isVertical ? 22 : 19;
  const tiebreakHeight =
    tiebreakNotes.length > 0 ? 38 + leagueTiebreakLines.length * tiebreakLineHeight : 0;

  const podiumCardGap = 12;
  let stackedCardH = 116;
  let podiumTotalH =
    top3.length >= 2
      ? isVertical
        ? top3.length * stackedCardH + (top3.length - 1) * podiumCardGap
        : 136
      : 0;

  const countRows = Math.max(1, activePlayers.length);
  const baseFixedH =
    padding +
    bannerH +
    (podiumTotalH > 0 ? podiumTotalH : 0) +
    tableHeaderHeight +
    (tiebreakHeight > 0 ? tiebreakHeight : 0) +
    footerHeight +
    padding;

  const numSectionGaps = 2 + (podiumTotalH > 0 ? 1 : 0) + (tiebreakHeight > 0 ? 1 : 0);

  let rowHeight = isVertical ? 44 : 36;
  let sectionGap = 16;

  if (isVertical) {
    const minTableRowsH = countRows * 40;
    const leftover = TARGET_H - (baseFixedH + minTableRowsH + numSectionGaps * 16);

    if (leftover > 0) {
      if (top3.length >= 2) {
        const addPerCard = Math.min(32, Math.floor((leftover * 0.35) / top3.length));
        stackedCardH += addPerCard;
        podiumTotalH = top3.length * stackedCardH + (top3.length - 1) * podiumCardGap;
      }

      const updatedFixedH =
        padding +
        bannerH +
        (podiumTotalH > 0 ? podiumTotalH : 0) +
        tableHeaderHeight +
        (tiebreakHeight > 0 ? tiebreakHeight : 0) +
        footerHeight +
        padding;

      const availForRowsAndGaps = TARGET_H - updatedFixedH;
      const maxRowH = 110;
      rowHeight = Math.max(42, Math.min(maxRowH, Math.floor((availForRowsAndGaps - numSectionGaps * 22) / countRows)));

      const remainingAfterRows = availForRowsAndGaps - countRows * rowHeight;
      sectionGap = Math.max(16, Math.min(54, Math.floor(remainingAfterRows / numSectionGaps)));
    } else {
      const availForRows = Math.max(countRows * 34, TARGET_H - baseFixedH - numSectionGaps * 12);
      rowHeight = Math.max(34, Math.floor(availForRows / countRows));
      sectionGap = 12;
    }
  } else {
    const availForRows = Math.max(countRows * 30, TARGET_H - baseFixedH - numSectionGaps * 14);
    rowHeight = Math.max(30, Math.min(48, Math.floor(availForRows / countRows)));
    sectionGap = 14;
  }

  const tableHeight = tableHeaderHeight + activePlayers.length * rowHeight;
  const naturalHeight =
    padding +
    bannerH +
    sectionGap +
    (podiumTotalH > 0 ? podiumTotalH + sectionGap : 0) +
    tableHeight +
    sectionGap +
    (tiebreakHeight > 0 ? tiebreakHeight + sectionGap : 0) +
    footerHeight +
    padding;

  const workH = Math.max(TARGET_H, naturalHeight);
  const HD_SCALE = 2; // Super-resolução 2x (2160x2160 ou 2160x3840 4K) para máxima nitidez
  const workCanvas = document.createElement('canvas');
  workCanvas.width = TARGET_W * HD_SCALE;
  workCanvas.height = workH * HD_SCALE;
  const ctx = workCanvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(HD_SCALE, HD_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Fundo Externo Verde Petróleo Midway
  const bgGrad = ctx.createLinearGradient(0, 0, TARGET_W, workH);
  bgGrad.addColorStop(0, '#042F29');
  bgGrad.addColorStop(0.5, '#063C35');
  bgGrad.addColorStop(1, '#0A4F46');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, TARGET_W, workH);

  // 2. Card Principal Branco
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, outerMargin, outerMargin, TARGET_W - outerMargin * 2, workH - outerMargin * 2, 26);
  ctx.fill();

  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 2;
  roundRect(ctx, outerMargin, outerMargin, TARGET_W - outerMargin * 2, workH - outerMargin * 2, 26);
  ctx.stroke();

  let curY = padding;

  // 3. Banner Superior Midway Deep Petrol Teal
  const bannerGrad = ctx.createLinearGradient(padding, curY, TARGET_W - padding, curY + bannerH);
  bannerGrad.addColorStop(0, '#063C35');
  bannerGrad.addColorStop(0.55, '#0A4F46');
  bannerGrad.addColorStop(1, '#0D6E62');

  ctx.fillStyle = bannerGrad;
  roundRect(ctx, padding, curY, contentWidth, bannerH, 18);
  ctx.fill();

  const emblemSize = isVertical ? 66 : 54;
  drawMillenniumEmblem(ctx, padding + 20, curY + (bannerH - emblemSize) / 2, emblemSize);

  const textStartX = padding + 20 + emblemSize + 16;

  ctx.fillStyle = '#6EE7B7';
  ctx.font = `800 ${isVertical ? '12.5px' : '11.5px'} "Outfit", -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('DUEL LEAGUE • CLASSIFICAÇÃO GERAL DA TEMPORADA', textStartX, curY + (isVertical ? 38 : 30));

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${isVertical ? '30px' : '26px'} "Outfit", -apple-system, sans-serif`;
  ctx.fillText('Ranking Oficial da Liga', textStartX, curY + (isVertical ? 76 : 62));

  if (isVertical) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = '600 13px "Outfit", -apple-system, sans-serif';
    ctx.fillText('Pontuação Acumulada, Troféus e Aproveitamento Oficial', textStartX, curY + 106);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#D1FAE5';
  ctx.font = '600 12.5px "Outfit", -apple-system, sans-serif';
  ctx.fillText(`Atualizado em ${new Date().toLocaleDateString('pt-BR')}`, TARGET_W - padding - 20, curY + (isVertical ? 40 : 32));

  const badgeW = 165;
  const badgeH = 30;
  const badgeX = TARGET_W - padding - 20 - badgeW;
  const badgeY = curY + (isVertical ? 58 : 46);
  ctx.fillStyle = '#ECFDF5';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
  ctx.fill();

  ctx.fillStyle = '#063C35';
  ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${activePlayers.length} Duelistas Ativos`, badgeX + badgeW / 2, badgeY + 20);
  ctx.textAlign = 'left';

  curY += bannerH + sectionGap;

  const getPlayerMostUsedDeck = (pl: Player) => {
    if (!pl.decksHistory || pl.decksHistory.length === 0) return 'Edison Deck';
    const counts: Record<string, number> = {};
    for (const h of pl.decksHistory) {
      if (h.countsForLeague === false) continue;
      counts[h.deckName] = (counts[h.deckName] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'Edison Deck';
  };

  // 4. Pódio dos 3 Melhores da Liga: No formato Vertical (9:16), empilhados um abaixo do outro com arte elaborada
  if (podiumTotalH > 0 && top3.length >= 2) {
    if (isVertical) {
      top3.forEach((p, idx) => {
        const rank = idx + 1;
        const deckName = getPlayerMostUsedDeck(p);
        const totalM = p.wins + p.draws + p.losses;
        const wr = totalM > 0 ? ((p.wins / totalM) * 100).toFixed(1) : '0.0';
        const titlesCount = p.tournamentTitles || 0;
        drawElaborateStackedPodiumCard(
          ctx,
          padding,
          curY,
          contentWidth,
          stackedCardH,
          rank,
          p.name,
          deckName,
          `${p.points} PTS`,
          `${p.wins}V - ${p.draws}E - ${p.losses}D (${wr}% WR)`,
          `${titlesCount} ${titlesCount === 1 ? 'Título' : 'Títulos'} • ${p.participations} ${p.participations === 1 ? 'Torneio' : 'Torneios'}`,
          true
        );
        curY += stackedCardH + (idx < top3.length - 1 ? podiumCardGap : 0);
      });
      curY += sectionGap;
    } else {
      const numCards = top3.length;
      const cardGap = 14;
      const cardWidth = (contentWidth - cardGap * (numCards - 1)) / numCards;
      const sqPodiumH = 136;

      top3.forEach((p, idx) => {
        const rank = idx + 1;
        const cX = padding + (cardWidth + cardGap) * idx;
        const cY = curY;
        const deckName = getPlayerMostUsedDeck(p);
        const pillW = Math.min(175, cardWidth - 16);

        let borderColor = '#EA580C';
        let ribbonStart = '#EA580C';
        let ribbonEnd = '#C2410C';
        let ribbonTitle = '3º LUGAR';
        let pillBg = '#FFEDD5';
        let pillBorder = '#FDBA74';
        let pillText = '#9A3412';

        if (rank === 1) {
          borderColor = '#F59E0B';
          ribbonStart = '#F59E0B';
          ribbonEnd = '#D97706';
          ribbonTitle = '1º LUGAR';
          pillBg = '#FEF3C7';
          pillBorder = '#FCD34D';
          pillText = '#92400E';
        } else if (rank === 2) {
          borderColor = '#94A3B8';
          ribbonStart = '#64748B';
          ribbonEnd = '#475569';
          ribbonTitle = '2º LUGAR';
          pillBg = '#F1F5F9';
          pillBorder = '#CBD5E1';
          pillText = '#334155';
        }

        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, cX, cY, cardWidth, sqPodiumH, 14);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        roundRect(ctx, cX, cY, cardWidth, sqPodiumH, 14);
        ctx.stroke();

        const ribbonGrad = ctx.createLinearGradient(cX, cY, cX + cardWidth, cY);
        ribbonGrad.addColorStop(0, ribbonStart);
        ribbonGrad.addColorStop(1, ribbonEnd);
        ctx.fillStyle = ribbonGrad;
        roundRect(ctx, cX, cY, cardWidth, 30, 14);
        ctx.fill();
        ctx.fillRect(cX, cY + 16, cardWidth, 14);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 11.5px "Outfit", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ribbonTitle, cX + cardWidth / 2, cY + 20);

        ctx.fillStyle = '#0F172A';
        ctx.font = '800 16.5px "Outfit", -apple-system, sans-serif';
        const cleanName = p.name.length > 20 ? p.name.substring(0, 19) + '…' : p.name;
        ctx.fillText(cleanName, cX + cardWidth / 2, cY + 60);

        ctx.fillStyle = '#0D6E62';
        ctx.font = '600 12.5px "Outfit", -apple-system, sans-serif';
        const cleanDeck = deckName.length > 22 ? deckName.substring(0, 21) + '…' : deckName;
        ctx.fillText(cleanDeck, cX + cardWidth / 2, cY + 82);

        const pY = cY + sqPodiumH - 38;
        ctx.fillStyle = pillBg;
        roundRect(ctx, cX + cardWidth / 2 - pillW / 2, pY, pillW, 26, 13);
        ctx.fill();
        ctx.strokeStyle = pillBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, cX + cardWidth / 2 - pillW / 2, pY, pillW, 26, 13);
        ctx.stroke();

        ctx.fillStyle = pillText;
        ctx.font = '800 11.5px "Outfit", -apple-system, sans-serif';
        ctx.fillText(`${p.points} pts • ${p.wins}V-${p.draws}E-${p.losses}D`, cX + cardWidth / 2, pY + 17);
        ctx.textAlign = 'left';
      });

      curY += sqPodiumH + sectionGap;
    }
  }

  // 5. Cabeçalho da Tabela
  ctx.fillStyle = '#ECFDF5';
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 12);
  ctx.stroke();

  ctx.fillStyle = '#063C35';
  ctx.font = '800 11.5px "Outfit", -apple-system, sans-serif';

  const colX = {
    pos: padding + 18,
    name: padding + 76,
    deck: padding + 310,
    pts: padding + 540,
    ved: padding + 640,
    part: padding + 748,
    trophies: padding + 825,
    winRate: padding + 905,
  };

  const thTextY = curY + Math.round(tableHeaderHeight * 0.62);
  ctx.fillText('POS', colX.pos, thTextY);
  ctx.fillText('DUELISTA', colX.name, thTextY);
  ctx.fillText('DECK PRINCIPAL', colX.deck, thTextY);
  ctx.fillText('PONTOS', colX.pts, thTextY);
  ctx.fillText('V - E - D', colX.ved, thTextY);
  ctx.fillText('PART.', colX.part, thTextY);
  ctx.fillText('TÍTULOS', colX.trophies, thTextY);
  ctx.fillText('WIN RATE', colX.winRate, thTextY);

  curY += tableHeaderHeight;

  // 6. Linhas da Tabela
  activePlayers.forEach((p, idx) => {
    const rowY = curY;
    const isEven = idx % 2 === 0;
    const rank = idx + 1;
    const totalMatches = p.wins + p.draws + p.losses;
    const winRate = totalMatches > 0 ? ((p.wins / totalMatches) * 100).toFixed(1) : '0.0';

    if (rank === 1) {
      ctx.fillStyle = '#FFFBEB';
    } else if (rank <= 3) {
      ctx.fillStyle = '#F0FDF4';
    } else {
      ctx.fillStyle = isEven ? '#FFFFFF' : '#F8FAFC';
    }
    ctx.fillRect(padding, rowY, contentWidth, rowHeight);

    ctx.strokeStyle = '#EEF2F6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, rowY + rowHeight);
    ctx.lineTo(TARGET_W - padding, rowY + rowHeight);
    ctx.stroke();

    const textY = rowY + Math.round(rowHeight * 0.62);
    const fontSize = isVertical && rowHeight >= 46 ? '14px' : '13px';

    ctx.font = `800 ${fontSize} "Outfit", -apple-system, sans-serif`;
    ctx.fillStyle = rank === 1 ? '#B45309' : rank <= 3 ? '#0D6E62' : '#64748B';
    ctx.fillText(`${rank}º`, colX.pos, textY);

    ctx.fillStyle = '#0F172A';
    ctx.font = rank <= 3 ? `800 ${fontSize} "Outfit", -apple-system, sans-serif` : `600 ${fontSize} "Outfit", -apple-system, sans-serif`;
    const cleanName = p.name.length > 22 ? p.name.substring(0, 21) + '…' : p.name;
    ctx.fillText(cleanName, colX.name, textY);

    ctx.fillStyle = '#475569';
    ctx.font = '600 12.5px "Outfit", -apple-system, sans-serif';
    const deckStr = getPlayerMostUsedDeck(p);
    const cleanDeck = deckStr.length > 22 ? deckStr.substring(0, 21) + '…' : deckStr;
    ctx.fillText(cleanDeck, colX.deck, textY);

    ctx.fillStyle = '#0D6E62';
    ctx.font = `900 ${fontSize} "Outfit", -apple-system, sans-serif`;
    ctx.fillText(`${p.points} pts`, colX.pts, textY);

    ctx.fillStyle = '#334155';
    ctx.font = '700 12.5px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${p.wins}V - ${p.draws}E - ${p.losses}D`, colX.ved, textY);

    ctx.fillStyle = '#475569';
    ctx.font = '600 12.5px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${p.participations}`, colX.part, textY);

    ctx.fillStyle = (p.tournamentTitles || 0) > 0 ? '#B45309' : '#94A3B8';
    ctx.font = (p.tournamentTitles || 0) > 0 ? '800 13px "Outfit", -apple-system, sans-serif' : '600 12.5px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${p.tournamentTitles || 0}`, colX.trophies, textY);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 12.5px "Outfit", -apple-system, sans-serif';
    ctx.fillText(`${winRate}%`, colX.winRate, textY);

    curY += rowHeight;
  });

  curY += 16;

  // 7. Observações de Desempate da Liga
  if (tiebreakNotes.length > 0) {
    ctx.fillStyle = '#FFFBEB';
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 1;
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 12);
    ctx.stroke();

    ctx.fillStyle = '#92400E';
    ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
    ctx.fillText('📌 Critérios Oficiais de Desempate da Liga (Duelistas com mesma pontuação):', padding + 14, curY + 22);

    let noteY = curY + 44;
    ctx.fillStyle = '#78350F';
    ctx.font = '600 11.5px "Outfit", -apple-system, sans-serif';
    leagueTiebreakLines.forEach((line) => {
      ctx.fillText(line, padding + 14, noteY);
      noteY += tiebreakLineHeight;
    });
  }

  // 8. Rodapé Oficial fixado na base do Card
  const footerY = workH - outerMargin - 44;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, footerY - 8);
  ctx.lineTo(TARGET_W - padding, footerY - 8);
  ctx.stroke();

  ctx.fillStyle = '#0D6E62';
  ctx.font = '800 12px "Outfit", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Duel League • Gestão de Torneios', padding, footerY + 14);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11.5px "Outfit", -apple-system, sans-serif';
  ctx.fillText(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    TARGET_W - padding,
    footerY + 14
  );
  ctx.textAlign = 'left';

  let finalCanvas = workCanvas;
  if (workH !== TARGET_H) {
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = TARGET_W * HD_SCALE;
    finalCanvas.height = TARGET_H * HD_SCALE;
    const fCtx = finalCanvas.getContext('2d');
    if (fCtx) {
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.fillStyle = '#063C35';
      fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      const scale = Math.min(finalCanvas.width / workCanvas.width, finalCanvas.height / workCanvas.height);
      const drawW = workCanvas.width * scale;
      const drawH = workCanvas.height * scale;
      const drawX = (finalCanvas.width - drawW) / 2;
      const drawY = (finalCanvas.height - drawH) / 2;
      fCtx.drawImage(workCanvas, drawX, drawY, drawW, drawH);
    }
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const suffix = isVertical ? 'Stories_9x16' : 'Feed_1x1';
  downloadCanvasAsPNG(finalCanvas, `Ranking_Liga_${dateStr}_${suffix}`);
}

/**
 * Interface dos dados necessários para exportar a decklist completa em PNG
 */
export interface DecklistExportData {
  deckName: string;
  playerName: string;
  mainDeck: DeckCardItem[];
  extraDeck: DeckCardItem[];
  sideDeck: DeckCardItem[];
}

interface ExportCardInstance {
  cardId: number;
  cardName: string;
  category: 'monster' | 'spell' | 'trap' | 'extra';
  type: string;
  banLimit: number;
}

/**
 * Desenha texto rotacionado verticalmente (lendo de baixo para cima, 90° anti-horário)
 */
function drawVerticalRotatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  font: string,
  color: string
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Espaça as letras para efeito visual destacado
  const spaced = text.split('').join('  ');
  ctx.fillText(spaced, 0, 0);
  ctx.restore();
}

/**
 * Desenha o badge oficial da banlist sobre a carta (Proibida, Limitada ou Semi)
 */
function drawBanlistBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  limit: number,
  isSmall: boolean
) {
  if (limit > 2) return;

  const radius = isSmall ? 7.5 : 9.5;
  const centerX = x + radius + (isSmall ? 2 : 3);
  const centerY = y + radius + (isSmall ? 2 : 3);

  // Fundo preto
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  if (limit === 0) {
    // Proibida: Borda vermelha + barra transversal vermelha
    ctx.lineWidth = isSmall ? 2 : 2.5;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    ctx.beginPath();
    const slashR = radius - 1.5;
    const rad = Math.PI / 4;
    ctx.moveTo(centerX - Math.cos(rad) * slashR, centerY + Math.sin(rad) * slashR);
    ctx.lineTo(centerX + Math.cos(rad) * slashR, centerY - Math.sin(rad) * slashR);
    ctx.stroke();
  } else if (limit === 1) {
    // Limitada: Borda vermelha + número 1 branco
    ctx.lineWidth = isSmall ? 1.5 : 2;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isSmall ? 9 : 11}px "Outfit", -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', centerX, centerY + 0.5);
  } else if (limit === 2) {
    // Semi-limitada: Borda âmbar + número 2 âmbar
    ctx.lineWidth = isSmall ? 1.5 : 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${isSmall ? 9 : 11}px "Outfit", -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2', centerX, centerY + 0.5);
  }
}

/**
 * Desenha carta substituta quando o download da imagem falha (offline/erro)
 */
function drawFallbackCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  category: 'monster' | 'spell' | 'trap' | 'extra',
  cardName: string,
  isSmall: boolean
) {
  let bgColor = '#b45309';
  if (category === 'spell') bgColor = '#15803d';
  if (category === 'trap') bgColor = '#be185d';
  if (category === 'extra') bgColor = '#6b21a8';

  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, isSmall ? 3 : 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${isSmall ? 8 : 9.5}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxChars = isSmall ? 10 : 13;
  const displayName = cardName.length > maxChars ? cardName.substring(0, maxChars - 1) + '…' : cardName;
  ctx.fillText(displayName, x + w / 2, y + h / 2);
}

/**
 * Desenha slot vazio no grid com fundo translúcido e símbolo '+' discreto
 */
function drawEmptySlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  type: 'deck' | 'side' | 'extra',
  isSmall: boolean
) {
  let fill = 'rgba(168, 85, 247, 0.04)';
  let stroke = 'rgba(168, 85, 247, 0.18)';
  let plusColor = 'rgba(168, 85, 247, 0.3)';

  if (type === 'side') {
    fill = 'rgba(6, 182, 212, 0.05)';
    stroke = 'rgba(6, 182, 212, 0.22)';
    plusColor = 'rgba(6, 182, 212, 0.35)';
  } else if (type === 'extra') {
    fill = 'rgba(249, 115, 22, 0.05)';
    stroke = 'rgba(249, 115, 22, 0.22)';
    plusColor = 'rgba(249, 115, 22, 0.35)';
  }

  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, isSmall ? 3 : 4);
  ctx.fill();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = plusColor;
  ctx.font = `${isSmall ? 13 : 15}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', x + w / 2, y + h / 2);
}

/**
 * Exporta a Decklist completa em imagem PNG de alta resolução estilizada como no simulador DuelingBook
 */
export async function exportDecklistImagePNG(
  deckData: DecklistExportData,
  onProgress?: (progress: { loaded: number; total: number; message: string }) => void
): Promise<void> {
  // 1. Expandir cartas individuais do Main Deck
  const mainCards: ExportCardInstance[] = [];
  (deckData.mainDeck || []).forEach((item) => {
    const cardObj = getEdisonCardByName(item.cardName);
    const cat = cardObj ? getCardCategory(cardObj) : 'monster';
    const banLimit = getCardBanlistLimit(item.cardName);
    const count = item.count || 1;

    for (let c = 0; c < count; c++) {
      mainCards.push({
        cardId: item.cardId,
        cardName: item.cardName,
        category: cat === 'extra' ? 'monster' : cat,
        type: cardObj?.type || 'Monster',
        banLimit,
      });
    }
  });

  // Ordenar Main Deck: Monstros primeiro, Magias segundo, Armadilhas terceiro, depois alfabético
  const catWeight: Record<string, number> = { monster: 1, spell: 2, trap: 3, extra: 4 };
  mainCards.sort((a, b) => {
    if (catWeight[a.category] !== catWeight[b.category]) {
      return catWeight[a.category] - catWeight[b.category];
    }
    return a.cardName.localeCompare(b.cardName);
  });

  // 2. Expandir cartas do Side Deck
  const sideCards: ExportCardInstance[] = [];
  (deckData.sideDeck || []).forEach((item) => {
    const cardObj = getEdisonCardByName(item.cardName);
    const cat = cardObj ? getCardCategory(cardObj) : 'monster';
    const banLimit = getCardBanlistLimit(item.cardName);
    const count = item.count || 1;

    for (let c = 0; c < count; c++) {
      sideCards.push({
        cardId: item.cardId,
        cardName: item.cardName,
        category: cat,
        type: cardObj?.type || 'Card',
        banLimit,
      });
    }
  });

  sideCards.sort((a, b) => {
    if (catWeight[a.category] !== catWeight[b.category]) {
      return catWeight[a.category] - catWeight[b.category];
    }
    return a.cardName.localeCompare(b.cardName);
  });

  // 3. Expandir cartas do Extra Deck
  const extraCards: ExportCardInstance[] = [];
  (deckData.extraDeck || []).forEach((item) => {
    const cardObj = getEdisonCardByName(item.cardName);
    const banLimit = getCardBanlistLimit(item.cardName);
    const count = item.count || 1;

    for (let c = 0; c < count; c++) {
      extraCards.push({
        cardId: item.cardId,
        cardName: item.cardName,
        category: 'extra',
        type: cardObj?.type || 'Fusion / Synchro',
        banLimit,
      });
    }
  });

  extraCards.sort((a, b) => {
    const isASynchro = a.type.toLowerCase().includes('synchro');
    const isBSynchro = b.type.toLowerCase().includes('synchro');
    if (isASynchro && !isBSynchro) return -1;
    if (!isASynchro && isBSynchro) return 1;
    return a.cardName.localeCompare(b.cardName);
  });

  // Estatísticas de contagem
  const mainTotal = mainCards.length;
  const monstersCount = mainCards.filter((c) => c.category === 'monster').length;
  const spellsCount = mainCards.filter((c) => c.category === 'spell').length;
  const trapsCount = mainCards.filter((c) => c.category === 'trap').length;
  const extraTotal = extraCards.length;
  const sideTotal = sideCards.length;

  // 4. Pré-carregamento assíncrono das imagens com proxy seguro CORS
  const allCardIds = [
    ...mainCards.map((c) => c.cardId),
    ...extraCards.map((c) => c.cardId),
    ...sideCards.map((c) => c.cardId),
  ].filter(Boolean);

  const uniqueIds = Array.from(new Set(allCardIds));
  const totalUnique = uniqueIds.length;
  const imageMap = new Map<number, HTMLImageElement>();
  let loadedCount = 0;

  onProgress?.({
    loaded: 0,
    total: totalUnique,
    message: `Carregando ${totalUnique} imagens de cartas...`,
  });

  await Promise.all(
    uniqueIds.map((id) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
          loadedCount++;
          resolve();
        }, 8000);

        img.onload = () => {
          clearTimeout(timeout);
          imageMap.set(id, img);
          loadedCount++;
          onProgress?.({
            loaded: loadedCount,
            total: totalUnique,
            message: `Carregando cartas (${loadedCount}/${totalUnique})...`,
          });
          resolve();
        };

        img.onerror = () => {
          // Fallback tentativa direta
          const fallback = new Image();
          fallback.crossOrigin = 'anonymous';
          fallback.onload = () => {
            clearTimeout(timeout);
            imageMap.set(id, fallback);
            loadedCount++;
            resolve();
          };
          fallback.onerror = () => {
            clearTimeout(timeout);
            loadedCount++;
            resolve();
          };
          fallback.src = `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`;
        };

        img.src = `https://wsrv.nl/?url=images.ygoprodeck.com/images/cards_small/${id}.jpg`;
      });
    })
  );

  onProgress?.({
    loaded: totalUnique,
    total: totalUnique,
    message: 'Renderizando imagem da decklist em alta resolução...',
  });

  // 5. Configuração geométrica do Canvas
  const width = 1080;
  const paddingX = 23;
  const railWidth = 58;
  const railGap = 10;
  const gridX = paddingX + railWidth + railGap; // 91px
  const gridWidth = width - paddingX - gridX; // 966px

  // Grid do Main Deck: 10 colunas, 6 linhas (exatamente 60 slots padrão DuelingBook)
  const mainCols = 10;
  const mainGap = 5;
  const mainCardW = Math.floor((gridWidth - (mainCols - 1) * mainGap) / mainCols); // 92px
  const mainCardH = Math.round(mainCardW * (86 / 59)); // 134px
  const mainRows = 6;
  const mainGridH = mainRows * mainCardH + (mainRows - 1) * mainGap; // 829px

  // Grid do Side e Extra Deck: 15 colunas na mesma largura (exatamente como na referência)
  const subCols = 15;
  const subGap = 4;
  const subCardW = Math.floor((gridWidth - (subCols - 1) * subGap) / subCols); // 60px
  const subCardH = Math.round(subCardW * (86 / 59)); // 87px
  const subGridH = subCardH; // 87px

  const headerH = 84;
  const sectionGap = 12;
  const footerH = 40;

  const height =
    headerH +
    sectionGap +
    mainGridH +
    sectionGap +
    subGridH +
    sectionGap +
    subGridH +
    sectionGap +
    footerH;

  const HD_DECK_SCALE = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * HD_DECK_SCALE;
  canvas.height = height * HD_DECK_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(HD_DECK_SCALE, HD_DECK_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fundo principal da imagem
  ctx.fillStyle = '#0d0d11';
  ctx.fillRect(0, 0, width, height);

  // ==========================================================
  // CABEÇALHO SUPERIOR (HEADER)
  // ==========================================================
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, '#1c1917');
  headerGrad.addColorStop(1, '#18181b');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, headerH);

  // Linha dourada decorativa inferior do cabeçalho
  const lineGrad = ctx.createLinearGradient(0, headerH - 1, width, headerH - 1);
  lineGrad.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
  lineGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.9)');
  lineGrad.addColorStop(1, 'rgba(245, 158, 11, 0.3)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, headerH - 2, width, 2);

  // Nome do Deck e Jogador
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px "Outfit", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(deckData.deckName || 'Yugioh Deck', paddingX, 36);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12.5px "Outfit", -apple-system, sans-serif';
  const subtitle = `Duelista: ${deckData.playerName || 'Jogador'} • Formato Edison (Março 2010) • Yu-Gi-Oh! TCG`;
  ctx.fillText(subtitle, paddingX, 60);

  // Pílulas de Contagem no topo direito
  const drawCapsule = (
    text: string,
    x: number,
    y: number,
    w: number,
    bg: string,
    fg: string,
    border: string
  ) => {
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, w, 28, 6);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.font = 'bold 11.5px "Outfit", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 14);
  };

  const capY = 28;
  drawCapsule(`Side: ${sideTotal}/15`, width - paddingX - 105, capY, 105, 'rgba(6, 182, 212, 0.15)', '#38bdf8', 'rgba(6, 182, 212, 0.5)');
  drawCapsule(`Extra: ${extraTotal}/15`, width - paddingX - 220, capY, 105, 'rgba(168, 85, 247, 0.15)', '#c084fc', 'rgba(168, 85, 247, 0.5)');
  drawCapsule(`Main: ${mainTotal}/40-60`, width - paddingX - 355, capY, 125, 'rgba(52, 211, 153, 0.15)', '#34d399', 'rgba(52, 211, 153, 0.5)');

  // ==========================================================
  // SEÇÃO 1: MAIN DECK (RAIL LATERAL + GRID 10x6)
  // ==========================================================
  const mainY = headerH + sectionGap;

  // Painel de Fundo do Main Deck
  ctx.fillStyle = '#140e1e';
  roundRect(ctx, gridX - 4, mainY - 4, gridWidth + 8, mainGridH + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rail Lateral do Main Deck
  const boxH = 27;
  const boxGap = 3;
  const drawCountBox = (val: number, orderIdx: number, bg: string, border: string) => {
    const bY = mainY + orderIdx * (boxH + boxGap);
    ctx.fillStyle = bg;
    roundRect(ctx, paddingX, bY, railWidth, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Outfit", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${val}`, paddingX + railWidth / 2, bY + boxH / 2);
  };

  drawCountBox(mainTotal, 0, '#27272a', '#52525b'); // Total Main
  drawCountBox(monstersCount, 1, '#9a3412', '#d97706'); // Monstros
  drawCountBox(spellsCount, 2, '#166534', '#22c55e'); // Magias
  drawCountBox(trapsCount, 3, '#9d174d', '#f43f5e'); // Armadilhas
  drawCountBox(extraTotal, 4, '#581c87', '#a855f7'); // Extra
  drawCountBox(sideTotal, 5, '#0e7490', '#06b6d4'); // Side

  // Faixa Vertical Roxa 'DECK'
  const totalBoxesH = 6 * boxH + 5 * boxGap;
  const stripDeckY = mainY + totalBoxesH + 4;
  const stripDeckH = mainGridH - (totalBoxesH + 4);

  const deckStripGrad = ctx.createLinearGradient(0, stripDeckY, 0, stripDeckY + stripDeckH);
  deckStripGrad.addColorStop(0, '#6b21a8');
  deckStripGrad.addColorStop(1, '#4c1d95');
  ctx.fillStyle = deckStripGrad;
  roundRect(ctx, paddingX, stripDeckY, railWidth, stripDeckH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawVerticalRotatedText(
    ctx,
    'DECK',
    paddingX + railWidth / 2,
    stripDeckY + stripDeckH / 2,
    'bold 22px "Outfit", -apple-system, sans-serif',
    '#ffffff'
  );

  // Renderização das Cartas do Main Deck (60 slots)
  for (let r = 0; r < mainRows; r++) {
    for (let c = 0; c < mainCols; c++) {
      const slotIdx = r * mainCols + c;
      const cX = gridX + c * (mainCardW + mainGap);
      const cY = mainY + r * (mainCardH + mainGap);

      if (slotIdx < mainCards.length) {
        const cardItem = mainCards[slotIdx];
        const img = imageMap.get(cardItem.cardId);

        if (img) {
          ctx.save();
          roundRect(ctx, cX, cY, mainCardW, mainCardH, 4);
          ctx.clip();
          ctx.drawImage(img, cX, cY, mainCardW, mainCardH);
          ctx.restore();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          roundRect(ctx, cX, cY, mainCardW, mainCardH, 4);
          ctx.stroke();
        } else {
          drawFallbackCard(ctx, cX, cY, mainCardW, mainCardH, cardItem.category, cardItem.cardName, false);
        }

        drawBanlistBadge(ctx, cX, cY, cardItem.banLimit, false);
      } else {
        drawEmptySlot(ctx, cX, cY, mainCardW, mainCardH, 'deck', false);
      }
    }
  }

  // ==========================================================
  // SEÇÃO 2: SIDE DECK (RAIL LATERAL + GRID 15x1)
  // ==========================================================
  const sideY = mainY + mainGridH + sectionGap;

  // Painel de Fundo do Side Deck
  ctx.fillStyle = '#082f49';
  roundRect(ctx, gridX - 4, sideY - 4, gridWidth + 8, subGridH + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rail Lateral do Side Deck
  const sideStripGrad = ctx.createLinearGradient(0, sideY, 0, sideY + subGridH);
  sideStripGrad.addColorStop(0, '#0891b2');
  sideStripGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = sideStripGrad;
  roundRect(ctx, paddingX, sideY, railWidth, subGridH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawVerticalRotatedText(
    ctx,
    'SIDE',
    paddingX + railWidth / 2,
    sideY + subGridH / 2,
    'bold 15px "Outfit", -apple-system, sans-serif',
    '#ffffff'
  );

  // Renderização das Cartas do Side Deck (15 slots)
  for (let c = 0; c < subCols; c++) {
    const cX = gridX + c * (subCardW + subGap);
    const cY = sideY;

    if (c < sideCards.length) {
      const cardItem = sideCards[c];
      const img = imageMap.get(cardItem.cardId);

      if (img) {
        ctx.save();
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.clip();
        ctx.drawImage(img, cX, cY, subCardW, subCardH);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.stroke();
      } else {
        drawFallbackCard(ctx, cX, cY, subCardW, subCardH, cardItem.category, cardItem.cardName, true);
      }

      drawBanlistBadge(ctx, cX, cY, cardItem.banLimit, true);
    } else {
      drawEmptySlot(ctx, cX, cY, subCardW, subCardH, 'side', true);
    }
  }

  // ==========================================================
  // SEÇÃO 3: EXTRA DECK (RAIL LATERAL + GRID 15x1)
  // ==========================================================
  const extraY = sideY + subGridH + sectionGap;

  // Painel de Fundo do Extra Deck
  ctx.fillStyle = '#431407';
  roundRect(ctx, gridX - 4, extraY - 4, gridWidth + 8, subGridH + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rail Lateral do Extra Deck
  const extraStripGrad = ctx.createLinearGradient(0, extraY, 0, extraY + subGridH);
  extraStripGrad.addColorStop(0, '#ea580c');
  extraStripGrad.addColorStop(1, '#c2410c');
  ctx.fillStyle = extraStripGrad;
  roundRect(ctx, paddingX, extraY, railWidth, subGridH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawVerticalRotatedText(
    ctx,
    'EXTRA',
    paddingX + railWidth / 2,
    extraY + subGridH / 2,
    'bold 14px "Outfit", -apple-system, sans-serif',
    '#ffffff'
  );

  // Renderização das Cartas do Extra Deck (15 slots)
  for (let c = 0; c < subCols; c++) {
    const cX = gridX + c * (subCardW + subGap);
    const cY = extraY;

    if (c < extraCards.length) {
      const cardItem = extraCards[c];
      const img = imageMap.get(cardItem.cardId);

      if (img) {
        ctx.save();
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.clip();
        ctx.drawImage(img, cX, cY, subCardW, subCardH);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.stroke();
      } else {
        drawFallbackCard(ctx, cX, cY, subCardW, subCardH, cardItem.category, cardItem.cardName, true);
      }

      drawBanlistBadge(ctx, cX, cY, cardItem.banLimit, true);
    } else {
      drawEmptySlot(ctx, cX, cY, subCardW, subCardH, 'extra', true);
    }
  }

  // ==========================================================
  // RODAPÉ (FOOTER)
  // ==========================================================
  const footerY = extraY + subGridH + sectionGap;
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, footerY, width, footerH);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11.5px "Outfit", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Duel League • Gestão de Torneios', paddingX, footerY + footerH / 2);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Gerado em ${dateStr} às ${timeStr}`, width - paddingX, footerY + footerH / 2);

  // 6. Download do PNG gerado
  const cleanDeck = (deckData.deckName || 'Deck').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanPlayer = (deckData.playerName || 'Jogador').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `Decklist_${cleanDeck}_${cleanPlayer}`;

  downloadCanvasAsPNG(canvas, filename);
}
