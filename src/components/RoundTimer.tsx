import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Settings,
  AlertCircle,
  X,
} from 'lucide-react';

interface RoundTimerProps {
  tournamentId: string;
  roundNumber: number;
}

interface SavedTimerState {
  initialMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  targetEndTime: number | null;
}

export const RoundTimer: React.FC<RoundTimerProps> = ({ tournamentId, roundNumber }) => {
  const storageKey = `edison_timer_${tournamentId}_r${roundNumber}`;

  // Inicializa o estado com base no localStorage ou padrão de 40 minutos
  const [initialMinutes, setInitialMinutes] = useState<number>(40);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(40 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('40');
  const [hasPlayedAlarm, setHasPlayedAlarm] = useState<boolean>(false);

  // Som suave de alarme quando o tempo esgota usando Web Audio API
  const playAlarmSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playBeep = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration);
      };

      // 3 beeps elegantes (A5, C#6, E6)
      playBeep(880, 0, 0.25);
      playBeep(1108, 0.3, 0.25);
      playBeep(1318, 0.6, 0.4);
    } catch {
      // Ignora caso bloqueado pelo navegador
    }
  }, []);

  // Carrega estado ao mudar de torneio ou de rodada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: SavedTimerState = JSON.parse(raw);
        setInitialMinutes(parsed.initialMinutes || 40);
        setCustomMinutesInput(String(parsed.initialMinutes || 40));

        if (parsed.isRunning && parsed.targetEndTime) {
          const currentRemaining = Math.max(0, Math.round((parsed.targetEndTime - Date.now()) / 1000));
          setRemainingSeconds(currentRemaining);
          setIsRunning(currentRemaining > 0);
          setTargetEndTime(currentRemaining > 0 ? parsed.targetEndTime : null);
        } else {
          setRemainingSeconds(parsed.remainingSeconds ?? (parsed.initialMinutes || 40) * 60);
          setIsRunning(false);
          setTargetEndTime(null);
        }
      } else {
        // Nova rodada: 40 minutos padrão
        setInitialMinutes(40);
        setRemainingSeconds(40 * 60);
        setIsRunning(false);
        setTargetEndTime(null);
        setCustomMinutesInput('40');
      }
      setHasPlayedAlarm(false);
    } catch {
      setInitialMinutes(40);
      setRemainingSeconds(40 * 60);
      setIsRunning(false);
      setTargetEndTime(null);
    }
  }, [storageKey]);

  // Salva estado sempre que houver alteração
  const saveStateRef = useRef({ initialMinutes, remainingSeconds, isRunning, targetEndTime });
  saveStateRef.current = { initialMinutes, remainingSeconds, isRunning, targetEndTime };

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(saveStateRef.current));
    } catch {
      // ignore
    }
  }, [initialMinutes, remainingSeconds, isRunning, targetEndTime, storageKey]);

  // Loop de atualização do cronômetro em tempo real
  useEffect(() => {
    if (!isRunning || !targetEndTime) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.round((targetEndTime - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        setIsRunning(false);
        setTargetEndTime(null);
        if (!hasPlayedAlarm) {
          playAlarmSound();
          setHasPlayedAlarm(true);
        }
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, targetEndTime, hasPlayedAlarm, playAlarmSound]);

  // Ações de controle
  const handleStart = () => {
    if (remainingSeconds <= 0) return;
    const newTarget = Date.now() + remainingSeconds * 1000;
    setTargetEndTime(newTarget);
    setIsRunning(true);
    setHasPlayedAlarm(false);
  };

  const handlePause = () => {
    if (targetEndTime) {
      const currentDiff = Math.max(0, Math.round((targetEndTime - Date.now()) / 1000));
      setRemainingSeconds(currentDiff);
    }
    setIsRunning(false);
    setTargetEndTime(null);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTargetEndTime(null);
    setRemainingSeconds(initialMinutes * 60);
    setHasPlayedAlarm(false);
  };

  // Acréscimo rápido de tempo (judge call / extensão de tempo de mesa)
  const handleAddMinutes = (mins: number) => {
    const extraSeconds = mins * 60;
    setRemainingSeconds((prev) => {
      const next = prev + extraSeconds;
      if (isRunning && targetEndTime) {
        setTargetEndTime(targetEndTime + extraSeconds * 1000);
      }
      return next;
    });
    setHasPlayedAlarm(false);
  };

  // Salva alteração de tempo da rodada
  const handleSaveCustomMinutes = (mins: number) => {
    const sanitized = Math.max(1, Math.min(180, mins));
    setInitialMinutes(sanitized);
    setRemainingSeconds(sanitized * 60);
    setIsRunning(false);
    setTargetEndTime(null);
    setHasPlayedAlarm(false);
    setShowEditModal(false);
  };

  // Formatação de minutos e segundos
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isWarning = remainingSeconds > 0 && remainingSeconds <= 5 * 60; // últimos 5 min
  const isCritical = remainingSeconds > 0 && remainingSeconds <= 60; // último minuto
  const isTimeUp = remainingSeconds === 0;

  return (
    <div
      className={`round-timer-card ${isTimeUp ? 'timer-time-up' : isCritical ? 'timer-critical' : isWarning ? 'timer-warning' : ''}`}
    >
      <div className="timer-main-row">
        {/* Lado Esquerdo: Ícone e Status */}
        <div className="timer-info-col">
          <div className="timer-header-tag">
            <Clock size={13} className="text-gold" />
            <span>CRONÔMETRO DA RODADA</span>
            <span className="timer-round-pill">R{roundNumber}</span>
          </div>

          <div className="timer-status-row">
            {isTimeUp ? (
              <span className="timer-status-badge expired">
                <AlertCircle size={12} />
                <span>TEMPO ESGOTADO</span>
              </span>
            ) : isRunning ? (
              <span className="timer-status-badge running">
                <span className="pulse-dot-green" />
                <span>EM ANDAMENTO</span>
              </span>
            ) : (
              <span className="timer-status-badge paused">
                <span>PAUSADO</span>
              </span>
            )}
            <span className="timer-base-info">Padrão: {initialMinutes} min</span>
          </div>
        </div>

        {/* Centro: Display do Tempo Grande */}
        <div className="timer-display-col">
          <div
            className={`timer-clock-digits ${isTimeUp ? 'digits-red' : isCritical ? 'digits-orange' : isWarning ? 'digits-yellow' : 'digits-normal'}`}
            onClick={() => setShowEditModal(true)}
            title="Clique para editar o tempo da rodada"
          >
            {formattedTime}
          </div>
        </div>

        {/* Lado Direito: Ações e Controles */}
        <div className="timer-controls-col">
          <div className="timer-btn-group">
            {isRunning ? (
              <button
                type="button"
                className="btn-timer-action btn-timer-pause"
                onClick={handlePause}
                title="Pausar cronômetro"
              >
                <Pause size={15} />
                <span>Pausar</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-timer-action btn-timer-play"
                onClick={handleStart}
                disabled={isTimeUp}
                title="Iniciar cronômetro"
              >
                <Play size={15} />
                <span>Iniciar</span>
              </button>
            )}

            <button
              type="button"
              className="btn-timer-secondary"
              onClick={handleReset}
              title="Resetar tempo da rodada"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              className="btn-timer-secondary"
              onClick={() => {
                setCustomMinutesInput(String(initialMinutes));
                setShowEditModal(true);
              }}
              title="Editar tempo da rodada (minutos)"
            >
              <Settings size={14} />
              <span>Editar</span>
            </button>
          </div>

          {/* Botões Rápidos de Acréscimo (+1m / +5m) */}
          <div className="timer-quick-add-group">
            <span className="quick-add-label">+ Tempo:</span>
            <button
              type="button"
              className="btn-quick-add"
              onClick={() => handleAddMinutes(1)}
              title="Adicionar 1 minuto de tolerância/extensão"
            >
              +1 min
            </button>
            <button
              type="button"
              className="btn-quick-add"
              onClick={() => handleAddMinutes(5)}
              title="Adicionar 5 minutos de tolerância/extensão"
            >
              +5 min
            </button>
          </div>
        </div>
      </div>

      {/* Alerta Chamativo de Tempo Esgotado / Turnos Adicionais TCG */}
      {isTimeUp && (
        <div className="timer-time-up-banner">
          <AlertCircle size={16} />
          <div>
            <strong>TEMPO DE RODADA ESGOTADO!</strong>
            <span>
              {' '}Inicie o procedimento oficial de fim de partida (Turnos Adicionais: Turno 0 atual + Turnos 1, 2 e 3).
            </span>
          </div>
        </div>
      )}

      {/* Modal de Configuração / Edição de Minutos da Rodada */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)} style={{ zIndex: 1400 }}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '20px' }}
          >
            <div className="modal-header" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} className="text-gold" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 800 }}>
                  Tempo da Rodada {roundNumber}
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
              O tempo padrão oficial de torneios de Yu-Gi-Oh Edison é de <strong>40 minutos</strong>. Você pode selecionar um atalho rápido ou definir um tempo customizado para esta rodada.
            </p>

            {/* Presets Rápidos */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                Atalhos Rápidos:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[30, 35, 40, 45, 50, 60].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomMinutesInput(String(preset))}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: customMinutesInput === String(preset) ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                      color: customMinutesInput === String(preset) ? '#000' : '#e2e8f0',
                      border: customMinutesInput === String(preset) ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {preset} min {preset === 40 ? '(Padrão)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Manual de Minutos */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                Ou Digite os Minutos:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                  autoFocus
                />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>minutos</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setShowEditModal(false)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => handleSaveCustomMinutes(parseInt(customMinutesInput) || 40)}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Salvar e Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
