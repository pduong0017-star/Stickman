import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import { CHARACTER_ROSTER, getCharacterDef } from './game/characters';
import type { BotArchetype } from './game/ai/BotBrain';
import type { ActionKey, AudioSettings, BlessingId, CharacterId, GameMode, HudSnapshot, SkinId } from './game/types';
import { TitleScreen, type LobbyDrawerTab } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import {
  ControlsModal,
  OutcomeModal,
  PauseModal,
  SettingsModal,
  loadAudioSettings,
  loadVisualSettings,
  saveAudioSettings,
  saveVisualSettings,
  type GameVisualSettings,
} from './components/Modals';
import { TouchControls } from './components/TouchControls';

const DEFAULT_CHAR = CHARACTER_ROSTER.kuro;

const INITIAL_HUD: HudSnapshot = {
  state: 'title',
  mode: 'story',
  characterId: DEFAULT_CHAR.id,
  skinId: 'default',
  selectedStageIndex: 0,
  clearedStages: [],
  characterName: DEFAULT_CHAR.name,
  characterCodename: DEFAULT_CHAR.codename,
  characterAccent: DEFAULT_CHAR.accentColor,
  characterSkills: DEFAULT_CHAR.skills,
  actCode: '01',
  actTitle: 'PHÒNG THÍ NGHIỆM',
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
  witchTimeActive: false,
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
  blessingChoices: null,
  activeBlessings: [],
  runStats: null,
  isTouchDevice: false,
  domainActive: false,
  domainKind: 'none',
  domainTimeLeft: 0,
  timeStopActive: false,
  timeStopTimeLeft: 0,
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
  const [visualSettings, setVisualSettings] = useState<GameVisualSettings>(() => loadVisualSettings());
  const [controlsOpen, setControlsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingTitleDrawer, setPendingTitleDrawer] = useState<LobbyDrawerTab | null>(null);
  const [touchOverride, setTouchOverride] = useState<boolean | null>(null);
  const [touchEditorOpen, setTouchEditorOpen] = useState(false);
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
    const savedAudio = loadAudioSettings();
    if (savedAudio) {
      setAudioSettings(engine.updateAudioSettings(savedAudio));
    } else {
      setAudioSettings(engine.getAudioSettings());
    }

    // Support URL params: ?char=kuro|raijin|kagura|zero, ?touch=1, ?autostart=1&mode=...
    const params = new URLSearchParams(window.location.search);
    const charParam = params.get('char');
    if (charParam) {
      const charDef = getCharacterDef(charParam);
      engine.setCharacter(charDef.id, false);
    }
    const skinParam = params.get('skin');
    if (skinParam) {
      engine.setSkin(skinParam as SkinId, false);
    }
    const stageParam = params.get('stage');
    if (stageParam) {
      const parsedStage = Number(stageParam) - 1;
      if (!Number.isNaN(parsedStage)) {
        engine.setSelectedStage(parsedStage, false);
      }
    }
    if (params.get('touch') === '1') {
      setTouchOverride(true);
    }
    const oppParam = params.get('opponent');
    const archParam = params.get('archetype');
    if (oppParam || archParam) {
      const oppDef = oppParam ? getCharacterDef(oppParam) : null;
      const arch: BotArchetype | undefined =
        archParam === 'RUSHDOWN' || archParam === 'COUNTER' || archParam === 'TRICKSTER'
          ? archParam
          : undefined;
      engine.setSolo1v1Config({
        ...(oppDef ? { opponentId: oppDef.id } : {}),
        ...(arch ? { botArchetype: arch } : {}),
      });
    }
    if (params.get('autostart') === '1') {
      const m = params.get('mode');
      const mode: GameMode =
        m === 'boss_rush' || m === 'endless' || m === 'training' || m === 'solo1v1' ? m : 'story';
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

  const handleSelectSkin = useCallback((skinId: SkinId) => {
    gameRef.current?.setSkin(skinId, true);
  }, []);

  const handleSelectStage = useCallback((index: number) => {
    gameRef.current?.setSelectedStage(index, true);
  }, []);

  const handleSelectBlessing = useCallback((id: BlessingId) => {
    gameRef.current?.selectBlessing(id);
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
    setSettingsOpen(false);
    gameRef.current?.startMode(mode);
  }, []);

  const handleStartSolo1v1 = useCallback((opponentId: CharacterId, botArchetype: BotArchetype) => {
    setControlsOpen(false);
    setSettingsOpen(false);
    gameRef.current?.setSolo1v1Config({ opponentId, botArchetype });
    gameRef.current?.startMode('solo1v1');
  }, []);

  // Bind Enter / Space on Title screen to start immediately
  useEffect(() => {
    if (hud.state !== 'title' || controlsOpen || settingsOpen || touchEditorOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleStartMode('story');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.state, controlsOpen, settingsOpen, touchEditorOpen, handleStartMode]);

  const handleAudioChange = useCallback((partial: Partial<AudioSettings>) => {
    if (!gameRef.current) return;
    const next = gameRef.current.updateAudioSettings(partial);
    setAudioSettings(next);
    saveAudioSettings(next);
  }, []);

  const handleVisualChange = useCallback((partial: Partial<GameVisualSettings>) => {
    setVisualSettings((prev) => {
      const next = { ...prev, ...partial };
      saveVisualSettings(next);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!gameRef.current) return;
    const next = gameRef.current.audio.toggleMute();
    setAudioSettings(next);
    saveAudioSettings(next);
  }, []);

  const handleTogglePause = useCallback(() => {
    if (!gameRef.current) return;
    if (hud.state === 'playing') gameRef.current.pauseGame();
    else if (hud.state === 'paused') {
      setSettingsOpen(false);
      gameRef.current.resumeGame();
    }
  }, [hud.state]);

  const handleRestart = useCallback(() => {
    setSettingsOpen(false);
    gameRef.current?.startMode(hud.mode);
  }, [hud.mode]);

  const handleMainMenu = useCallback(() => {
    setSettingsOpen(false);
    setControlsOpen(false);
    gameRef.current?.enterTitleState();
  }, []);

  const handleChangeSetupFromOutcome = useCallback(() => {
    setPendingTitleDrawer('hero');
    handleMainMenu();
  }, [handleMainMenu]);

  const handleOpenTouchEditor = useCallback(() => {
    setSettingsOpen(false);
    setControlsOpen(false);
    if (hud.state === 'playing') gameRef.current?.pauseGame();
    setTouchEditorOpen(true);
  }, [hud.state]);

  const handleVirtualAction = useCallback((action: ActionKey, pressed: boolean) => {
    gameRef.current?.setVirtualAction(action, pressed);
  }, []);

  const showTouchControls = touchOverride ?? hud.isTouchDevice;

  return (
    <main
      className="relative w-screen h-dvh overflow-hidden bg-[#090b10]"
      data-graphics={visualSettings.graphicsQuality}
    >
      {/* Isolated Full-Viewport Canvas Mount */}
      <div className="fixed inset-0 z-0">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          className="block w-full h-full"
        />
      </div>

      {/* Title Screen Overlay */}
      {hud.state === 'title' && !touchEditorOpen && (
        <TitleScreen
          selectedCharacter={hud.characterId}
          selectedSkin={hud.skinId}
          selectedStageIndex={hud.selectedStageIndex}
          clearedStages={hud.clearedStages}
          onSelectCharacter={handleSelectCharacter}
          onSelectSkin={handleSelectSkin}
          onSelectStage={handleSelectStage}
          onStartMode={handleStartMode}
          onStartSolo1v1={handleStartSolo1v1}
          onOpenSettings={() => {
            setControlsOpen(false);
            setSettingsOpen(true);
          }}
          onToggleFullscreen={handleToggleFullscreen}
          canFullscreen={canFullscreen}
          initialDrawer={pendingTitleDrawer}
          onConsumeInitialDrawer={() => setPendingTitleDrawer(null)}
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
          onSelectBlessing={handleSelectBlessing}
        />
      )}

      {/* Mobile / Virtual Touch Controls (hidden while picking Blessing card) */}
      {((hud.state === 'playing' && showTouchControls && !hud.blessingChoices) || touchEditorOpen) && (
        <TouchControls
          hud={hud}
          onAction={handleVirtualAction}
          editing={touchEditorOpen}
          onCloseEditor={() => setTouchEditorOpen(false)}
        />
      )}

      {/* Pause Modal */}
      {hud.state === 'paused' && !touchEditorOpen && !settingsOpen && (
        <PauseModal
          characterName={hud.characterName}
          characterAccent={hud.characterAccent}
          onResume={() => gameRef.current?.resumeGame()}
          onRestart={handleRestart}
          onOpenSettings={() => setSettingsOpen(true)}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Victory / Game Over Modal */}
      {(hud.state === 'victory' || hud.state === 'gameover') && hud.runStats && (
        <OutcomeModal
          stats={hud.runStats}
          solo1v1={hud.solo1v1}
          onPlayAgain={handleRestart}
          onChangeSetup={handleChangeSetupFromOutcome}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Unified Settings & Controls Modals */}
      {settingsOpen && (
        <SettingsModal
          audioSettings={audioSettings}
          visualSettings={visualSettings}
          onAudioChange={handleAudioChange}
          onVisualChange={handleVisualChange}
          onCustomizeTouch={handleOpenTouchEditor}
          onOpenControls={() => {
            setSettingsOpen(false);
            setControlsOpen(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {controlsOpen && <ControlsModal onClose={() => setControlsOpen(false)} />}

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
