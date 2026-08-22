import { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';

export interface GameSummaryStats {
  score: number;
  swallowedCount: number;
  level: number;
  levelName: string;
  holeRadius: number;
  elapsedSeconds: number;
  cleanupPercent: number;
}

/**
 * Formate le rayon du trou en diamètre métrique Katamari réel (cm -> m -> km).
 */
export function formatKatamariMetric(radius: number): string {
  const diameter = radius * 2;
  if (diameter < 1.0) {
    const cm = Math.floor(diameter * 100);
    const mm = Math.floor((diameter * 1000) % 10);
    return `${cm}cm ${mm}mm`;
  } else if (diameter < 1000) {
    const m = Math.floor(diameter);
    const cm = Math.floor((diameter * 100) % 100);
    return `${m}m ${cm.toString().padStart(2, '0')}cm`;
  } else {
    const km = (diameter / 1000).toFixed(2);
    return `${km}km`;
  }
}

/**
 * Formate le temps en chronomètre Speedrun ascendant (MM:SS.CC).
 */
export function formatSpeedrunTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  const centis = Math.floor((Math.max(0, seconds) * 100) % 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

/**
 * Gestionnaire de l'interface utilisateur 2D Babylon GUI pour Sinkhole Planet.
 * Affiche la jauge métrique Katamari, le chronomètre ascendant speedrun, le % d'épuration,
 * et l'écran de victoire 100% de la planète.
 */
export class UIManager {
  private advancedTexture: AdvancedDynamicTexture;

  // Screens
  private startScreen!: Rectangle;
  private hudContainer!: Rectangle;
  private victoryScreen!: Rectangle;
  private gameOverScreen!: Rectangle;

  // HUD elements
  private metricDiameterText!: TextBlock;
  private levelBadgeText!: TextBlock;
  private biomeText!: TextBlock;
  private levelProgressBar!: Rectangle;
  private timerText!: TextBlock;
  private timerBox!: Rectangle;
  private cleanupText!: TextBlock;
  private scoreCountText!: TextBlock;
  private toastNotification!: Rectangle;
  private toastText!: TextBlock;

  // Victory elements
  private victoryTimeText!: TextBlock;
  private victoryDiameterText!: TextBlock;
  private victoryStatsText!: TextBlock;

  // Game Over elements
  private finalScoreText!: TextBlock;
  private finalStatsText!: TextBlock;

  // Callbacks
  private onStartCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;

  constructor(scene: Scene) {
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('SinkholeUI', true, scene);
    this.advancedTexture.idealWidth = 1920;
    this.advancedTexture.idealHeight = 1080;

    this.createStartScreen();
    this.createHUD();
    this.createVictoryScreen();
    this.createGameOverScreen();

    this.showStartScreen();
  }

  // -------------------------------------------------------------
  // START / SPEEDRUN MENU SCREEN
  // -------------------------------------------------------------

  private createStartScreen(): void {
    this.startScreen = new Rectangle('startScreen');
    this.startScreen.width = 1.0;
    this.startScreen.height = 1.0;
    this.startScreen.background = 'rgba(10, 12, 22, 0.90)';
    this.startScreen.thickness = 0;
    this.startScreen.zIndex = 100;
    this.advancedTexture.addControl(this.startScreen);

    const panel = new StackPanel('startPanel');
    panel.width = '660px';
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.startScreen.addControl(panel);

    // Title
    const title = new TextBlock('startTitle', '🪐 SINKHOLE PLANET');
    title.color = '#FFD700';
    title.fontSize = 52;
    title.fontFamily = 'Impact, -apple-system, sans-serif';
    title.height = '65px';
    panel.addControl(title);

    // Subtitle
    const subtitle = new TextBlock('startSubtitle', 'Mode Speedrun — Nettoyage 100% de la Planète');
    subtitle.color = '#00FFFF';
    subtitle.fontSize = 22;
    subtitle.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    subtitle.height = '35px';
    panel.addControl(subtitle);

    // Instructions Box
    const box = new Rectangle('instructionsBox');
    box.width = '580px';
    box.height = '240px';
    box.background = 'rgba(255, 255, 255, 0.05)';
    box.color = 'rgba(0, 255, 255, 0.35)';
    box.thickness = 1;
    box.cornerRadius = 14;
    box.paddingTop = '15px';
    box.paddingBottom = '15px';
    panel.addControl(box);

    const instructionsStack = new StackPanel('instStack');
    instructionsStack.paddingLeft = '20px';
    instructionsStack.paddingRight = '20px';
    box.addControl(instructionsStack);

    const line1 = new TextBlock('inst1', '🎮 CONTRÔLES SPHÉRIQUES 360° :');
    line1.color = '#FFFFFF';
    line1.fontSize = 18;
    line1.fontStyle = 'bold';
    line1.height = '28px';
    instructionsStack.addControl(line1);

    const line2 = new TextBlock('inst2', '⌨️ Clavier : ZQSD / WASD / Flèches directionnelles');
    line2.color = '#D0D8E8';
    line2.fontSize = 16;
    line2.height = '26px';
    instructionsStack.addControl(line2);

    const line3 = new TextBlock('inst3', '🖱️ Souris & Touch : Dirigez le trou par drag sur le globe');
    line3.color = '#D0D8E8';
    line3.fontSize = 16;
    line3.height = '26px';
    instructionsStack.addControl(line3);

    const line4 = new TextBlock('inst4', '📐 Échelle Katamari : Du micro (80cm) au colossal (>30m)');
    line4.color = '#00FFFF';
    line4.fontSize = 16;
    line4.height = '26px';
    instructionsStack.addControl(line4);

    const line5 = new TextBlock('inst5', '⚡ Défi : Dévorez 100% de la planète le plus vite possible !');
    line5.color = '#FFD700';
    line5.fontSize = 16;
    line5.fontStyle = 'bold';
    line5.height = '30px';
    instructionsStack.addControl(line5);

    // Play Button
    const playBtn = Button.CreateSimpleButton('playBtn', '⚡ DÉMARRER LE SPEEDRUN');
    playBtn.width = '380px';
    playBtn.height = '60px';
    playBtn.color = '#0B132B';
    playBtn.background = '#00E5FF';
    playBtn.cornerRadius = 30;
    playBtn.fontSize = 20;
    playBtn.fontStyle = 'bold';
    playBtn.thickness = 2;
    playBtn.top = '20px';
    playBtn.hoverCursor = 'pointer';

    playBtn.onPointerClickObservable.add(() => {
      if (this.onStartCallback) {
        this.onStartCallback();
      }
    });

    panel.addControl(playBtn);
  }

  // -------------------------------------------------------------
  // IN-GAME HUD
  // -------------------------------------------------------------

  private createHUD(): void {
    this.hudContainer = new Rectangle('hudContainer');
    this.hudContainer.width = 1.0;
    this.hudContainer.height = 1.0;
    this.hudContainer.thickness = 0;
    this.hudContainer.isHitTestVisible = false;
    this.hudContainer.isVisible = false;
    this.advancedTexture.addControl(this.hudContainer);

    // 1. Top Left: Katamari Metric Gauge, Level & Biome
    const metricBox = new Rectangle('metricBox');
    metricBox.width = '360px';
    metricBox.height = '110px';
    metricBox.background = 'rgba(12, 15, 26, 0.82)';
    metricBox.color = 'rgba(0, 255, 255, 0.35)';
    metricBox.thickness = 1;
    metricBox.cornerRadius = 12;
    metricBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    metricBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    metricBox.left = '30px';
    metricBox.top = '25px';
    this.hudContainer.addControl(metricBox);

    const metricStack = new StackPanel('metricStack');
    metricStack.paddingLeft = '15px';
    metricStack.paddingRight = '15px';
    metricBox.addControl(metricStack);

    // Metric diameter title
    this.metricDiameterText = new TextBlock('metricDiameter', '📏 2m 00cm');
    this.metricDiameterText.color = '#00FFFF';
    this.metricDiameterText.fontSize = 26;
    this.metricDiameterText.fontStyle = 'bold';
    this.metricDiameterText.height = '34px';
    this.metricDiameterText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    metricStack.addControl(this.metricDiameterText);

    // Level badge
    this.levelBadgeText = new TextBlock('levelBadge', '⭐ NIVEAU 1 — Micro Trou');
    this.levelBadgeText.color = '#FFFFFF';
    this.levelBadgeText.fontSize = 16;
    this.levelBadgeText.height = '24px';
    this.levelBadgeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    metricStack.addControl(this.levelBadgeText);

    // Biome location
    this.biomeText = new TextBlock('biomeText', '📍 Parc Intime');
    this.biomeText.color = '#A0C4E8';
    this.biomeText.fontSize = 14;
    this.biomeText.height = '20px';
    this.biomeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    metricStack.addControl(this.biomeText);

    // Progress bar
    const barBg = new Rectangle('progressBarBg');
    barBg.width = '320px';
    barBg.height = '10px';
    barBg.background = 'rgba(255, 255, 255, 0.15)';
    barBg.color = 'transparent';
    barBg.cornerRadius = 5;
    barBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barBg.top = '4px';
    metricStack.addControl(barBg);

    this.levelProgressBar = new Rectangle('progressBarFill');
    this.levelProgressBar.width = '0px';
    this.levelProgressBar.height = '10px';
    this.levelProgressBar.background = '#00E5FF';
    this.levelProgressBar.color = 'transparent';
    this.levelProgressBar.cornerRadius = 5;
    this.levelProgressBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barBg.addControl(this.levelProgressBar);

    // 2. Top Center: Speedrun Ascending Chronometer
    this.timerBox = new Rectangle('timerBox');
    this.timerBox.width = '200px';
    this.timerBox.height = '65px';
    this.timerBox.background = 'rgba(12, 15, 26, 0.85)';
    this.timerBox.color = '#00B4D8';
    this.timerBox.thickness = 2;
    this.timerBox.cornerRadius = 18;
    this.timerBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.timerBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.timerBox.top = '25px';
    this.hudContainer.addControl(this.timerBox);

    this.timerText = new TextBlock('timerText', '⏱️ 00:00.00');
    this.timerText.color = '#FFFFFF';
    this.timerText.fontSize = 24;
    this.timerText.fontFamily = 'Courier New, monospace';
    this.timerText.fontStyle = 'bold';
    this.timerBox.addControl(this.timerText);

    // 3. Top Right: Cleanup Percentage & Score
    const cleanupBox = new Rectangle('cleanupBox');
    cleanupBox.width = '360px';
    cleanupBox.height = '95px';
    cleanupBox.background = 'rgba(12, 15, 26, 0.82)';
    cleanupBox.color = 'rgba(255, 215, 0, 0.35)';
    cleanupBox.thickness = 1;
    cleanupBox.cornerRadius = 12;
    cleanupBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    cleanupBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    cleanupBox.left = '-30px';
    cleanupBox.top = '25px';
    this.hudContainer.addControl(cleanupBox);

    this.cleanupText = new TextBlock('cleanupText', '🌍 0.0% NETTOYÉ');
    this.cleanupText.color = '#FFD700';
    this.cleanupText.fontSize = 22;
    this.cleanupText.fontStyle = 'bold';
    this.cleanupText.height = '32px';
    this.cleanupText.top = '-14px';
    this.cleanupText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    cleanupBox.addControl(this.cleanupText);

    this.scoreCountText = new TextBlock('scoreCountText', '💎 0 PTS • 0 objets');
    this.scoreCountText.color = '#D0D8E8';
    this.scoreCountText.fontSize = 16;
    this.scoreCountText.height = '24px';
    this.scoreCountText.top = '16px';
    this.scoreCountText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    cleanupBox.addControl(this.scoreCountText);

    // 4. Center Toast Notification (Level Up)
    this.toastNotification = new Rectangle('toastBox');
    this.toastNotification.width = '480px';
    this.toastNotification.height = '60px';
    this.toastNotification.background = 'rgba(0, 229, 255, 0.92)';
    this.toastNotification.color = '#FFFFFF';
    this.toastNotification.thickness = 2;
    this.toastNotification.cornerRadius = 30;
    this.toastNotification.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.toastNotification.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.toastNotification.top = '115px';
    this.toastNotification.isVisible = false;
    this.hudContainer.addControl(this.toastNotification);

    this.toastText = new TextBlock('toastText', '🎉 NOUVEAU NIVEAU !');
    this.toastText.color = '#0B132B';
    this.toastText.fontSize = 22;
    this.toastText.fontStyle = 'bold';
    this.toastNotification.addControl(this.toastText);
  }

  // -------------------------------------------------------------
  // 100% VICTORY SCREEN
  // -------------------------------------------------------------

  private createVictoryScreen(): void {
    this.victoryScreen = new Rectangle('victoryScreen');
    this.victoryScreen.width = 1.0;
    this.victoryScreen.height = 1.0;
    this.victoryScreen.background = 'rgba(8, 12, 24, 0.94)';
    this.victoryScreen.thickness = 0;
    this.victoryScreen.zIndex = 100;
    this.victoryScreen.isVisible = false;
    this.advancedTexture.addControl(this.victoryScreen);

    const panel = new StackPanel('victoryPanel');
    panel.width = '680px';
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.victoryScreen.addControl(panel);

    // Title
    const title = new TextBlock('vicTitle', '👑 PLANÈTE NETTOYÉE À 100% !');
    title.color = '#FFD700';
    title.fontSize = 48;
    title.fontFamily = 'Impact, -apple-system, sans-serif';
    title.height = '65px';
    panel.addControl(title);

    const sub = new TextBlock('vicSub', '🏆 VICTOIRE SPEEDRUN PLANÉTAIRE !');
    sub.color = '#00FFFF';
    sub.fontSize = 22;
    sub.fontStyle = 'bold';
    sub.height = '35px';
    panel.addControl(sub);

    // Stats Box
    const statsBox = new Rectangle('vicStatsBox');
    statsBox.width = '560px';
    statsBox.height = '200px';
    statsBox.background = 'rgba(255, 255, 255, 0.06)';
    statsBox.color = 'rgba(255, 215, 0, 0.5)';
    statsBox.thickness = 2;
    statsBox.cornerRadius = 16;
    statsBox.paddingTop = '15px';
    statsBox.paddingBottom = '15px';
    panel.addControl(statsBox);

    const statsStack = new StackPanel('vicStatsStack');
    statsBox.addControl(statsStack);

    this.victoryTimeText = new TextBlock('vicTime', '⏱️ TEMPS SPEEDRUN : 00:00.00');
    this.victoryTimeText.color = '#00FF66';
    this.victoryTimeText.fontSize = 28;
    this.victoryTimeText.fontStyle = 'bold';
    this.victoryTimeText.fontFamily = 'Courier New, monospace';
    this.victoryTimeText.height = '42px';
    statsStack.addControl(this.victoryTimeText);

    this.victoryDiameterText = new TextBlock('vicDiameter', '📏 DIAMÈTRE FINAL : 36m 00cm');
    this.victoryDiameterText.color = '#00FFFF';
    this.victoryDiameterText.fontSize = 24;
    this.victoryDiameterText.fontStyle = 'bold';
    this.victoryDiameterText.height = '38px';
    statsStack.addControl(this.victoryDiameterText);

    this.victoryStatsText = new TextBlock('vicStats', '💎 3,500 PTS • 150 objets engloutis');
    this.victoryStatsText.color = '#FFFFFF';
    this.victoryStatsText.fontSize = 20;
    this.victoryStatsText.height = '34px';
    statsStack.addControl(this.victoryStatsText);

    // Replay Button
    const restartBtn = Button.CreateSimpleButton('restartVicBtn', '🔄 NOUVEAU RUN SPEEDRUN');
    restartBtn.width = '340px';
    restartBtn.height = '65px';
    restartBtn.color = '#0B132B';
    restartBtn.background = '#FFD700';
    restartBtn.cornerRadius = 32;
    restartBtn.fontSize = 22;
    restartBtn.fontStyle = 'bold';
    restartBtn.thickness = 2;
    restartBtn.paddingTop = '20px';
    restartBtn.hoverCursor = 'pointer';

    restartBtn.onPointerClickObservable.add(() => {
      if (this.onRestartCallback) {
        this.onRestartCallback();
      }
    });

    panel.addControl(restartBtn);
  }

  // -------------------------------------------------------------
  // GAME OVER SCREEN (TIME EXPIRED)
  // -------------------------------------------------------------

  private createGameOverScreen(): void {
    this.gameOverScreen = new Rectangle('gameOverScreen');
    this.gameOverScreen.width = 1.0;
    this.gameOverScreen.height = 1.0;
    this.gameOverScreen.background = 'rgba(12, 14, 24, 0.92)';
    this.gameOverScreen.thickness = 0;
    this.gameOverScreen.zIndex = 100;
    this.gameOverScreen.isVisible = false;
    this.advancedTexture.addControl(this.gameOverScreen);

    const panel = new StackPanel('gameOverPanel');
    panel.width = '640px';
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.gameOverScreen.addControl(panel);

    const title = new TextBlock('goTitle', '⏱️ TEMPS ÉCOULÉ !');
    title.color = '#FF4D6D';
    title.fontSize = 54;
    title.fontFamily = 'Impact, -apple-system, sans-serif';
    title.height = '65px';
    panel.addControl(title);

    const sub = new TextBlock('goSub', 'Bilan de votre run planétaire :');
    sub.color = '#A0B0C8';
    sub.fontSize = 20;
    sub.height = '35px';
    panel.addControl(sub);

    // Stats Card
    const statsBox = new Rectangle('statsBox');
    statsBox.width = '520px';
    statsBox.height = '180px';
    statsBox.background = 'rgba(255, 255, 255, 0.05)';
    statsBox.color = 'rgba(255, 77, 109, 0.4)';
    statsBox.thickness = 1;
    statsBox.cornerRadius = 14;
    statsBox.paddingTop = '15px';
    statsBox.paddingBottom = '15px';
    panel.addControl(statsBox);

    const statsStack = new StackPanel('statsStack');
    statsBox.addControl(statsStack);

    this.finalScoreText = new TextBlock('finalScore', '🏆 SCORE : 0 PTS');
    this.finalScoreText.color = '#FFD700';
    this.finalScoreText.fontSize = 32;
    this.finalScoreText.fontStyle = 'bold';
    this.finalScoreText.height = '46px';
    statsStack.addControl(this.finalScoreText);

    this.finalStatsText = new TextBlock('finalStats', '0 objets dévorés • Niveau 1');
    this.finalStatsText.color = '#FFFFFF';
    this.finalStatsText.fontSize = 20;
    this.finalStatsText.height = '35px';
    statsStack.addControl(this.finalStatsText);

    // Replay Button
    const restartBtn = Button.CreateSimpleButton('restartBtn', '🔄 REJOUER');
    restartBtn.width = '260px';
    restartBtn.height = '64px';
    restartBtn.color = '#FFFFFF';
    restartBtn.background = '#FF4D6D';
    restartBtn.cornerRadius = 32;
    restartBtn.fontSize = 24;
    restartBtn.fontStyle = 'bold';
    restartBtn.thickness = 2;
    restartBtn.paddingTop = '20px';
    restartBtn.hoverCursor = 'pointer';

    restartBtn.onPointerClickObservable.add(() => {
      if (this.onRestartCallback) {
        this.onRestartCallback();
      }
    });

    panel.addControl(restartBtn);
  }

  // -------------------------------------------------------------
  // PUBLIC CONTROLS & UPDATES
  // -------------------------------------------------------------

  public setOnStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  public setOnRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  public showStartScreen(): void {
    this.startScreen.isVisible = true;
    this.hudContainer.isVisible = false;
    this.victoryScreen.isVisible = false;
    this.gameOverScreen.isVisible = false;
  }

  public showHUD(): void {
    this.startScreen.isVisible = false;
    this.hudContainer.isVisible = true;
    this.victoryScreen.isVisible = false;
    this.gameOverScreen.isVisible = false;
  }

  public showVictory(stats: GameSummaryStats): void {
    this.startScreen.isVisible = false;
    this.hudContainer.isVisible = false;
    this.victoryScreen.isVisible = true;
    this.gameOverScreen.isVisible = false;

    this.victoryTimeText.text = `⏱️ TEMPS SPEEDRUN : ${formatSpeedrunTime(stats.elapsedSeconds)}`;
    this.victoryDiameterText.text = `📏 DIAMÈTRE FINAL : ${formatKatamariMetric(stats.holeRadius)}`;
    this.victoryStatsText.text = `💎 ${stats.score.toLocaleString()} PTS • ${stats.swallowedCount} objets engloutis`;
  }

  public showGameOver(stats: GameSummaryStats): void {
    this.startScreen.isVisible = false;
    this.hudContainer.isVisible = false;
    this.victoryScreen.isVisible = false;
    this.gameOverScreen.isVisible = true;

    this.finalScoreText.text = `🏆 SCORE : ${stats.score.toLocaleString()} PTS (${stats.cleanupPercent.toFixed(1)}%)`;
    this.finalStatsText.text = `${stats.swallowedCount} objets dévorés • ${formatKatamariMetric(stats.holeRadius)}`;
  }

  public updateSpeedrunTimer(elapsedSeconds: number): void {
    this.timerText.text = `⏱️ ${formatSpeedrunTime(elapsedSeconds)}`;
  }

  public updateKatamariMetrics(radius: number, level: number, levelName: string, progressRatio: number, biomeName: string): void {
    this.metricDiameterText.text = `📏 ${formatKatamariMetric(radius)}`;
    this.levelBadgeText.text = `⭐ NIVEAU ${level} — ${levelName}`;
    this.biomeText.text = `📍 ${biomeName}`;

    const totalBarWidth = 320;
    const fillWidth = Math.max(0, Math.min(1.0, progressRatio)) * totalBarWidth;
    this.levelProgressBar.width = `${fillWidth}px`;
  }

  public updateCleanupStats(score: number, swallowedCount: number, cleanupPercent: number): void {
    this.cleanupText.text = `🌍 ${cleanupPercent.toFixed(1)}% NETTOYÉ`;
    this.scoreCountText.text = `💎 ${score.toLocaleString()} PTS • ${swallowedCount} objets`;
  }

  private toastTimeout: any = null;

  public showLevelUpToast(levelName: string, radius: number): void {
    this.toastText.text = `🎉 ${levelName.toUpperCase()} ! (${formatKatamariMetric(radius)})`;
    this.toastNotification.isVisible = true;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.toastNotification.isVisible = false;
      this.toastTimeout = null;
    }, 2800);
  }

  public dispose(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.advancedTexture.dispose();
  }
}

