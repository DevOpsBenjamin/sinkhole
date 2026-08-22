import { Scene } from '@babylonjs/core/scene';
import { GAME_CONFIG } from '../config/constants';
import { HoleController } from '../controllers/holeController';
import { Hole } from '../entities/hole';
import { GrowthManager } from './growthManager';
import { UIManager, GameSummaryStats } from '../ui/uiManager';
import { ArenaSpawner } from '../spawning/arenaSpawner';
import { PropFactory } from '../factories/propFactory';
import { IngestionTrigger } from '../physics/ingestionTrigger';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  VICTORY = 'VICTORY',
  GAME_OVER = 'GAME_OVER',
}

/**
 * Gestionnaire principal de la boucle de jeu Speedrun, du chronomètre ascendant
 * et de la condition de victoire 100% de la planète.
 */
export class GameManager {
  private scene: Scene;
  private hole: Hole;
  private holeController: HoleController;
  private growthManager: GrowthManager;
  private uiManager: UIManager;
  private arenaSpawner: ArenaSpawner;
  private propFactory: PropFactory;
  private ingestionTrigger: IngestionTrigger;

  private state: GameState = GameState.MENU;
  private elapsedSeconds = 0;
  private renderObserver: any = null;

  constructor(
    scene: Scene,
    hole: Hole,
    holeController: HoleController,
    growthManager: GrowthManager,
    uiManager: UIManager,
    arenaSpawner: ArenaSpawner,
    propFactory: PropFactory,
    ingestionTrigger: IngestionTrigger
  ) {
    this.scene = scene;
    this.hole = hole;
    this.holeController = holeController;
    this.growthManager = growthManager;
    this.uiManager = uiManager;
    this.arenaSpawner = arenaSpawner;
    this.propFactory = propFactory;
    this.ingestionTrigger = ingestionTrigger;

    this.setupUIHandlers();
    this.setupProgressionHandlers();
    this.setupGameLoop();

    // Initial state: Start Menu with controls and ingestion frozen
    this.holeController.setEnabled(false);
    this.ingestionTrigger.setEnabled(false);
  }

  private setupUIHandlers(): void {
    this.uiManager.setOnStart(() => {
      this.startGame();
    });

    this.uiManager.setOnRestart(() => {
      this.restartGame();
    });
  }

  private setupProgressionHandlers(): void {
    this.growthManager.onScoreChangedObservable.add(() => {
      if (this.state !== GameState.PLAYING) return;
      this.checkGameCompletion();
    });

    this.growthManager.onLevelUpObservable.add((event) => {
      if (this.state !== GameState.PLAYING) return;
      this.uiManager.showLevelUpToast(event.name, event.radius);
    });
  }

  private getCleanupPercentage(): number {
    const score = this.growthManager.getScore();
    const victoryScore = GAME_CONFIG.PROGRESSION.VICTORY_SCORE;
    return Math.min(100.0, (score / victoryScore) * 100);
  }

  private checkGameCompletion(): void {
    const cleanupPercent = this.getCleanupPercentage();
    if (cleanupPercent >= 100.0) {
      this.triggerVictory();
    }
  }

  private setupGameLoop(): void {
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (this.state !== GameState.PLAYING) return;

      const dt = this.scene.getEngine().getDeltaTime() / 1000.0;
      this.elapsedSeconds += dt;

      // 1. Mise à jour du chronomètre Speedrun
      this.uiManager.updateSpeedrunTimer(this.elapsedSeconds);

      // 2. Mise à jour métrique Katamari & Biome courant
      const holePos = this.hole.getPosition();
      const currentBiome = this.arenaSpawner.getBiomeNameForPosition(holePos);
      this.uiManager.updateKatamariMetrics(
        this.hole.getRadius(),
        this.growthManager.getLevel(),
        this.growthManager.getLevelName(),
        this.growthManager.getLevelProgress(),
        currentBiome
      );

      // 3. Mise à jour de la jauge d'épuration
      this.uiManager.updateCleanupStats(
        this.growthManager.getScore(),
        this.growthManager.getSwallowedCount(),
        this.getCleanupPercentage()
      );
    });
  }

  public startGame(): void {
    this.state = GameState.PLAYING;
    this.elapsedSeconds = 0;

    // Enable hole input controller and physical ingestion
    this.holeController.setEnabled(true);
    this.ingestionTrigger.setEnabled(true);

    // Show in-game HUD
    this.uiManager.showHUD();
    this.uiManager.updateSpeedrunTimer(0);
    this.uiManager.updateCleanupStats(0, 0, 0);

    const holePos = this.hole.getPosition();
    this.uiManager.updateKatamariMetrics(
      this.hole.getRadius(),
      this.growthManager.getLevel(),
      this.growthManager.getLevelName(),
      0,
      this.arenaSpawner.getBiomeNameForPosition(holePos)
    );

    console.log('[GameManager] Speedrun started! Chrono running.');
  }

  public triggerVictory(): void {
    this.state = GameState.VICTORY;

    // Freeze hole input controller and physical ingestion
    this.holeController.setEnabled(false);
    this.ingestionTrigger.setEnabled(false);

    const stats: GameSummaryStats = {
      score: this.growthManager.getScore(),
      swallowedCount: this.growthManager.getSwallowedCount(),
      level: this.growthManager.getLevel(),
      levelName: this.growthManager.getLevelName(),
      holeRadius: this.hole.getRadius(),
      elapsedSeconds: this.elapsedSeconds,
      cleanupPercent: 100.0,
    };

    // Display 100% Victory Screen
    this.uiManager.showVictory(stats);

    console.log(`[GameManager] 100% VICTORY! Planet cleansed in ${this.elapsedSeconds.toFixed(2)}s!`);
  }

  public endGame(): void {
    this.state = GameState.GAME_OVER;

    // Freeze hole input controller and physical ingestion
    this.holeController.setEnabled(false);
    this.ingestionTrigger.setEnabled(false);

    const stats: GameSummaryStats = {
      score: this.growthManager.getScore(),
      swallowedCount: this.growthManager.getSwallowedCount(),
      level: this.growthManager.getLevel(),
      levelName: this.growthManager.getLevelName(),
      holeRadius: this.hole.getRadius(),
      elapsedSeconds: this.elapsedSeconds,
      cleanupPercent: this.getCleanupPercentage(),
    };

    this.uiManager.showGameOver(stats);
  }

  public restartGame(): void {
    console.log('[GameManager] Restarting Speedrun...');

    // 1. Reset Hole position & size
    this.hole.setPosition(0, 0);

    // 2. Reset Growth & Progression
    this.growthManager.reset();

    // 3. Clear and repopulate the arena
    this.arenaSpawner.spawnArena(this.propFactory);

    // 4. Start fresh round
    this.startGame();
  }

  public getState(): GameState {
    return this.state;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
  }
}

