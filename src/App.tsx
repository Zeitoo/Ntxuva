/**
 * NTXUVA – App root
 *
 * Manages global settings (cols, difficulty).
 * Incrementing `gameKey` forces a full GameView remount for a clean reset.
 */

import { useState, type CSSProperties } from 'react';
import type { ColCount, Difficulty } from './types/GameTypes';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { GameInfo } from './components/GameInfo';
import { useGameLogic } from './hooks/useGameLogic';

// ─────────────────────────────────────────────
// GameView (remounts on key change for clean state)
// ─────────────────────────────────────────────

interface GameViewProps { cols: ColCount; difficulty: Difficulty }

function GameView({ cols, difficulty }: GameViewProps) {
  const g = useGameLogic(cols, difficulty);

  return (
    <>
      <GameInfo
        turn={g.turn}
        status={g.status}
        message={g.message}
        humanPieces={g.humanPieces}
        compPieces={g.compPieces}
        capturedByHuman={g.capturedByHuman}
        capturedByComputer={g.capturedByComputer}
        humanPhase={g.humanPhase}
        compPhase={g.compPhase}
        moveLog={g.moveLog}
      />

      <Board
        board={g.board}
        validMoves={g.validMoves}
        highlighted={g.highlighted}
        capturedCells={g.capturedCells}
        lastMoved={g.lastMoved}
        busy={g.busy}
        onHouseClick={g.handleHumanMove}
      />

      {/* Inline Controls: sound toggle + reset need to be inside GameView
          so they have access to toggleSound and resetGame from the hook.   */}
      <Controls
        cols={cols}
        difficulty={difficulty}
        soundEnabled={g.soundEnabled}
        onDifficultyChange={() => { /* managed by parent — no-op here */ }}
        onColsChange={() => { /* managed by parent — no-op here */ }}
        onReset={g.resetGame}
        onToggleSound={g.toggleSound}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #120a06 0%, #1e0f08 50%, #120a06 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif",
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
  const [cols,       setCols]       = useState<ColCount>(7);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameKey,    setGameKey]    = useState(0);

  const bump             = () => setGameKey((k) => k + 1);
  const handleCols       = (c: ColCount) => { setCols(c); bump(); };
  const handleDifficulty = (d: Difficulty) => { setDifficulty(d); bump(); };

  return (
    <div style={pageStyle}>
      <div style={decorStyle} />

      <div style={{ width: '100%', maxWidth: 1100, position: 'relative', zIndex: 1 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,transparent,rgba(210,150,30,0.4))' }} />
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(28px,7vw,54px)',
              fontWeight: 900,
              letterSpacing: '0.25em',
              color: '#d4a020',
              textShadow: '0 0 50px rgba(212,160,32,0.35), 0 3px 0 #6b4010',
            }}>
              NTXUVA
            </h1>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,rgba(210,150,30,0.4),transparent)' }} />
          </div>
          <p style={{ margin: 0, color: '#7a5025', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase' }}>
            Jogo Africano Tradicional &nbsp;·&nbsp; Humano vs Computador
          </p>
        </div>

        {/* Board-size / difficulty selectors (live, from parent) */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: '#7a5025', fontSize: 11, letterSpacing: '0.1em' }}>CASAS:</span>
          {([7, 16, 22] as ColCount[]).map((c) => (
            <button key={c} onClick={() => handleCols(c)} style={{
              background: cols === c ? 'rgba(212,160,32,0.22)' : 'rgba(212,160,32,0.06)',
              border: `1px solid ${cols === c ? 'rgba(212,160,32,0.7)' : 'rgba(212,160,32,0.2)'}`,
              borderRadius: 6, color: cols === c ? '#d4a020' : '#7a5025',
              padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              fontWeight: cols === c ? 'bold' : 'normal', fontFamily: 'inherit',
            }}>{c}</button>
          ))}
          <span style={{ color: '#7a5025', fontSize: 11, letterSpacing: '0.1em', marginLeft: 10 }}>IA:</span>
          {(['easy','medium','hard'] as Difficulty[]).map((d) => {
            const labels: Record<Difficulty, string> = { easy:'Fácil', medium:'Médio', hard:'Difícil' };
            return (
              <button key={d} onClick={() => handleDifficulty(d)} style={{
                background: difficulty === d ? 'rgba(212,160,32,0.22)' : 'rgba(212,160,32,0.06)',
                border: `1px solid ${difficulty === d ? 'rgba(212,160,32,0.7)' : 'rgba(212,160,32,0.2)'}`,
                borderRadius: 6, color: difficulty === d ? '#d4a020' : '#7a5025',
                padding: '5px 11px', fontSize: 11, cursor: 'pointer',
                fontWeight: difficulty === d ? 'bold' : 'normal', fontFamily: 'inherit',
              }}>{labels[d]}</button>
            );
          })}
        </div>

        {/* Game (remounts on gameKey change) */}
        <GameView key={gameKey} cols={cols} difficulty={difficulty} />

        {/* Legend + Rules */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,160,32,0.1)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ color: '#7a5025', fontSize: 10, letterSpacing: '0.2em', marginBottom: 6 }}>LEGENDA</div>
            {([
              ['rgba(212,160,32,0.6)', 'Casa jogável'],
              ['#f0c040', 'Selecionada'],
              ['#40d060', 'Último mov.'],
              ['#e03030', 'Capturada'],
            ] as const).map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${color}`, flexShrink: 0 }} />
                <span style={{ color: '#6a4020', fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,160,32,0.1)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ color: '#7a5025', fontSize: 10, letterSpacing: '0.2em', marginBottom: 6 }}>REGRAS CHAVE</div>
            {[
              'Fase 1: obrigatório jogar de casa com >1 peça.',
              'Fase 2 (só seu lado): livre para qualquer casa com peça.',
              'Continuação: última peça em casa cheia → pega 1 e continua.',
              'Fim: um jogador fica com 0 peças.',
            ].map((r) => (
              <div key={r} style={{ color: '#6a4020', fontSize: 10, marginBottom: 3, lineHeight: 1.5 }}>• {r}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
