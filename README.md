# NTXUVA

**NTXUVA** é uma implementação digital do tradicional jogo de tabuleiro africano (também conhecido como **Mancala** ou **Ntxuva**), onde um jogador humano enfrenta o computador. O jogo segue as regras clássicas da variante praticada em Moçambique, com um tabuleiro de 4 linhas e número variável de colunas (7, 16 ou 22).

## ✨ Características

- Três tamanhos de tabuleiro: **7**, **16** ou **22** casas por linha.
- Três níveis de dificuldade para a IA:
  - **Fácil** – movimentos aleatórios.
  - **Médio** – prioriza capturar o máximo de peças possível.
  - **Difícil** – utiliza Minimax com poda alfa‑beta (profundidade 3).
- Efeitos sonoros gerados proceduralmente (Web Audio API) – sem arquivos externos.
- Interface com tema africano, indicadores visuais de fase, casas destacadas, último movimento e capturas.
- Regras completas com fases por jogador e continuação "apanha‑uma".

## 🎮 Como jogar

O jogo é jogado **Humano (peças amarelas) vs Computador (peças vermelhas)**.

### Fases do jogador

- **Fase 1** – o jogador possui pelo menos uma casa com mais de 1 peça no seu lado. **É obrigatório** jogar a partir de uma dessas casas (com >1 peça).
- **Fase 2** – todas as casas do jogador têm 0 ou 1 peça. O jogador pode escolher **qualquer casa** que tenha pelo menos 1 peça.

### Movimento

#### Fase 1 (distribuição com continuação)
1. O jogador **apanha todas as peças** da casa escolhida.
2. Distribui uma peça por casa no sentido **anti‑horário** (humano: linha 1 (ataque) ←, linha 0 (defesa) →; computador: linha 2 (ataque) →, linha 3 (defesa) ←).
3. Quando a última peça é colocada:
   - Se a casa de destino **já tinha peças** (não estava vazia), o jogador **apanha exatamente 1 peça** dessa casa e continua a distribuir com essa peça (passo 2).
   - Se a casa de destino **estava vazia**, a jogada termina e verifica‑se **captura**.

#### Fase 2 (movimento simples)
1. O jogador retira **1 peça** da casa escolhida e coloca‑a **na casa seguinte** (anti‑horário).
2. A jogada termina e verifica‑se **captura** na casa de destino.

### Captura
- A captura só acontece quando a **última peça** é colocada numa casa vazia da **linha de ataque** do jogador (linha 1 para humano, linha 2 para computador).
- São capturadas todas as peças da **coluna correspondente** do oponente:
  - Primeiro a linha de ataque do oponente (se houver).
  - Depois a linha de defesa do oponente (se houver).
- As peças capturadas são adicionadas à contagem do jogador e removidas do tabuleiro.

### Fim de jogo
O jogo termina quando **um dos jogadores fica com zero peças**.  
(Um jogador nunca fica sem movimentos válidos – se tem peças, sempre há uma casa jogável.)

---

## 🧠 Inteligência Artificial

A IA (jogador 0) utiliza três estratégias:

- **Fácil** – escolhe um movimento aleatório entre os válidos.
- **Médio** – entre os movimentos válidos, escolhe aquele que captura o maior número de peças (avaliação imediata).
- **Difícil** – aplica o algoritmo **Minimax com poda alfa‑beta** até a profundidade 3, considerando o saldo de peças como função de avaliação.

---

## 🔊 Sons

Todos os sons são gerados em tempo real com a **Web Audio API**, sem necessidade de arquivos `.mp3` ou `.wav`.  
Os efeitos incluem:

- `playSelect` – clique ao selecionar uma casa.
- `playPlace` – som de colocação de peça.
- `playContinuation` – sinal de continuação (apanha‑uma).
- `playCapture` – impacto de captura.
- `playWin` / `playLose` – fanfarras de vitória/derrota.
- `playAIThink` – pulso curto enquanto a IA "pensa".

O som pode ser desativado/ativado pelo botão de altifalante.

---

## 🛠️ Tecnologias utilizadas

- **React** (com Hooks) – interface declarativa.
- **TypeScript** – tipagem estática e maior robustez.
- **Web Audio API** – síntese sonora procedural.
- **CSS-in-JS** (estilos inline) – sem dependências externas de CSS.

---

## 📁 Estrutura do projecto

```
src/
├── components/
│   ├── Board.tsx          – Tabuleiro (4 linhas)
│   ├── Controls.tsx       – Seletores de tamanho/dificuldade, reset, som
│   ├── GameInfo.tsx       – Placar, fases, mensagem e histórico
│   └── House.tsx          – Casa individual com círculos e contador
├── hooks/
│   ├── useGameLogic.ts    – Lógica principal do jogo (estado e turnos)
│   └── useSounds.ts       – Gerador de sons via Web Audio
├── types/
│   └── GameTypes.ts       – Tipos partilhados (Board, Player, etc.)
├── utils/
│   ├── aiEngine.ts        – IA (fácil, médio, difícil)
│   └── gameEngine.ts      – Regras puras (movimentos, capturas, fases)
└── App.tsx                – Componente raiz
```

---

## 🚀 Como executar localmente

1. Certifique‑se de ter **Node.js** (versão 14 ou superior) e **npm** ou **yarn** instalados.
2. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/ntxuva.git
   cd ntxuva
   ```
3. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   # ou
   yarn start
   ```
5. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📝 Notas de implementação

- O estado do jogo é gerido inteiramente dentro do hook `useGameLogic`, que também orquestra os turnos humano/IA e os sons.
- O motor de jogo (`gameEngine.ts`) contém **funções puras** que manipulam o tabuleiro sem efeitos colaterais – facilitando testes e garantindo previsibilidade.
- A IA (`aiEngine.ts`) também é pura e depende apenas do estado do tabuleiro e da dificuldade.
- A árvore de componentes é simples: `App` → `GameView` (remonta com `key` para reset) → `Board`, `GameInfo`, `Controls`.

---
