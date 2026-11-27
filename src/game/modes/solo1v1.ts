import type { BotArchetype } from '../ai/BotBrain';
import { getCharacterDef } from '../characters';
import type { CharacterId, SkinId, Solo1v1HudState } from '../types';

export type Solo1v1Phase = 'INTRO' | 'FIGHTING' | 'KO_SLOWMO' | 'ROUND_END' | 'MATCH_END';

export interface Solo1v1Config {
  opponentId: CharacterId;
  opponentSkinId?: SkinId;
  botArchetype: BotArchetype;
  winsNeeded: number;
  roundDuration: number;
}

export interface Solo1v1MatchStats {
  winner: 'player' | 'bot';
  playerWins: number;
  botWins: number;
  roundsPlayed: number;
  maxCombo: number;
  playerDamageDealt: number;
  botDamageDealt: number;
}

export interface Solo1v1UpdateInput {
  playerHp: number;
  playerMaxHp: number;
  botHp: number;
  botMaxHp: number;
  playerCombo: number;
}

export interface Solo1v1UpdateResult {
  timeScale: number;
  movementLocked: boolean;
  resetRound: boolean;
  matchEnded: boolean;
  winner: 'player' | 'bot' | null;
  bannerText: string | null;
  matchStats: Solo1v1MatchStats | null;
}

export const DEFAULT_SOLO_1V1_CONFIG: Solo1v1Config = {
  opponentId: 'raijin',
  opponentSkinId: 'default',
  botArchetype: 'RUSHDOWN',
  winsNeeded: 2,
  roundDuration: 99,
};

const INTRO_DURATION = 1.5;
const INTRO_FIGHT_THRESHOLD = 0.45; // Last 0.45s of INTRO shows "FIGHT!"
const KO_SLOWMO_DURATION = 1.2;
const KO_SLOWMO_TIMESCALE = 0.25;
const ROUND_END_DURATION = 0.85;

export class Solo1v1Controller {
  public config: Solo1v1Config = { ...DEFAULT_SOLO_1V1_CONFIG };
  public phase: Solo1v1Phase = 'INTRO';
  public roundNumber = 1;
  public playerWins = 0;
  public botWins = 0;
  public roundTimer = DEFAULT_SOLO_1V1_CONFIG.roundDuration;
  public maxCombo = 0;
  public playerDamageDealt = 0;
  public botDamageDealt = 0;
  public matchStats: Solo1v1MatchStats | null = null;

  private phaseTimer = INTRO_DURATION;
  private pendingRoundWinner: 'player' | 'bot' | 'draw' = 'draw';
  private koReason: 'ko' | 'timeout' = 'ko';
  private prevPlayerHp = 0;
  private prevBotHp = 0;
  private trackingHpInitialized = false;

  public startMatch(config?: Partial<Solo1v1Config>): void {
    const resolvedOpponent = getCharacterDef(
      config?.opponentId ?? DEFAULT_SOLO_1V1_CONFIG.opponentId,
      config?.opponentSkinId ?? 'default'
    );
    this.config = {
      ...DEFAULT_SOLO_1V1_CONFIG,
      ...config,
      opponentId: resolvedOpponent.id,
      opponentSkinId: config?.opponentSkinId ?? DEFAULT_SOLO_1V1_CONFIG.opponentSkinId,
      winsNeeded: config?.winsNeeded ?? DEFAULT_SOLO_1V1_CONFIG.winsNeeded,
      roundDuration: config?.roundDuration ?? DEFAULT_SOLO_1V1_CONFIG.roundDuration,
    };
    this.roundNumber = 1;
    this.playerWins = 0;
    this.botWins = 0;
    this.roundTimer = this.config.roundDuration;
    this.phase = 'INTRO';
    this.phaseTimer = INTRO_DURATION;
    this.maxCombo = 0;
    this.playerDamageDealt = 0;
    this.botDamageDealt = 0;
    this.matchStats = null;
    this.pendingRoundWinner = 'draw';
    this.koReason = 'ko';
    this.trackingHpInitialized = false;
  }

  public getTimeScale(): number {
    return this.phase === 'KO_SLOWMO' ? KO_SLOWMO_TIMESCALE : 1;
  }

  public isMovementLocked(): boolean {
    if (this.phase === 'INTRO') {
      return this.phaseTimer > INTRO_FIGHT_THRESHOLD;
    }
    return this.phase === 'ROUND_END' || this.phase === 'MATCH_END';
  }

  public getBannerText(): string | null {
    if (this.phase === 'INTRO') {
      return this.phaseTimer > INTRO_FIGHT_THRESHOLD
        ? `ROUND ${this.roundNumber}`
        : 'FIGHT!';
    }
    if (this.phase === 'KO_SLOWMO') {
      return this.koReason === 'timeout' ? 'TIME OVER' : 'K.O.';
    }
    if (this.phase === 'ROUND_END') {
      if (this.pendingRoundWinner === 'player') return 'ROUND WIN';
      if (this.pendingRoundWinner === 'bot') return 'ROUND LOST';
      return 'DRAW';
    }
    if (this.phase === 'MATCH_END') {
      return this.matchStats?.winner === 'player' ? 'VICTORY' : 'DEFEAT';
    }
    return null;
  }

  public update(dt: number, input: Solo1v1UpdateInput): Solo1v1UpdateResult {
    if (input.playerCombo > this.maxCombo) {
      this.maxCombo = input.playerCombo;
    }

    if (!this.trackingHpInitialized) {
      this.prevPlayerHp = input.playerHp;
      this.prevBotHp = input.botHp;
      this.trackingHpInitialized = true;
    } else if (this.phase === 'FIGHTING') {
      if (input.botHp < this.prevBotHp) {
        this.playerDamageDealt += Math.round(this.prevBotHp - input.botHp);
      }
      if (input.playerHp < this.prevPlayerHp) {
        this.botDamageDealt += Math.round(this.prevPlayerHp - input.playerHp);
      }
      this.prevPlayerHp = input.playerHp;
      this.prevBotHp = input.botHp;
    }

    let resetRound = false;
    let matchEnded = false;
    let winner: 'player' | 'bot' | null = null;

    if (this.phase === 'INTRO') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'FIGHTING';
        this.phaseTimer = 0;
        this.prevPlayerHp = input.playerHp;
        this.prevBotHp = input.botHp;
      }
    } else if (this.phase === 'FIGHTING') {
      this.roundTimer = Math.max(0, this.roundTimer - dt);
      const playerDead = input.playerHp <= 0;
      const botDead = input.botHp <= 0;
      const timeUp = this.roundTimer <= 0;

      if (playerDead || botDead || timeUp) {
        this.koReason = timeUp && !playerDead && !botDead ? 'timeout' : 'ko';
        if (botDead && !playerDead) {
          this.pendingRoundWinner = 'player';
        } else if (playerDead && !botDead) {
          this.pendingRoundWinner = 'bot';
        } else {
          const pRatio = input.playerMaxHp > 0 ? input.playerHp / input.playerMaxHp : 0;
          const bRatio = input.botMaxHp > 0 ? input.botHp / input.botMaxHp : 0;
          if (pRatio > bRatio) this.pendingRoundWinner = 'player';
          else if (bRatio > pRatio) this.pendingRoundWinner = 'bot';
          else this.pendingRoundWinner = 'draw';
        }
        this.phase = 'KO_SLOWMO';
        this.phaseTimer = KO_SLOWMO_DURATION;
      }
    } else if (this.phase === 'KO_SLOWMO') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.pendingRoundWinner === 'player') {
          this.playerWins++;
        } else if (this.pendingRoundWinner === 'bot') {
          this.botWins++;
        }

        if (this.playerWins >= this.config.winsNeeded || this.botWins >= this.config.winsNeeded) {
          const matchWinner: 'player' | 'bot' =
            this.playerWins >= this.config.winsNeeded ? 'player' : 'bot';
          this.phase = 'MATCH_END';
          this.phaseTimer = 0;
          this.matchStats = {
            winner: matchWinner,
            playerWins: this.playerWins,
            botWins: this.botWins,
            roundsPlayed: this.roundNumber,
            maxCombo: this.maxCombo,
            playerDamageDealt: this.playerDamageDealt,
            botDamageDealt: this.botDamageDealt,
          };
          matchEnded = true;
          winner = matchWinner;
        } else {
          this.phase = 'ROUND_END';
          this.phaseTimer = ROUND_END_DURATION;
        }
      }
    } else if (this.phase === 'ROUND_END') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.roundNumber++;
        this.roundTimer = this.config.roundDuration;
        this.phase = 'INTRO';
        this.phaseTimer = INTRO_DURATION;
        this.trackingHpInitialized = false;
        resetRound = true;
      }
    }

    return {
      timeScale: this.getTimeScale(),
      movementLocked: this.isMovementLocked(),
      resetRound,
      matchEnded,
      winner,
      bannerText: this.getBannerText(),
      matchStats: this.matchStats,
    };
  }

  public buildHudState(bot: {
    hp: number;
    maxHp: number;
    trailHp: number;
    heroCharacterId?: CharacterId | null;
    botBrain: { energy: number; maxEnergy: number };
  } | null): Solo1v1HudState {
    const oppDef = getCharacterDef(
      bot?.heroCharacterId ?? this.config.opponentId,
      this.config.opponentSkinId ?? 'default'
    );
    return {
      phase: this.phase,
      roundNumber: this.roundNumber,
      winsNeeded: this.config.winsNeeded,
      playerWins: this.playerWins,
      botWins: this.botWins,
      roundTimer: Math.ceil(this.roundTimer),
      bannerText: this.getBannerText(),
      opponentId: oppDef.id,
      opponentName: oppDef.name,
      opponentAccent: oppDef.accentColor,
      botArchetype: this.config.botArchetype,
      botHp: bot ? Math.max(0, Math.ceil(bot.hp)) : 0,
      botMaxHp: bot ? bot.maxHp : oppDef.maxHp,
      botTrailHp: bot ? Math.max(0, Math.ceil(bot.trailHp)) : 0,
      botEnergy: bot ? Math.round(bot.botBrain.energy) : 0,
      botMaxEnergy: bot ? bot.botBrain.maxEnergy : 100,
    };
  }
}
