import { useCallback, useEffect, useRef, useState } from 'react';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { processCompletedMatchRewards } from '@/features/coin-system/economy';
import { CustomizeScreen } from '@/features/customization/CustomizeScreen';
import { GameCanvas } from '@/features/gameplay/GameCanvas';
import { GameplayHUD } from '@/features/gameplay/GameplayHUD';
import { PauseModal } from '@/features/gameplay/PauseModal';
import { ResultsModal } from '@/features/gameplay/ResultsModal';
import {
  equipItemOnProfile,
  purchaseStoreItemForProfile,
} from '@/features/game-store/transactions';
import { StoreScreen } from '@/features/game-store/StoreScreen';
import { CinematicIntro } from '@/features/introduction/CinematicIntro';
import { LoadingScreen } from '@/features/introduction/LoadingScreen';
import { InstructionsScreen } from '@/features/main-menu/InstructionsScreen';
import { MainMenu } from '@/features/main-menu/MainMenu';
import { MatchSetupWizard } from '@/features/main-menu/MatchSetupWizard';
import { ProfileScreen } from '@/features/player-profiles/ProfileScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { StatsScreen } from '@/features/statistics/StatsScreen';
import type {
  AirHockeyEngine,
  CinematicStage,
  SeriesMatchMeta,
} from '@/game/engine/AirHockeyEngine';
import {
  ensureDailyChallengesCurrent,
  loadSaveData,
  resetAllProgressData,
  resetAllStatisticsOnly,
  saveAllData,
} from '@/storage';
import type {
  AIDifficulty,
  EpicSwingSaveData,
  GameMode,
  LiveMatchHUDState,
  MatchConfig,
  MatchRewardBreakdown,
  PlayerIdentity,
  ScreenId,
  StoreCatalogItem,
  StoreCategory,
  UserPreferences,
} from '@/types/game';

interface SeriesRunState {
  mode: 'best_of_three' | 'tournament';
  round: number;
  wins1: number;
  wins2: number;
  targetWins: number;
  tournamentStageIndex: number;
}

const TOURNAMENT_STAGES: ReadonlyArray<{
  round: number;
  label: string;
  difficulty: AIDifficulty;
}> = [
  { round: 1, label: 'Quarterfinal', difficulty: 'easy' },
  { round: 2, label: 'Semifinal', difficulty: 'hard' },
  { round: 3, label: 'Championship Final', difficulty: 'expert' },
];

const INITIAL_HUD: LiveMatchHUDState = {
  matchId: '',
  phase: 'idle',
  score1: 0,
  score2: 0,
  remainingSeconds: 180,
  elapsedSeconds: 0,
  countdownValue: 3,
  lastGoalScorer: null,
  lastGoalSpeedKmh: 0,
  topSpeedKmh: 0,
  totalHits: 0,
  puckSpeedKmh: 0,
  winner: null,
  seriesWins1: 0,
  seriesWins2: 0,
  seriesRound: 1,
  seriesTargetWins: 1,
  tournamentStageLabel: null,
  activePowerUps: [],
  goalShieldP1: false,
  goalShieldP2: false,
  bonusPuckActive: false,
};

export default function App() {
  const [saveData, setSaveData] = useState<EpicSwingSaveData>(() =>
    ensureDailyChallengesCurrent(loadSaveData())
  );

  const [screen, setScreen] = useState<ScreenId>('loading');
  const [settingsReturnScreen, setSettingsReturnScreen] =
    useState<ScreenId>('menu');
  const [engineReady, setEngineReady] = useState(false);
  const [hud, setHud] = useState<LiveMatchHUDState>(INITIAL_HUD);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [practiceSparring, setPracticeSparring] = useState(false);
  const [goalScoredInDemo, setGoalScoredInDemo] = useState(false);
  const [lastMatchReward, setLastMatchReward] =
    useState<MatchRewardBreakdown | null>(null);
  const [seriesOutcome, setSeriesOutcome] = useState<{
    summaryLabel: string | null;
    nextLabel: string | null;
  }>({ summaryLabel: null, nextLabel: null });

  const engineRef = useRef<AirHockeyEngine | null>(null);
  const seriesStateRef = useRef<SeriesRunState | null>(null);
  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;

  const liveSpeedRef = useRef<HTMLSpanElement | null>(null);
  const topSpeedRef = useRef<HTMLSpanElement | null>(null);
  const practiceSpeedRef = useRef<HTMLSpanElement | null>(null);

  const config = saveData.matchConfig;
  const prefs = saveData.preferences;
  const stats = saveData.statistics;
  const profiles = saveData.profiles;
  const dailyChallenges = saveData.dailyChallenges;

  const commitSaveData = useCallback(
    (
      updater: (prev: EpicSwingSaveData) => EpicSwingSaveData,
      syncCosmetics = false
    ) => {
      setSaveData((prev) => {
        const next = updater(prev);
        saveAllData(next);
        if (syncCosmetics) {
          engineRef.current?.applyCosmetics(next.profiles.p1, next.profiles.p2);
        }
        return next;
      });
    },
    []
  );

  const handleEngineReady = useCallback((engine: AirHockeyEngine) => {
    engineRef.current = engine;
    setEngineReady(true);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setScreen((prev) => {
      if (prev !== 'loading') return prev;
      const curPrefs = saveDataRef.current.preferences;
      const shouldShowIntro =
        !curPrefs.hasSeenIntro || curPrefs.introPreference === 'auto';
      if (shouldShowIntro) {
        setGoalScoredInDemo(false);
        return 'intro';
      }
      return 'menu';
    });
  }, []);

  const handleCinematicStageChange = useCallback((stage: CinematicStage) => {
    engineRef.current?.setCinematicStage(stage);
  }, []);

  const handleIntroComplete = useCallback(() => {
    commitSaveData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        hasSeenIntro: true,
      },
    }));
    engineRef.current?.enterIdleMenu();
    setScreen('menu');
  }, [commitSaveData]);

  const handleReplayIntro = useCallback(() => {
    setGoalScoredInDemo(false);
    setScreen('intro');
  }, []);

  const updateConfig = useCallback(
    (nextConfig: MatchConfig) => {
      commitSaveData((prev) => ({
        ...prev,
        matchConfig: nextConfig,
        profiles: {
          p1: {
            ...prev.profiles.p1,
            name: nextConfig.player1Name.trim()
              ? nextConfig.player1Name.slice(0, 18)
              : prev.profiles.p1.name,
          },
          p2: {
            ...prev.profiles.p2,
            name: nextConfig.player2Name.trim()
              ? nextConfig.player2Name.slice(0, 18)
              : prev.profiles.p2.name,
          },
        },
      }));
      engineRef.current?.updateConfig(nextConfig);
    },
    [commitSaveData]
  );

  const updatePrefs = useCallback(
    (nextPrefs: UserPreferences) => {
      commitSaveData((prev) => ({
        ...prev,
        preferences: nextPrefs,
      }));
      engineRef.current?.applyPreferences(nextPrefs);
    },
    [commitSaveData]
  );

  const handleToggleMute = useCallback(() => {
    commitSaveData((prev) => {
      const nextPrefs: UserPreferences = {
        ...prev.preferences,
        muteAll: !prev.preferences.muteAll,
      };
      engineRef.current?.applyPreferences(nextPrefs);
      return {
        ...prev,
        preferences: nextPrefs,
      };
    });
  }, [commitSaveData]);

  const handleToggleMusic = useCallback(() => {
    commitSaveData((prev) => {
      const turningOn = !prev.preferences.musicEnabled;
      const nextPrefs: UserPreferences = {
        ...prev.preferences,
        musicEnabled: turningOn,
        musicVolume:
          turningOn && prev.preferences.musicVolume <= 0
            ? 0.35
            : prev.preferences.musicVolume,
      };
      engineRef.current?.applyPreferences(nextPrefs);
      return {
        ...prev,
        preferences: nextPrefs,
      };
    });
  }, [commitSaveData]);

  const handleSpeedUpdate = useCallback(
    (puckSpeedKmh: number, topSpeedKmh: number) => {
      const spdText = String(puckSpeedKmh);
      if (liveSpeedRef.current && liveSpeedRef.current.textContent !== spdText) {
        liveSpeedRef.current.textContent = spdText;
      }
      if (
        practiceSpeedRef.current &&
        practiceSpeedRef.current.textContent !== spdText
      ) {
        practiceSpeedRef.current.textContent = spdText;
      }
      const peakText = String(topSpeedKmh);
      if (topSpeedRef.current && topSpeedRef.current.textContent !== peakText) {
        topSpeedRef.current.textContent = peakText;
      }
    },
    []
  );

  const handleUpdateProfile = useCallback(
    (playerId: 'p1' | 'p2', nextProfile: PlayerIdentity) => {
      commitSaveData(
        (prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            [playerId]: nextProfile,
          },
          matchConfig: {
            ...prev.matchConfig,
            player1Name:
              playerId === 'p1'
                ? nextProfile.name.trim() || 'Player 1'
                : prev.matchConfig.player1Name,
            player2Name:
              playerId === 'p2'
                ? nextProfile.name.trim() || 'Player 2'
                : prev.matchConfig.player2Name,
          },
        }),
        true
      );
    },
    [commitSaveData]
  );

  const handlePurchase = useCallback(
    (
      playerId: 'p1' | 'p2',
      category: StoreCategory,
      item: StoreCatalogItem
    ): { ok: boolean; reason?: string } => {
      const res = purchaseStoreItemForProfile(
        saveDataRef.current,
        playerId,
        category,
        item.id,
        item.name,
        item.price
      );
      if (res.ok) {
        setSaveData(res.nextSave);
        saveDataRef.current = res.nextSave;
        engineRef.current?.playPurchaseSuccess();
      }
      return { ok: res.ok, reason: res.reason };
    },
    []
  );

  const handleEquip = useCallback(
    (playerId: 'p1' | 'p2', category: StoreCategory, itemId: string) => {
      commitSaveData((prev) => {
        const updatedProfile = equipItemOnProfile(
          prev.profiles[playerId],
          category,
          itemId
        );
        return {
          ...prev,
          profiles: {
            ...prev.profiles,
            [playerId]: updatedProfile,
          },
        };
      }, true);
    },
    [commitSaveData]
  );

  const handleResetAllProgress = useCallback(() => {
    const fresh = resetAllProgressData();
    setSaveData(fresh);
    saveDataRef.current = fresh;
    setPracticeSparring(false);
    engineRef.current?.setPracticeSparring(false);
    engineRef.current?.applyPreferences(fresh.preferences);
    engineRef.current?.updateConfig(fresh.matchConfig);
    engineRef.current?.applyCosmetics(fresh.profiles.p1, fresh.profiles.p2);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be restricted in some embedded iframes or iOS Safari
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const startMatchWithConfig = useCallback(
    (targetConfig: MatchConfig, existingSeries?: SeriesRunState | null) => {
      const curProfiles = saveDataRef.current.profiles;
      let nextSeries: SeriesRunState | null = null;
      let effectiveDifficulty = targetConfig.difficulty;

      if (existingSeries) {
        nextSeries = existingSeries;
        if (nextSeries.mode === 'tournament') {
          effectiveDifficulty =
            TOURNAMENT_STAGES[nextSeries.tournamentStageIndex]?.difficulty ??
            targetConfig.difficulty;
        }
      } else if (targetConfig.mode === 'best_of_three') {
        nextSeries = {
          mode: 'best_of_three',
          round: 1,
          wins1: 0,
          wins2: 0,
          targetWins: 2,
          tournamentStageIndex: 0,
        };
      } else if (targetConfig.mode === 'tournament') {
        effectiveDifficulty = TOURNAMENT_STAGES[0].difficulty;
        nextSeries = {
          mode: 'tournament',
          round: 1,
          wins1: 0,
          wins2: 0,
          targetWins: TOURNAMENT_STAGES.length,
          tournamentStageIndex: 0,
        };
      }

      seriesStateRef.current = nextSeries;
      setSeriesOutcome({ summaryLabel: null, nextLabel: null });

      const normalized: MatchConfig = {
        ...targetConfig,
        difficulty: effectiveDifficulty,
        player1Name:
          targetConfig.player1Name.trim() || curProfiles.p1.name || 'Player 1',
        player2Name:
          targetConfig.player2Name.trim() || curProfiles.p2.name || 'Player 2',
      };
      setLastMatchReward(null);
      if (normalized.mode !== 'practice') {
        setPracticeSparring(false);
        engineRef.current?.setPracticeSparring(false);
      } else {
        engineRef.current?.setPracticeSparring(practiceSparring);
      }
      updateConfig(normalized);
      setScreen('playing');
      engineRef.current?.applyCosmetics(curProfiles.p1, curProfiles.p2);

      const seriesMeta: SeriesMatchMeta | undefined = nextSeries
        ? {
            seriesWins1: nextSeries.wins1,
            seriesWins2: nextSeries.wins2,
            seriesRound: nextSeries.round,
            seriesTargetWins: nextSeries.targetWins,
            tournamentStageLabel:
              nextSeries.mode === 'tournament'
                ? TOURNAMENT_STAGES[nextSeries.tournamentStageIndex]?.label ??
                  null
                : null,
          }
        : undefined;

      engineRef.current?.startMatch(normalized, seriesMeta);
    },
    [practiceSparring, updateConfig]
  );

  const handleStartQuickMatch = useCallback(
    (overrideMode?: GameMode) => {
      const nextCfg = overrideMode
        ? { ...saveDataRef.current.matchConfig, mode: overrideMode }
        : saveDataRef.current.matchConfig;
      startMatchWithConfig(nextCfg);
    },
    [startMatchWithConfig]
  );

  const handleNextSeriesMatch = useCallback(() => {
    const activeSeries = seriesStateRef.current;
    if (!activeSeries) {
      startMatchWithConfig(saveDataRef.current.matchConfig);
      return;
    }
    startMatchWithConfig(saveDataRef.current.matchConfig, activeSeries);
  }, [startMatchWithConfig]);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseMatch();
    setScreen('paused');
  }, []);

  const handleResume = useCallback(() => {
    setScreen('playing');
    engineRef.current?.resumeMatch();
  }, []);

  const handleMainMenu = useCallback(() => {
    seriesStateRef.current = null;
    setSeriesOutcome({ summaryLabel: null, nextLabel: null });
    engineRef.current?.enterIdleMenu();
    setScreen('menu');
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && screen === 'playing') {
        handlePause();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [screen, handlePause]);

  const handleMatchFinished = useCallback((finalHud: LiveMatchHUDState) => {
    setHud(finalHud);
    const activeSave = saveDataRef.current;
    const activeCfg = activeSave.matchConfig;
    const isAIMode =
      activeCfg.mode === 'vs_ai' ||
      activeCfg.mode === 'time_challenge' ||
      activeCfg.mode === 'best_of_three' ||
      activeCfg.mode === 'tournament';

    if (activeCfg.mode !== 'practice' && finalHud.winner) {
      const p1Name =
        activeSave.profiles.p1.name || activeCfg.player1Name || 'Player 1';
      const p2Display = isAIMode
        ? `Arena AI (${activeCfg.difficulty.toUpperCase()})`
        : activeSave.profiles.p2.name || activeCfg.player2Name || 'Player 2';

      const matchId =
        finalHud.matchId ||
        `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const { nextSave, reward } = processCompletedMatchRewards(activeSave, {
        id: matchId,
        timestamp: Date.now(),
        mode: activeCfg.mode,
        difficulty: isAIMode ? activeCfg.difficulty : undefined,
        player1Name: p1Name,
        player2Name: p2Display,
        score1: finalHud.score1,
        score2: finalHud.score2,
        durationSeconds: activeCfg.durationSeconds,
        elapsedSeconds: Math.round(finalHud.elapsedSeconds),
        winner: finalHud.winner,
        topSpeedKmh: finalHud.topSpeedKmh,
      });

      setSaveData(nextSave);
      saveDataRef.current = nextSave;
      setLastMatchReward(reward);
      if (reward.p1TotalCoins > 0) {
        engineRef.current?.playCoinEarned();
      }

      // Advance Best of Three or Tournament series state
      const activeSeries = seriesStateRef.current;
      if (activeSeries && activeSeries.mode === 'best_of_three') {
        const wins1 = activeSeries.wins1 + (finalHud.winner === 'p1' ? 1 : 0);
        const wins2 = activeSeries.wins2 + (finalHud.winner === 'p2' ? 1 : 0);
        if (wins1 >= activeSeries.targetWins) {
          seriesStateRef.current = null;
          setSeriesOutcome({
            summaryLabel: `Best of Three · Series Won ${wins1}–${wins2}`,
            nextLabel: null,
          });
        } else if (wins2 >= activeSeries.targetWins) {
          seriesStateRef.current = null;
          setSeriesOutcome({
            summaryLabel: `Best of Three · Series Lost ${wins1}–${wins2}`,
            nextLabel: null,
          });
        } else {
          const nextRound =
            finalHud.winner === 'draw'
              ? activeSeries.round
              : activeSeries.round + 1;
          seriesStateRef.current = {
            ...activeSeries,
            wins1,
            wins2,
            round: nextRound,
          };
          setSeriesOutcome({
            summaryLabel: `Best of Three · Series ${wins1}–${wins2}`,
            nextLabel:
              finalHud.winner === 'draw'
                ? 'REPLAY ROUND'
                : `ROUND ${nextRound}`,
          });
        }
      } else if (activeSeries && activeSeries.mode === 'tournament') {
        const stage = TOURNAMENT_STAGES[activeSeries.tournamentStageIndex];
        if (finalHud.winner === 'p1') {
          if (activeSeries.tournamentStageIndex < TOURNAMENT_STAGES.length - 1) {
            const nextIdx = activeSeries.tournamentStageIndex + 1;
            const nextStage = TOURNAMENT_STAGES[nextIdx];
            seriesStateRef.current = {
              ...activeSeries,
              wins1: activeSeries.wins1 + 1,
              round: nextStage.round,
              tournamentStageIndex: nextIdx,
            };
            setSeriesOutcome({
              summaryLabel: `${stage.label} Cleared!`,
              nextLabel: `NEXT: ${nextStage.label.toUpperCase()}`,
            });
          } else {
            seriesStateRef.current = null;
            setSeriesOutcome({
              summaryLabel: 'Arcade Tournament Champion!',
              nextLabel: null,
            });
          }
        } else if (finalHud.winner === 'draw') {
          setSeriesOutcome({
            summaryLabel: `${stage.label} Tied · Rematch`,
            nextLabel: `REMATCH ${stage.label.toUpperCase()}`,
          });
        } else {
          seriesStateRef.current = null;
          setSeriesOutcome({
            summaryLabel: `Eliminated in ${stage.label}`,
            nextLabel: null,
          });
        }
      } else {
        setSeriesOutcome({ summaryLabel: null, nextLabel: null });
      }
    } else {
      setLastMatchReward(null);
      setSeriesOutcome({ summaryLabel: null, nextLabel: null });
    }

    setScreen('results');
  }, []);

  // Keyboard shortcuts: Escape to pause/resume/back/skip intro
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (screen === 'playing') {
          handlePause();
        } else if (screen === 'paused') {
          handleResume();
        } else if (screen === 'intro') {
          handleIntroComplete();
        } else if (
          screen === 'statistics' ||
          screen === 'instructions' ||
          screen === 'settings' ||
          screen === 'customize' ||
          screen === 'store' ||
          screen === 'profile' ||
          screen.startsWith('setup_')
        ) {
          setScreen(screen === 'settings' ? settingsReturnScreen : 'menu');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    settingsReturnScreen,
    handlePause,
    handleResume,
    handleIntroComplete,
  ]);

  const handleButtonClick = useCallback(() => {
    engineRef.current?.playUIClick();
  }, []);

  const handleOpenSettings = useCallback((returnTo: ScreenId) => {
    setSettingsReturnScreen(returnTo);
    setScreen('settings');
  }, []);

  const isSetupScreen =
    screen === 'setup_mode' ||
    screen === 'setup_players' ||
    screen === 'setup_duration' ||
    screen === 'setup_difficulty';

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-[#060B16] touch-gameplay">
      {/* Persistent Isolated 3D Canvas Viewport */}
      <GameCanvas
        initialConfig={config}
        initialPrefs={prefs}
        initialProfiles={profiles}
        onEngineReady={handleEngineReady}
        onHUDUpdate={setHud}
        onSpeedUpdate={handleSpeedUpdate}
        onMatchFinished={handleMatchFinished}
        onCinematicGoal={() => setGoalScoredInDemo(true)}
      />

      {/* Screen 1: Animated Loading Screen */}
      {screen === 'loading' && (
        <LoadingScreen
          ready={engineReady}
          onComplete={handleLoadingComplete}
          reducedMotion={prefs.reducedMotion}
        />
      )}

      {/* Screen 2: 5-Scene Cinematic Game Introduction */}
      {screen === 'intro' && (
        <CinematicIntro
          reducedMotion={prefs.reducedMotion}
          goalScoredInDemo={goalScoredInDemo}
          onStageChange={handleCinematicStageChange}
          onPlaySweep={() => engineRef.current?.playIntroSweep()}
          onPlayImpact={() => engineRef.current?.playIntroImpact()}
          onComplete={handleIntroComplete}
        />
      )}

      {/* Screen 3: Main Game Menu */}
      {screen === 'menu' && (
        <MainMenu
          config={config}
          profiles={profiles}
          dailyChallenges={dailyChallenges}
          muteAll={prefs.muteAll}
          isFullscreen={isFullscreen}
          reducedMotion={prefs.reducedMotion}
          onStartQuickMatch={handleStartQuickMatch}
          onNavigate={(next) => {
            if (next === 'settings') handleOpenSettings('menu');
            else setScreen(next);
          }}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screens 4-7: Mode, Player Names, Duration & Difficulty Setup */}
      {isSetupScreen && (
        <MatchSetupWizard
          activeScreen={screen}
          config={config}
          onUpdateConfig={updateConfig}
          onNavigate={setScreen}
          onStartMatch={() => startMatchWithConfig(config)}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 8: Player Profiles & Avatars */}
      {screen === 'profile' && (
        <ProfileScreen
          profiles={profiles}
          onUpdateProfile={handleUpdateProfile}
          onNavigate={setScreen}
          onBack={() => setScreen('menu')}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 9: Striker, Color, Table Theme & VFX Customization */}
      {screen === 'customize' && (
        <CustomizeScreen
          profiles={profiles}
          onUpdateProfile={handleUpdateProfile}
          onNavigate={setScreen}
          onBack={() => setScreen('menu')}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 10: EPIC SWING Game Store */}
      {screen === 'store' && (
        <StoreScreen
          profiles={profiles}
          reducedMotion={prefs.reducedMotion}
          onPurchase={handlePurchase}
          onEquip={handleEquip}
          onBack={() => setScreen('menu')}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 11: Game Instructions */}
      {screen === 'instructions' && (
        <InstructionsScreen
          onBack={() => setScreen('menu')}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 12: Gameplay HUD */}
      {(screen === 'playing' || screen === 'paused') && (
        <GameplayHUD
          hud={hud}
          config={config}
          profiles={profiles}
          prefs={prefs}
          isFullscreen={isFullscreen}
          practiceSparring={practiceSparring}
          liveSpeedRef={liveSpeedRef}
          topSpeedRef={topSpeedRef}
          practiceSpeedRef={practiceSpeedRef}
          onPause={() => {
            handleButtonClick();
            handlePause();
          }}
          onToggleMute={() => {
            handleButtonClick();
            handleToggleMute();
          }}
          onToggleFullscreen={() => {
            handleButtonClick();
            handleToggleFullscreen();
          }}
          onPracticeSpeedChange={(spd) => {
            const next = { ...config, practiceSpeedMultiplier: spd };
            updateConfig(next);
          }}
          onPracticeResetPuck={() => {
            handleButtonClick();
            engineRef.current?.resetPracticePuck(config.practiceSpeedMultiplier);
          }}
          onTogglePracticeSparring={() => {
            handleButtonClick();
            const nextVal = !practiceSparring;
            setPracticeSparring(nextVal);
            engineRef.current?.setPracticeSparring(nextVal);
          }}
        />
      )}

      {/* Screen 13: Pause Screen */}
      {screen === 'paused' && (
        <PauseModal
          config={config}
          profiles={profiles}
          score1={hud.score1}
          score2={hud.score2}
          muteAll={prefs.muteAll}
          musicEnabled={prefs.musicEnabled}
          onResume={handleResume}
          onRestart={() =>
            startMatchWithConfig(config, seriesStateRef.current ?? undefined)
          }
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
          onOpenSettings={() => handleOpenSettings('paused')}
          onMainMenu={handleMainMenu}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 14: Match Results & Coin Reward Screen */}
      {screen === 'results' && (
        <ResultsModal
          hud={hud}
          config={config}
          profiles={profiles}
          reward={lastMatchReward}
          reducedMotion={prefs.reducedMotion}
          seriesSummaryLabel={seriesOutcome.summaryLabel}
          seriesNextLabel={seriesOutcome.nextLabel}
          onNextSeriesMatch={
            seriesOutcome.nextLabel ? handleNextSeriesMatch : undefined
          }
          onPlayAgain={() => startMatchWithConfig(config)}
          onNavigate={setScreen}
          onMainMenu={handleMainMenu}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 15: Statistics Screen */}
      {screen === 'statistics' && (
        <StatsScreen
          stats={stats}
          profiles={profiles}
          onBack={() => setScreen('menu')}
          onResetStats={() =>
            commitSaveData((prev) => resetAllStatisticsOnly(prev))
          }
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Screen 16: Settings Screen */}
      {screen === 'settings' && (
        <SettingsScreen
          prefs={prefs}
          onChange={updatePrefs}
          onReplayIntro={handleReplayIntro}
          onResetAllProgress={handleResetAllProgress}
          onBack={() => setScreen(settingsReturnScreen)}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Offline Status Banner */}
      <OfflineIndicator />
    </main>
  );
}
