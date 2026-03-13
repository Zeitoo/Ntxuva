/**
 * NTXUVA – App root
 *
 * Manages global settings (cols, difficulty) and uses a `key` prop on
 * <GameView> to force a full re-mount (and therefore a clean reset) whenever
 * settings change or the user presses the restart button.
 */

import { useState, type CSSProperties } from 'react';
import type { ColCount, Difficulty } from './types/GameTypes';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { GameInfo } from './components/GameInfo';
import { useGameLogic } from './hooks/useGameLogic';

// ─────────────────────────────────────────────
// Game view (mounted fresh on every new game)
// ─────────────────────────────────────────────

interface GameViewProps {
  cols: ColCount;
  difficulty: Difficulty;
}

function GameView({ cols, difficulty }: GameViewProps) {
  const game = useGameLogic(cols, difficulty);

  return (
    <>
      <GameInfo
        turn={game.turn}
        status={game.status}
        message={game.message}
        humanPieces={game.humanPieces}
        compPieces={game.compPieces}
        capturedByHuman={game.capturedByHuman}
        capturedByComputer={game.capturedByComputer}
        phase={game.phase}
        moveLog={game.moveLog}
      />

      <Board
        board={game.board}
        validMoves={game.validMoves}
        highlighted={game.highlighted}
        capturedCells={game.capturedCells}
        lastMoved={game.lastMoved}
        busy={game.busy}
        onHouseClick={game.handleHumanMove}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background:
    'linear-gradient(160deg, #120a06 0%, #1e0f08 50%, #120a06 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  position: 'relative',
  overflow: 'hidden',
};

const decorStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: `
    radial-gradient(ellipse at 20% 50%, rgba(180,100,20,0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 50%, rgba(180,100,20,0.06) 0%, transparent 60%),
    repeating-linear-gradient(
      -45deg, transparent, transparent 25px,
      rgba(180,100,20,0.025) 25px, rgba(180,100,20,0.025) 26px
    )`,
};

export default function App() {
  const [cols, setCols] = useState<ColCount>(7);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  // Incrementing this key forces GameView to remount (clean state reset)
  const [gameKey, setGameKey] = useState(0);

  const bump = () => setGameKey((k) => k + 1);

  const handleColsChange = (c: ColCount) => {
    setCols(c);
    bump();
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    bump();
  };

  return (
    <div style={pageStyle}>
      <div style={decorStyle} />

      <div style={{ width: '100%', maxWidth: 1000, position: 'relative', zIndex: 1 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                height: 1,
                flex: 1,
                background:
                  'linear-gradient(90deg, transparent, rgba(210,150,30,0.4))',
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(32px, 8vw, 58px)',
                fontWeight: 900,
                letterSpacing: '0.25em',
                color: '#d4a020',
                textShadow:
                  '0 0 50px rgba(212,160,32,0.35), 0 3px 0 #6b4010',
              }}
            >
              NTXUVA
            </h1>
            <div
              style={{
                height: 1,
                flex: 1,
                background:
                  'linear-gradient(90deg, rgba(210,150,30,0.4), transparent)',
              }}
            />
          </div>
          <p
            style={{
              margin: 0,
              color: '#7a5025',
              fontSize: 10,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
            }}
          >
            Jogo Africano Tradicional &nbsp;·&nbsp; Humano vs Computador
          </p>
        </div>

        {/* Game (remounts on key change) */}
        <GameView key={gameKey} cols={cols} difficulty={difficulty} />

        {/* Controls */}
        <Controls
          cols={cols}
          difficulty={difficulty}
          onColsChange={handleColsChange}
          onDifficultyChange={handleDifficultyChange}
          onReset={bump}
        />

        {/* Legend */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 12,
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(212,160,32,0.1)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                color: '#7a5025',
                fontSize: 10,
                letterSpacing: '0.2em',
                marginBottom: 6,
              }}
            >
              LEGENDA
            </div>
            {(
              [
                ['rgba(212,160,32,0.6)', 'Casa jogável'],
                ['#f0c040', 'Casa selecionada'],
                ['#40d060', 'Último movimento'],
                ['#e03030', 'Casa capturada'],
              ] as const
            ).map(([color, label]) => (
              <div
                key={label}
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#6a4020', fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Quick rules */}
          <div
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(212,160,32,0.1)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                color: '#7a5025',
                fontSize: 10,
                letterSpacing: '0.2em',
                marginBottom: 6,
              }}
            >
              REGRAS RÁPIDAS
            </div>
            {[
              'Fase 1: casa com > 1 peça. Fase 2: casas com 1 peça.',
              'Distribui no sentido anti-horário.',
              'Última peça em casa cheia → continua (Fase 1).',
              'Última peça em casa vazia do ataque → captura adversário.',
            ].map((rule) => (
              <div
                key={rule}
                style={{ color: '#6a4020', fontSize: 10, marginBottom: 3, lineHeight: 1.5 }}
              >
                • {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
