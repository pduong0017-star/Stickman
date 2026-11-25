import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import { CHARACTER_ROSTER, getCharacterDef } from './game/characters';
import type { ActionKey, AudioSettings, CharacterId, GameMode, HudSnapshot } from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { AudioModal, ControlsModal, OutcomeModal, PauseModal } from './components/Modals';
import { TouchControls } from './components/TouchControls';

const DEFAULT_CHAR = CHARACTER_ROSTER.kuro;

const INITIAL_HUD: HudSnapshot = {
  state: 'title',
  mode: 'story',
  characterId: DEFAULT_CHAR.id,
  characterName: DEFAULT_CHAR.name,
  characterCodename: DEFAULT_CHAR.codename,
  characterAccent: DEFAULT_CHAR.accentColor,
  characterSkills: DEFAULT_CHAR.skills,
  actCode: '01',
  actTitle: 'MAIN FIGHT',
  actHint: '',
  hp: DEFAULT_CHAR.maxHp,
  maxHp: DEFAULT_CHAR.maxHp,
  trailHp: DEFAULT_CHAR.maxHp,
  rage: 0,
  maxRage: 100,
  awakening: 0,
  maxAwakening: 100,
  awakened: false,
  awakenPrompt: false,
  combo: 0,
  comboPulse: 0,
  styleRank: 'D',
  styleScore: 0,
  score: 0,
  perfectParries: 0,
  elapsedTime: 0,
  boss: null,
  bossIntro: null,
  cooldowns: {
    dash: 0,
    dashMax: DEFAULT_CHAR.dashCooldown,
    parry: 0,
    parryMax: 0.52,
    cryo: 0,
    cryoMax: DEFAULT_CHAR.specialCooldown,
    cryoActive: false,
    skillLinkActive: false,
    skillLinkLabel: 'PHÁ BĂNG',
    ultimateReady: false,
    awakenReady: false,
    awakened: false,
    awakenTimeLeft: 0,
    awakenDuration: 22,
  },
  cutsceneActive: false,
  cutsceneTitle: DEFAULT_CHAR.skills.ultimateName,
  enemiesRemaining: 0,
  waveProgressText: '',
  runStats: null,
  isTouchDevice: false,
};

function isPortraitPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth && window.innerWidth < 640;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    muted: false,
    bgmEnabled: true,
    masterVolume: 0.72,
    sfxVolume: 0.85,
    bgmVolume: 0.52,
  });
  const [controlsOpen, setControlsOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [touchOverride, setTouchOverride] = useState<boolean | null>(null);
  const [portraitBanner, setPortraitBanner] = useState<boolean>(() => isPortraitPhone());
  const [portraitDismissed, setPortraitDismissed] = useState<boolean>(false);
  const [canFullscreen] = useState<boolean>(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenEnabled)
  );

  // Track mobile portrait orientation for non-blocking landscape hint
  useEffect(() => {
    const onResize = () => {
      const portrait = isPortraitPhone();
      setPortraitBanner(portrait);
      if (!portrait) {
        setPortraitDismissed(false);
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Mount Canvas & OOP Game Engine exactly ONCE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Game(canvas, (snapshot) => {
      setHud(snapshot);
    });
    gameRef.current = engine;
    setAudioSettings(engine.getAudioSettings());

    // Support URL params: ?char=kuro|raijin|kagura|zero, ?touch=1, ?autostart=1&mode=...
    const params = new URLSearchParams(window.location.search);
    const charParam = params.get('char');
    if (charParam) {
      const charDef = getCharacterDef(charParam);
      engine.setCharacter(charDef.id, false);
    }
    if (params.get('touch') === '1') {
      setTouchOverride(true);
    }
    if (params.get('autostart') === '1') {
      const m = params.get('mode');
      const mode: GameMode = m === 'boss_rush' || m === 'training' ? m : 'story';
      engine.startMode(mode, false);
    }

    return () => {
      engine.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleSelectCharacter = useCallback((id: CharacterId) => {
    gameRef.current?.setCharacter(id, true);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        const orientation = screen.orientation as
          | (ScreenOrientation & { lock?: (orientation: string) => Promise<void> })
          | undefined;
        if (orientation?.lock) {
          orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen rejection in restricted iframes
    }
  }, []);

  const handleStartMode = useCallback((mode: GameMode) => {
    setControlsOpen(false);
    setAudioOpen(false);
    gameRef.current?.startMode(mode);
  }, []);

  // Bind Enter / Space on Title screen to start immediately
  useEffect(() => {
    if (hud.state !== 'title' || controlsOpen || audioOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleStartMode('story');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.state, controlsOpen, audioOpen, handleStartMode]);

  const handleAudioChange = useCallback((partial: Partial<AudioSettings>) => {
    if (!gameRef.current) return;
    setAudioSettings(gameRef.current.updateAudioSettings(partial));
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!gameRef.current) return;
    setAudioSettings(gameRef.current.audio.toggleMute());
  }, []);

  const handleTogglePause = useCallback(() => {
    if (!gameRef.current) return;
    if (hud.state === 'playing') gameRef.current.pauseGame();
    else if (hud.state === 'paused') gameRef.current.resumeGame();
  }, [hud.state]);

  const handleRestart = useCallback(() => {
    gameRef.current?.startMode(hud.mode);
  }, [hud.mode]);

  const handleMainMenu = useCallback(() => {
    gameRef.current?.enterTitleState();
  }, []);

  const handleVirtualAction = useCallback((action: ActionKey, pressed: boolean) => {
    gameRef.current?.setVirtualAction(action, pressed);
  }, []);

  const showTouchControls = touchOverride ?? hud.isTouchDevice;

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-[#090b10]">
      {/* Isolated Full-Viewport Canvas Mount */}
      <div className="fixed inset-0 z-0">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          className="block w-full h-full"
        />
      </div>

      {/* Title Screen Overlay */}
      {hud.state === 'title' && (
        <TitleScreen
          selectedCharacter={hud.characterId}
          onSelectCharacter={handleSelectCharacter}
          onStartMode={handleStartMode}
          onOpenControls={() => {
            setAudioOpen(false);
            setControlsOpen(true);
          }}
          onOpenAudio={() => {
            setControlsOpen(false);
            setAudioOpen(true);
          }}
          onToggleFullscreen={handleToggleFullscreen}
          canFullscreen={canFullscreen}
        />
      )}

      {/* Playing HUD Overlay */}
      {(hud.state === 'playing' || hud.state === 'paused') && (
        <GameHUD
          hud={hud}
          audioSettings={audioSettings}
          showTouchControls={showTouchControls}
          canFullscreen={canFullscreen}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onToggleTouch={() => setTouchOverride(!showTouchControls)}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Mobile / Virtual Touch Controls */}
      {hud.state === 'playing' && showTouchControls && (
        <TouchControls hud={hud} onAction={handleVirtualAction} />
      )}

      {/* Pause Modal */}
      {hud.state === 'paused' && (
        <PauseModal
          selectedCharacter={hud.characterId}
          characterName={hud.characterName}
          characterAccent={hud.characterAccent}
          skills={hud.characterSkills}
          onSelectCharacter={handleSelectCharacter}
          onResume={() => gameRef.current?.resumeGame()}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Victory / Game Over Modal */}
      {(hud.state === 'victory' || hud.state === 'gameover') && hud.runStats && (
        <OutcomeModal
          stats={hud.runStats}
          onPlayAgain={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Title Utility Modals */}
      {controlsOpen && <ControlsModal onClose={() => setControlsOpen(false)} />}
      {audioOpen && (
        <AudioModal
          settings={audioSettings}
          onChange={handleAudioChange}
          onClose={() => setAudioOpen(false)}
        />
      )}

      {/* Non-blocking Dismissible Portrait-to-Landscape Mobile Hint */}
      {portraitBanner && !portraitDismissed && (
        <div
          className="fixed inset-x-3 bottom-3 z-40 clip-chamfer bg-[#0f1422] border border-red-500/70 px-4 py-3 flex flex-col gap-2.5 shadow-xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 shrink-0 border border-red-400/70 bg-red-950/50 flex items-center justify-center text-red-300 font-display italic font-extrabold text-sm">
              90°
            </div>
            <div className="min-w-0">
              <div className="font-display italic font-bold text-base text-white tracking-wider leading-tight">
                XOAY NGANG ĐIỆN THOẠI
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Xoay ngang để có tầm nhìn chiến đấu rộng nhất và cụm phím cảm ứng thoải mái.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canFullscreen && (
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex-1 py-2 bg-[#dc2626] text-white font-display italic font-bold text-sm tracking-wider cursor-pointer"
              >
                TOÀN MÀN HÌNH NGANG
              </button>
            )}
            <button
              type="button"
              onClick={() => setPortraitDismissed(true)}
              className="px-3 py-2 bg-[#1a2234] border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Tiếp tục chơi dọc
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
