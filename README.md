# 🏆 Edison League - Yu-Gi-Oh! Tournament & League Manager

Sistema completo de gerenciamento de torneios (Sistema Suíço) e classificação contínua de liga para o formato retro **Yu-Gi-Oh! Edison Format (2010)**.

O aplicativo foi desenvolvido com arquitetura web moderna (React + TypeScript + Vite) com design responsivo **Mobile-First**, pronto para ser usado no navegador, instalado como PWA ou empacotado como aplicativo executável nativo (Android APK) via Capacitor.

---

## ⚡ Como Executar no Computador

### Opção 1: Clique Duplo (Windows)
Basta dar duplo clique no arquivo:
👉 `Iniciar Edison League.bat`

### Opção 2: Terminal
```bash
npm run dev
```
Acesse no seu navegador: `http://localhost:5173/`

---

## 📱 Como Usar no Celular (Executável / App)

### Método 1: PWA (Instalação Direta sem Compilar)
1. Inicie o servidor no computador na mesma rede Wi-Fi (`npm run dev -- --host`).
2. Acesse pelo celular o endereço IP mostrado (ex: `http://192.168.x.x:5173`).
3. No navegador do celular (Chrome ou Safari), toque no menu e selecione **"Adicionar à Tela Inicial"** ou **"Instalar Aplicativo"**.
4. O app terá ícone exclusivo, tela cheia e funcionará offline!

### Método 2: Gerar APK Android com Capacitor
Para criar um arquivo `.apk` executável nativo:
```bash
# 1. Gerar a build de produção
npm run build

# 2. Instalar o Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. Inicializar o projeto Capacitor
npx cap init "YuGiOh Edison" "com.yugioh.edison"

# 4. Adicionar plataforma Android e sincronizar
npx cap add android
npx cap copy

# 5. Abrir no Android Studio para gerar o APK
npx cap open android
```
No Android Studio, clique em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 📜 Regras do Formato e Sistema de Pontuação

### 1. Confrontos Melhor de 3 (Bo3)
- **2 vitórias (2x0 ou 2x1)** = **3 pontos** de torneio
- **1 vitória (1x1 empate por tempo ou 1x0)** = **1 ponto** de torneio
- **WO (Walkover)** = **3 pontos** para o vencedor
- **Derrota (0x2 ou 1x2)** = **0 pontos**

### 2. Regra do BY (Número Ímpar de Jogadores)
- Caso o número de duelistas seja ímpar, sobra 1 jogador que recebe **BY** (folga automática).
- O BY concede vitória automática (**+3 pontos** e **2-0** de games).
- ⚠️ **Critério de Desempate Estrito:** Em caso de empate de pontos no término do torneio, quem ficou de BY terá a **menor prioridade** no desempate entre os empatados.
- O sistema evita conceder BY mais de uma vez para o mesmo jogador. A partir da rodada 2, o BY é concedido ao jogador de menor pontuação que ainda não teve BY.

### 3. Sorteio Suíço Adaptado (Edison Swiss)
- **Rodada 1:** Sorteio puramente aleatório entre todos os participantes. Se ímpar, 1 BY aleatório.
- **Rodadas 2 em diante:**
  - Vencedores só enfrentam vencedores, perdedores enfrentam perdedores (brackets de pontuação).
  - Se um grupo de pontuação tiver número ímpar, o jogador pareado para baixo (*pair-down*) enfrenta o **mais pontuado dos perdedores** (priorizando quem venceu games, ex: quem perdeu 1-2 antes de quem perdeu 0-2).
  - O sistema impede repetições de confrontos (*rematches*) no mesmo torneio.

### 4. Tabela de Classificação da Liga
Colunas oficiais integradas:
- **Posição:** Posição geral na temporada
- **Player:** Nome do duelista (com deck favorito e idade)
- **Pontuação:** Pontos acumulados da liga
- **Vitórias:** Partidas ganhas
- **Empates:** Partidas empatadas
- **Derrotas:** Partidas perdidas
- **Participações:** Quantidade de torneios disputados
- **Troféus:** Por enquanto igual ao número de vitórias acumuladas

---

## 💾 Persistência e Backup
- Todos os dados ficam salvos no `localStorage` do dispositivo.
- Você pode **Exportar Backup (JSON)** e **Importar Backup (JSON)** na aba **Ajustes & Regras** para trocar de aparelho ou salvar suas temporadas.
