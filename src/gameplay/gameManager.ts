import { Scene } from '@babylonjs/core/scene';
import { GAME_CONFIG } from '../config/constants';
import { HoleController } from '../controllers/holeController';
import { Hole } from '../entities/hole';
import { GrowthManager } from './growthManager';
import { UIManager } from '../ui/uiManager';
import { ArenaSpawner } from '../spawning/arenaSpawner';
import { PropFactory } from '../factories/propFactory';
import { IngestionTrigger } from '../physics/ingestionTrigger';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

/**
 * Gestionnaire principal de la boucle de jeu, du chronomètre 2 minutes et des états de partie.
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
  private remainingSeconds: number = GAME_CONFIG.TIMING.ROUND_DURATION;
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
    this.setupTimerLoop();

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
    this.growthManager.onScoreChangedObservable.add((event) => {
      if (this.state !== GameState.PLAYING) return;
      this.uiManager.updateScore(event.score, event.totalSwallowed);
      this.uiManager.updateLevel(
        this.growthManager.getLevel(),
        this.growthManager.getLevelName(),
        this.growthManager.getLevelProgress()
      );
    });

    this.growthManager.onLevelUpObservable.add((event) => {
      if (this.state !== GameState.PLAYING) return;
      this.uiManager.showLevelUpToast(event.name);
    });
  }

  private setupTimerLoop(): void {
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (this.state !== GameState.PLAYING) return;

      const dt = this.scene.getEngine().getDeltaTime() / 1000.0;
      this.remainingSeconds -= dt;

      this.uiManager.updateTimer(this.remainingSeconds);

      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.endGame();
      }
    });
  }

  public startGame(): void {
    this.state = GameState.PLAYING;
    this.remainingSeconds = GAME_CONFIG.TIMING.ROUND_DURATION;

    // Enable hole input controller and physical ingestion
    this.holeController.setEnabled(true);
    this.ingestionTrigger.setEnabled(true);

    // Show in-game HUD
    this.uiManager.showHUD();
    this.uiManager.updateTimer(this.remainingSeconds);
    this.uiManager.updateScore(this.growthManager.getScore(), this.growthManager.getSwallowedCount());
    this.uiManager.updateLevel(
      this.growthManager.getLevel(),
      this.growthManager.getLevelName(),
      this.growthManager.getLevelProgress()
    );

    console.log('[GameManager] Game started! 2 minutes chrono timer running.');
  }

  public endGame(): void {
    this.state = GameState.GAME_OVER;

    // Freeze hole input controller and physical ingestion
    this.holeController.setEnabled(false);
    this.ingestionTrigger.setEnabled(false);

    // Display Game Over summary
    this.uiManager.showGameOver({
      score: this.growthManager.getScore(),
      swallowedCount: this.growthManager.getSwallowedCount(),
      level: this.growthManager.getLevel(),
      levelName: this.growthManager.getLevelName(),
    });

    console.log(`[GameManager] Game Over! Final score: ${this.growthManager.getScore()}`);
  }

  public restartGame(): void {
    console.log('[GameManager] Restarting game...');

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

  public getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
  }
}
