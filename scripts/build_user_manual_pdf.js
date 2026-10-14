import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

function toBase64(filePath) {
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fileData.toString('base64')}`;
}

const assetsDir = path.resolve('public/tutorial_assets');
const logoB64 = toBase64(path.join(assetsDir, 'logo_edison.png'));

// Prints específicos enviados pelo usuário
const print3B64 = toBase64(path.join(assetsDir, 'print_3_roster.png'));   // Página 3
const print4B64 = toBase64(path.join(assetsDir, 'print_4_matches.png'));  // Página 4
const print5B64 = toBase64(path.join(assetsDir, 'print_5_decklist.png')); // Página 7

// Demais prints reais para páginas 2, 6 e 8
const rulesB64 = toBase64(path.join(assetsDir, 'mobile_edison_rules.png'));
const standingsB64 = toBase64(path.join(assetsDir, 'mobile_standings_tiebreaks.png'));
const reportB64 = toBase64(path.join(assetsDir, 'official_pdf_report.jpg'));

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário - Edison League</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090a0f;
      color: #e2e8f0;
      font-size: 11px;
      line-height: 1.45;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 16mm 18mm 18mm 18mm;
      position: relative;
      background: #0d0f17;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-bottom: 1px solid #1e2433;
    }

    /* HEADER & FOOTER ON CONTENT PAGES */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(245, 158, 11, 0.25);
      margin-bottom: 14px;
    }
    .page-header-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #fbbf24;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .page-header-subtitle {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }

    .page-footer {
      position: absolute;
      bottom: 12mm;
      left: 18mm;
      right: 18mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 9px;
      color: #64748b;
    }
    .page-footer .page-number {
      font-weight: 700;
      color: #fbbf24;
    }

    /* TYPOGRAPHY */
    h1, h2, h3, h4 {
      color: #ffffff;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    h2.section-title {
      font-size: 18px;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .section-desc {
      font-size: 11.5px;
      color: #94a3b8;
      margin-bottom: 14px;
      line-height: 1.4;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-gold {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .badge-emerald {
      background: rgba(16, 185, 129, 0.18);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .badge-blue {
      background: rgba(59, 130, 246, 0.18);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.4);
    }
    .badge-purple {
      background: rgba(168, 85, 247, 0.18);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.4);
    }

    /* GRID & LAYOUTS */
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    .two-cols-mobile {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 16px;
      align-items: start;
    }

    .card {
      background: #141724;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .card-gold {
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ALINHAMENTO PERFEITO DAS 5 ABAS (GRID) */
    .tabs-guide-grid {
      display: grid;
      grid-template-columns: 105px 1fr;
      row-gap: 10px;
      column-gap: 12px;
      align-items: center;
      margin-top: 6px;
    }
    .tab-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 105px;
      padding: 5px 0;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: center;
      box-sizing: border-box;
    }
    .tab-desc {
      font-size: 10.5px;
      color: #cbd5e1;
      line-height: 1.4;
    }

    .step-item {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    .step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #f59e0b;
      color: #000;
      font-weight: 900;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      flex: 1;
    }
    .step-text strong {
      color: #f8fafc;
      font-size: 11.5px;
      display: block;
      margin-bottom: 2px;
    }
    .step-text p {
      color: #94a3b8;
      font-size: 10.5px;
      line-height: 1.4;
    }

    /* PHONE FRAME */
    .phone-mockup {
      background: #000000;
      border: 3px solid #2d3345;
      border-radius: 24px;
      padding: 6px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 240px;
      margin: 0 auto;
    }
    .phone-mockup img {
      width: 100%;
      height: auto;
      border-radius: 18px;
      display: block;
    }
    .phone-caption {
      font-size: 9.5px;
      color: #cbd5e1;
      text-align: center;
      margin-top: 6px;
      font-weight: 600;
    }

    /* TIEBREAK BOXES */
    .tiebreak-card {
      background: #131622;
      border-left: 3px solid #f59e0b;
      border-radius: 0 6px 6px 0;
      padding: 9px 12px;
      margin-bottom: 8px;
    }
    .tiebreak-num {
      font-size: 10px;
      font-weight: 800;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tiebreak-name {
      font-size: 12px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 3px;
    }
    .tiebreak-desc {
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.35;
    }

    /* TABLE */
    .modern-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 8px;
    }
    .modern-table th {
      background: #161a29;
      color: #fbbf24;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
    }
    .modern-table td {
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
    }
    .modern-table tr:nth-child(even) td {
      background: rgba(255, 255, 255, 0.02);
    }

    /* COVER PAGE */
    .cover-page {
      background: radial-gradient(circle at 50% 25%, #231c0e 0%, #0e1017 60%, #08090d 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 30mm 20mm;
    }
    .cover-top {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .cover-logo {
      width: 110px;
      height: 110px;
      margin-bottom: 18px;
      filter: drop-shadow(0 0 25px rgba(245, 158, 11, 0.5));
    }
    .cover-badge-top {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .cover-title {
      font-size: 32px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.15;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: -0.02em;
    }
    .cover-title span {
      background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-subtitle {
      font-size: 13.5px;
      color: #94a3b8;
      max-width: 480px;
      line-height: 1.45;
      margin-bottom: 24px;
    }

    .cover-features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      width: 100%;
      max-width: 520px;
      text-align: left;
      margin-bottom: 20px;
    }
    .cover-feat-box {
      background: rgba(20, 24, 38, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .cover-feat-box strong {
      color: #fbbf24;
      font-size: 11px;
      display: block;
      margin-bottom: 2px;
    }
    .cover-feat-box p {
      color: #94a3b8;
      font-size: 10px;
    }

    .cover-meta {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 14px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
    }
    .cover-meta strong {
      color: #cbd5e1;
    }
  </style>
</head>
<body>

  <!-- ===================================================================== -->
  <!-- PÁGINA 1: CAPA OFICIAL                                                -->
  <!-- ===================================================================== -->
  <div class="page cover-page">
    <div class="cover-top">
      <img src="${logoB64}" class="cover-logo" alt="Edison League Logo" />
      <div class="cover-badge-top">Guia Oficial do Usuário • Versão Mobile &amp; Web</div>
      <h1 class="cover-title">EDISON LEAGUE<br><span>MANUAL DO USUÁRIO</span></h1>
      <p class="cover-subtitle">
        Guia completo para gerenciamento de torneios de Yu-Gi-Oh!, sorteio suíço oficial, aplicação dos critérios de desempate e simulador oficial de decklists Edison 2010.
      </p>

      <div class="cover-features-grid">
        <div class="cover-feat-box">
          <strong>⚔️ Sistema Suíço Oficial Konami</strong>
          <p>Sorteio automatizado, sem repetições e com cronômetro de 40 min.</p>
        </div>
        <div class="cover-feat-box">
          <strong>⚖️ 5 Critérios de Desempate TCG</strong>
          <p>Confronto Direto, OMW%, OGW%, Saldo de Games e Games Vencidos com pontuação.</p>
        </div>
        <div class="cover-feat-box">
          <strong>🏆 Pódio e Relatórios Oficiais</strong>
          <p>Exportação de relatórios em PDF para impressão e cartazes Top 3 em alta resolução.</p>
        </div>
        <div class="cover-feat-box">
          <strong>📜 Banco Edison com 3.660 Cartas</strong>
          <p>Construtor visual de decklists, banlist de 2010 e exportação PNG em alta resolução.</p>
        </div>
      </div>
    </div>

    <div class="cover-meta">
      <div>Desenvolvido para: <strong>Liga Edison Yu-Gi-Oh! TCG</strong></div>
      <div>Plataforma: <strong>PWA iOS / APK Android / Web</strong></div>
      <div>Edição: <strong>2010 • Atualizado em 2026</strong></div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 2: INTRODUÇÃO & NAVEGAÇÃO MOBILE                               -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 1 • INTRODUÇÃO E NAVEGAÇÃO</div>
    </div>

    <h2 class="section-title">📱 Introdução &amp; Navegação no Celular</h2>
    <p class="section-desc">
      O <strong>Edison League</strong> foi projetado especificamente para proporcionar a melhor experiência de gestão de torneios tanto em computadores quanto na tela do seu smartphone (iOS e Android), operando de forma 100% responsiva e rápida.
    </p>

    <div class="two-cols-mobile">
      <div>
        <div class="card card-gold">
          <div class="card-title">📲 Como Instalar o App no seu Smartphone</div>
          <p style="font-size: 10.5px; color: #cbd5e1; margin-bottom: 6px;">
            Você pode instalar o app diretamente no celular para abrir em tela cheia com ícone oficial, sem barras de navegador:
          </p>
          <ul style="padding-left: 14px; font-size: 10px; color: #94a3b8; line-height: 1.5;">
            <li><strong style="color: #fff;">No iPhone (iOS):</strong> Abra no Safari, toque no botão central de <em>Compartilhar</em> e selecione <em>"Adicionar à Tela de Início"</em>.</li>
            <li><strong style="color: #fff;">No Android:</strong> Baixe e instale o pacote <code>EdisonLeague.apk</code> ou selecione <em>"Instalar Aplicativo"</em> no menu do Chrome.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-title">🧭 As 5 Abas do Menu Principal</div>
          
          <div class="tabs-guide-grid">
            <div class="tab-badge badge-gold">🏆 Ranking</div>
            <div class="tab-desc">Classificação geral acumulada da liga com vitórias, derrotas e aproveitamento de cada duelista.</div>

            <div class="tab-badge badge-emerald">⚔️ Torneio</div>
            <div class="tab-desc">Área central do evento ativo: criação, sorteio suíço, cronômetro, mesas e lançamento de placares.</div>

            <div class="tab-badge badge-blue">👥 Jogadores</div>
            <div class="tab-desc">Cadastro de duelistas, histórico pessoal de partidas, decks utilizados e taxas de vitória.</div>

            <div class="tab-badge badge-purple">🕒 Histórico</div>
            <div class="tab-desc">Registro de torneios passados com consulta de mesas, exportação de relatórios em PDF/PNG e edição retroativa.</div>

            <div class="tab-badge badge-gold">⚙️ Regras</div>
            <div class="tab-desc">Consulta completa da Banlist oficial de 2010 e guia das mecânicas históricas de Edison (Ignition Priority, etc.).</div>
          </div>
        </div>

        <div class="card" style="background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3);">
          <div class="card-title" style="color: #34d399;">💾 Salvamento Automático &amp; Offline</div>
          <p style="font-size: 10px; color: #cbd5e1;">
            Todos os dados de jogadores, torneios em andamento e decklists são sincronizados e salvos automaticamente. Caso feche o navegador ou perca conexão, você pode continuar exatamente de onde parou.
          </p>
        </div>
      </div>

      <div>
        <div class="phone-mockup">
          <img src="${rulesB64}" alt="Regras Edison e Navegação Mobile" />
          <div class="phone-caption">Navegação e Consulta de Regras no Celular</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 2</div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 3: CRIAÇÃO DO TORNEIO & SORTEIO (PRINT Nº 3)                   -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 2 • CRIAÇÃO DO TORNEIO &amp; SORTEIO</div>
    </div>

    <h2 class="section-title">⚔️ Criação do Torneio &amp; Sorteio de Duelistas</h2>
    <p class="section-desc">
      A criação de um novo torneio na aba <strong>Torneio</strong> é intuitiva, rápida e conta com ferramentas inteligentes para buscar participantes e associar decklists oficiais.
    </p>

    <div class="two-cols-mobile">
      <div>
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-text">
            <strong>Identificação e Data</strong>
            <p>Defina o nome do torneio (ex: <em>Torneio Edison #14/10/2026</em>) e confirme a data de realização.</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-text">
            <strong>Número de Rodadas (Tabela Oficial Konami)</strong>
            <p>O aplicativo sugere automaticamente a quantidade de rodadas recomendada para o total de jogadores selecionados, permitindo também ajuste manual (ex: 3, 4 ou 5 rodadas):</p>
            <table class="modern-table">
              <tr><th>Participantes</th><th>Rodadas Sugeridas</th><th>Top Cut Sugerido</th></tr>
              <tr><td>4 a 8 Duelistas</td><td>3 Rodadas</td><td>Top 2 / Top 4</td></tr>
              <tr><td>9 a 16 Duelistas</td><td>4 Rodadas</td><td>Top 4 / Top 8</td></tr>
              <tr><td>17 a 32 Duelistas</td><td>5 Rodadas</td><td>Top 8</td></tr>
            </table>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-text">
            <strong>Busca Rápida de Jogadores (Sem Pré-seleção)</strong>
            <p>Os jogadores começam desmarcados por padrão. Utilize o <strong>campo de busca em tempo real</strong> para digitar o nome do duelista e marcá-lo rapidamente com um toque.</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-text">
            <strong>Definição dos Decks &amp; Construtor de Decklist</strong>
            <p>Ao lado de cada jogador selecionado, você pode digitar o nome do deck (ex: <em>Blackwing, Frog Monarch, Quickdraw</em>) ou tocar no botão <strong>+Decklist</strong> para montar ou carregar a lista completa de cartas.</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-text">
            <strong>Geração da 1ª Rodada</strong>
            <p>Ao tocar em <em>"Iniciar Torneio da Liga e Gerar 1ª Rodada"</em>, o sistema sorteia os confrontos iniciais e abre o painel das mesas ativas.</p>
          </div>
        </div>
      </div>

      <div>
        <div class="phone-mockup">
          <img src="${print3B64}" alt="Criação do Torneio no Celular (Print 3)" />
          <div class="phone-caption">Tela Oficial de Criação &amp; Busca de Duelistas</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 3</div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 4: CONDUÇÃO DAS RODADAS & CRONÔMETRO (PRINT Nº 4)              -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 3 • RODADAS, CRONÔMETRO &amp; PLACARES</div>
    </div>

    <h2 class="section-title">⏱️ Condução das Rodadas &amp; Lançamento de Placares</h2>
    <p class="section-desc">
      O sistema suíço organiza o sorteio das mesas rodada a rodada, garantindo que duelistas enfrentem adversários de pontuação equivalente e nunca repitam o mesmo oponente.
    </p>

    <div class="two-cols-mobile">
      <div>
        <div class="card card-gold">
          <div class="card-title">⏳ Cronômetro Oficial de 40 Minutos</div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 4px;">
            Cada rodada possui um cronômetro regressivo com tempo padrão oficial de <strong>40 minutos</strong> (padrão Best of 3 / Bo3):
          </p>
          <ul style="padding-left: 14px; font-size: 9.5px; color: #94a3b8; line-height: 1.45;">
            <li><strong>Iniciar / Pausar:</strong> Controle o tempo da rodada com um toque.</li>
            <li><strong>Editar Tempo:</strong> Adicione minutos extras facilmente (+1 min, +5 min) para casos de prorrogação ou time call.</li>
            <li><strong>Alerta Sonoro/Visual:</strong> Notificação clara quando o tempo regulamentar se esgota.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-title">🎯 Registro Rápido de Resultados por Mesa</div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 6px;">
            Cada mesa de duelo possui botões de atalho rápido para registrar os games vencidos com pontuação direta:
          </p>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
            <span class="badge badge-gold">2-0</span>
            <span class="badge badge-gold">2-1</span>
            <span class="badge badge-blue">1-2</span>
            <span class="badge badge-blue">0-2</span>
            <span class="badge badge-purple">1-1 (Empate)</span>
          </div>
          <p style="font-size: 9.5px; color: #94a3b8;">
            Também é possível marcar vitória por <strong>WO</strong> caso um duelista não compareça no prazo regulamentar.
          </p>
        </div>

        <div class="card">
          <div class="card-title">🛠️ Ferramentas Administrativas de Rodada</div>
          <ul style="padding-left: 14px; font-size: 9.5px; color: #cbd5e1; line-height: 1.45;">
            <li><strong style="color: #ef4444;">Drop de Jogador:</strong> Permite retirar um duelista que precisou abandonar o torneio, sem afetar as rodadas anteriores nem gerar erros nas rodadas futuras.</li>
            <li><strong style="color: #34d399;">Adicionar Jogador:</strong> Possibilita incluir um duelista tardio a partir da rodada seguinte.</li>
            <li><strong style="color: #fbbf24;">Voltar Rodada:</strong> Se algum placar foi preenchido por engano, você pode retroceder uma rodada e corrigir os resultados com recálculo automático instantâneo.</li>
          </ul>
        </div>
      </div>

      <div>
        <div class="phone-mockup">
          <img src="${print4B64}" alt="Mesas e Cronômetro (Print 4)" />
          <div class="phone-caption">Painel de Mesas, Cronômetro 40 min &amp; Bo3</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 4</div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 5: REGRA DO BY (FOLGA COM SALDO 0)                             -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 4 • REGRA DO BY &amp; JUSTIÇA DE DESEMPATE</div>
    </div>

    <h2 class="section-title">🏆 Regra Oficial do BY (Folga por Número Ímpar)</h2>
    <p class="section-desc">
      Quando o torneio possui um número ímpar de participantes em uma rodada, exatamente um duelista recebe folga automática (BY). Veja abaixo como o app calcula com precisão essa pontuação.
    </p>

    <div class="card card-gold" style="margin-bottom: 14px;">
      <div class="card-title" style="font-size: 13px; color: #fbbf24;">
        ⭐ Pontuação Oficial Aplicada no BY: +3 Pontos &amp; Saldo 0 de Games
      </div>
      <p style="font-size: 11px; color: #e2e8f0; line-height: 1.5;">
        O duelista que recebe BY é bonificado com a vitória no match (<strong>+3 Pontos</strong> na classificação). No entanto, para o cálculo do 4º critério de desempate (Saldo de Games), o sistema atribui <strong>0 games vencidos e 0 games perdidos (Saldo 0)</strong>, em vez de conceder +2 games virtuais.
      </p>
    </div>

    <div class="two-cols">
      <div class="card">
        <div class="card-title">⚖️ Por que o Saldo 0 é a Regra Mais Justa?</div>
        <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45; margin-bottom: 8px;">
          Em torneios competitivos de Yu-Gi-Oh!, atribuir placar fictício de 2x0 (+2 de saldo) para quem recebeu folga cria uma distorção severa:
        </p>
        <ul style="padding-left: 14px; font-size: 9.5px; color: #94a3b8; line-height: 1.45;">
          <li>Um duelista que jogou na mesa e venceu por 2x1 teve mérito esportivo, mas ficaria com saldo +1, sendo ultrapassado por alguém que não jogou e ganhou +2 de presente.</li>
          <li>Com a nossa regra (<strong>Saldo 0</strong>), o jogador ganha os 3 pontos merecidos da vitória, mas seu desempate de games reflete estritamente o que ele produziu nos jogos em que duelou.</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">🔄 Prevenção de Repetição de BY</div>
        <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45; margin-bottom: 8px;">
          O motor de sorteio suíço respeita regras estritas para a atribuição de BYs:
        </p>
        <ul style="padding-left: 14px; font-size: 9.5px; color: #94a3b8; line-height: 1.45;">
          <li><strong>Sem Repetição:</strong> Nenhum duelista pode receber mais de 1 BY no mesmo torneio, a menos que matematicamente todos os outros já tenham recebido.</li>
          <li><strong>Critério de Sorteio:</strong> Conforme diretrizes oficiais Konami, o BY é atribuído preferencialmente aos duelistas com menor pontuação na rodada.</li>
        </ul>
      </div>
    </div>

    <div class="card" style="margin-top: 6px;">
      <div class="card-title">📊 Resumo Visual da Pontuação de Cada Resultado</div>
      <table class="modern-table">
        <thead>
          <tr>
            <th>Resultado da Partida</th>
            <th>Pontos no Torneio</th>
            <th>Games Vencidos / Perdidos</th>
            <th>Saldo no Desempate (4º Critério)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong style="color: #34d399;">Vitória 2 x 0</strong></td>
            <td>+3 Pontos</td>
            <td>2V - 0D</td>
            <td><strong style="color: #34d399;">+2</strong></td>
          </tr>
          <tr>
            <td><strong style="color: #34d399;">Vitória 2 x 1</strong></td>
            <td>+3 Pontos</td>
            <td>2V - 1D</td>
            <td><strong style="color: #34d399;">+1</strong></td>
          </tr>
          <tr>
            <td><strong style="color: #fbbf24;">Vitória por BY (Folga)</strong></td>
            <td><strong>+3 Pontos</strong></td>
            <td>0V - 0D</td>
            <td><strong style="color: #fbbf24;">0 (Neutro)</strong></td>
          </tr>
          <tr>
            <td><strong style="color: #a855f7;">Empate 1 x 1</strong></td>
            <td>+1 Ponto</td>
            <td>1V - 1D</td>
            <td><strong>0 (Neutro)</strong></td>
          </tr>
          <tr>
            <td><strong style="color: #ef4444;">Derrota 1 x 2</strong></td>
            <td>0 Pontos</td>
            <td>1V - 2D</td>
            <td><strong style="color: #ef4444;">-1</strong></td>
          </tr>
          <tr>
            <td><strong style="color: #ef4444;">Derrota 0 x 2</strong></td>
            <td>0 Pontos</td>
            <td>0V - 2D</td>
            <td><strong style="color: #ef4444;">-2</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 5</div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 6: OS 5 CRITÉRIOS OFICIAIS DE DESEMPATE                        -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 5 • CRITÉRIOS DE DESEMPATE TCG</div>
    </div>

    <h2 class="section-title">⚖️ Os 5 Critérios Oficiais de Desempate</h2>
    <p class="section-desc">
      Quando dois ou mais duelistas terminam o torneio com o mesmo número de pontos, o aplicativo aplica rigorosamente a hierarquia oficial da Konami com pontuação detalhada.
    </p>

    <div class="two-cols-mobile">
      <div>
        <!-- CRITÉRIO 1 -->
        <div class="tiebreak-card">
          <div class="tiebreak-num">1º Critério de Desempate</div>
          <div class="tiebreak-name">Confronto Direto (Head-to-Head)</div>
          <div class="tiebreak-desc">
            Se os duelistas empatados em pontos já se enfrentaram no torneio, quem venceu o duelo direto fica à frente na tabela.
          </div>
        </div>

        <!-- CRITÉRIO 2 -->
        <div class="tiebreak-card">
          <div class="tiebreak-num">2º Critério de Desempate</div>
          <div class="tiebreak-name">Opponent Match Win % (OMW%) — Força dos Oponentes</div>
          <div class="tiebreak-desc">
            Média da taxa de vitórias dos adversários que o duelista enfrentou. Conforme a regra Konami, qualquer oponente com aproveitamento inferior a 33.33% é arredondado para o piso de 0.33, evitando punir quem enfrentou duelistas azarados. Enfrentar oponentes fortes valoriza sua campanha.
          </div>
        </div>

        <!-- CRITÉRIO 3 -->
        <div class="tiebreak-card">
          <div class="tiebreak-num">3º Critério de Desempate</div>
          <div class="tiebreak-name">Opponent Game Win % (OGW%) — Games dos Oponentes</div>
          <div class="tiebreak-desc">
            Média do percentual de games individuais vencidos por todos os adversários enfrentados pelo duelista (também com piso de 33.33%).
          </div>
        </div>

        <!-- CRITÉRIO 4 -->
        <div class="tiebreak-card">
          <div class="tiebreak-num">4º Critério de Desempate</div>
          <div class="tiebreak-name">Saldo de Games (Game Difference / Game Diff)</div>
          <div class="tiebreak-desc">
            Saldo líquido calculado por: <em>(Games Ganhos - Games Perdidos)</em>. Quem vence partidas com menos derrotas individuais possui saldo superior. <em>(BY conta como saldo 0)</em>.
          </div>
        </div>

        <!-- CRITÉRIO 5 -->
        <div class="tiebreak-card">
          <div class="tiebreak-num">5º Critério de Desempate</div>
          <div class="tiebreak-name">Games Vencidos (Games Won)</div>
          <div class="tiebreak-desc">
            Número total bruto de games individuais vencidos ao longo do evento.
          </div>
        </div>

        <div class="card card-gold" style="margin-top: 6px;">
          <div class="card-title">💡 Observações de Desempate na Tabela</div>
          <p style="font-size: 9.5px; color: #cbd5e1; line-height: 1.4;">
            Abaixo da classificação, o app detalha com pontuação exata o motivo do desempate (ex: <em>"Vitor (1º) superou Caique (2º) pelo critério OMW% (58.3% vs 56.3%) — enfrentou adversários com melhor aproveitamento"</em>).
          </p>
        </div>
      </div>

      <div>
        <div class="phone-mockup">
          <img src="${standingsB64}" alt="Classificação e Desempate" />
          <div class="phone-caption">Tabela de Classificação &amp; Pontuação</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 6</div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 7: SIMULADOR DE DECKLIST EDISON (PRINT Nº 5)                   -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 6 • SIMULADOR DE DECKLIST EDISON</div>
    </div>

    <h2 class="section-title">🃏 Construtor e Simulador de Decklists Edison</h2>
    <p class="section-desc">
      O aplicativo possui uma biblioteca completa com as <strong>3.660 cartas oficiais</strong> lançadas até o formato Edison (2010), com validador de banlist e exportação em imagem.
    </p>

    <div class="two-cols-mobile">
      <div>
        <div class="card card-gold">
          <div class="card-title">📦 Estrutura Oficial de Decks</div>
          <ul style="padding-left: 14px; font-size: 10px; color: #cbd5e1; line-height: 1.45;">
            <li><strong>Main Deck:</strong> Mínimo 40 e máximo 60 cartas. O app exibe alerta amarelo automático caso o deck tenha menos de 40 cartas.</li>
            <li><strong>Extra Deck:</strong> Máximo de 15 cartas (Monstros Synchro e Fusão).</li>
            <li><strong>Side Deck:</strong> Máximo de 15 cartas para trocas entre duelos.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-title">🚫 Validação Automática da Banlist de 2010</div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 6px;">
            Cada carta adicionada tem seu limite verificado instantaneamente com badges visuais sobre a ilustração:
          </p>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444;">🚫 Proibida (0)</span>
            <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b;">1️⃣ Limitada (1)</span>
            <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6;">2️⃣ Semi-Limitada (2)</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">🔍 Busca Rápida &amp; Filtros de Categoria</div>
          <p style="font-size: 10px; color: #94a3b8; line-height: 1.4;">
            Na aba <em>"Buscar &amp; Adicionar Cartas"</em>, filtre facilmente por <strong>Monstros, Magias, Armadilhas ou Extra Deck</strong> e digite o nome de qualquer carta para adicionar ao Main ou Side Deck com apenas 1 clique.
          </p>
        </div>

        <div class="card" style="background: rgba(168, 85, 247, 0.08); border-color: rgba(168, 85, 247, 0.3);">
          <div class="card-title" style="color: #c084fc;">🖼️ Exportar Decklist em Imagem PNG</div>
          <p style="font-size: 10px; color: #cbd5e1; line-height: 1.4;">
            Toque no botão <strong>PNG</strong> para gerar instantaneamente a imagem completa do seu decklist em alta resolução, com todas as artes separadas em Main, Extra e Side Deck, pronta para postar e compartilhar.
          </p>
        </div>
      </div>

      <div>
        <div class="phone-mockup">
          <img src="${print5B64}" alt="Simulador de Decklist no Celular (Print 5)" />
          <div class="phone-caption">Visão Geral do Decklist Oficial Edison</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 7</div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- PÁGINA 8: EXPORTAÇÕES, RANKING GERAL & REGRAS ESPECIAIS               -->
  <!-- ===================================================================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-title">⚡ EDISON LEAGUE • MANUAL DO USUÁRIO</div>
      <div class="page-header-subtitle">SEÇÃO 7 • EXPORTAÇÕES &amp; REGRAS DE 2010</div>
    </div>

    <h2 class="section-title">📊 Exportações de Relatórios &amp; Regras de Edison</h2>
    <p class="section-desc">
      O encerramento do torneio permite gerar relatórios oficiais em PDF, cartazes com o pódio do Top 3 em imagem PNG e consultar regras históricas da época.
    </p>

    <div class="two-cols-mobile">
      <div>
        <div class="card card-gold">
          <div class="card-title">📄 Exportação Oficial em PDF do Torneio</div>
          <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45; margin-bottom: 6px;">
            Gera um documento no padrão Konami A4 pronto para imprimir ou salvar, contendo:
          </p>
          <ul style="padding-left: 14px; font-size: 9.5px; color: #94a3b8; line-height: 1.45;">
            <li>Pódio visual com molduras de Campeão, Vice e Bronze.</li>
            <li>Tabela completa com Pontos, V-E-D, Games, Saldo, PMW%, OMW%, PGW% e OGW%.</li>
            <li>Todas as rodadas com sorteio de confrontos mesa a mesa e placares.</li>
            <li>Quadro detalhado de observações de desempate.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-title">🖼️ Exportação em PNG (Cartaz de Resultados)</div>
          <p style="font-size: 10px; color: #cbd5e1; line-height: 1.4;">
            Gera uma imagem de página única de alta definição com design escuro elegante para compartilhar no WhatsApp, Instagram e grupos da comunidade.
          </p>
        </div>

        <div class="card">
          <div class="card-title">🔥 3 Principais Regras Históricas de Edison (2010)</div>
          <ul style="padding-left: 14px; font-size: 9.5px; color: #cbd5e1; line-height: 1.45;">
            <li><strong style="color: #fbbf24;">1. Prioridade de Invocação (Ignition Priority):</strong> Ao invocar um monstro com efeito de ignição (ex: <em>Judgment Dragon, Chaos Sorcerer</em>), o jogador do turno pode ativar o efeito antes que o oponente responda com cartas como <em>Bottomless Trap Hole</em> ou <em>Torrential Tribute</em>.</li>
            <li><strong style="color: #60a5fa;">2. Saque no Turno 1:</strong> O jogador que inicia a partida compra normalmente na Draw Phase, começando com 6 cartas na mão.</li>
            <li><strong style="color: #f472b6;">3. Regra de Magia de Campo Única:</strong> Apenas 1 Magia de Campo pode coexistir na mesa inteira. Ativar uma nova destrói a anterior por regra.</li>
          </ul>
        </div>
      </div>

      <div>
        <div style="background: #141724; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 6px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6); text-align: center;">
          <img src="${reportB64}" alt="Relatório Oficial em PDF" style="width: 100%; height: auto; border-radius: 4px; display: block;" />
          <div class="phone-caption">Exemplo do Relatório Oficial de Torneio</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Edison League • Sistema Suíço Oficial</div>
      <div class="page-number">Página 8</div>
    </div>
  </div>

</body>
</html>
`;

async function buildPDF() {
  console.log('Iniciando compilação do Manual do Usuário em PDF com as novas imagens e textos...');
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // 1. Salvar no diretório raiz do projeto
  const rootPdfPath = path.resolve('Manual_do_Usuario_Edison_League.pdf');
  await page.pdf({
    path: rootPdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  console.log('PDF gerado no diretório raiz:', rootPdfPath);

  // 2. Salvar na pasta public para download direto no aplicativo
  const publicPdfPath = path.resolve('public/Manual_do_Usuario_Edison_League.pdf');
  fs.copyFileSync(rootPdfPath, publicPdfPath);
  console.log('PDF copiado para public:', publicPdfPath);

  await browser.close();
  console.log('Processo concluído com sucesso!');
}

buildPDF().catch((err) => {
  console.error('Erro na geração do PDF:', err);
  process.exit(1);
});
