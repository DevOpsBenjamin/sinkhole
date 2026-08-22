import { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';

export interface GameOverStats {
  score: number;
  swallowedCount: number;
  level: number;
  levelName: string;
}

/**
 * Gestionnaire de l'interface utilisateur 2D Babylon GUI.
 * Gère l'affichage du menu d'accueil, du HUD en jeu et de l'écran Game Over.
 */
export class UIManager {
  private advancedTexture: AdvancedDynamicTexture;

  // Screens
  private startScreen!: Rectangle;
  private hudContainer!: Rectangle;
  private gameOverScreen!: Rectangle;

  // HUD elements
  private timerText!: TextBlock;
  private timerBox!: Rectangle;
  private scoreText!: TextBlock;
  private countText!: TextBlock;
  private levelBadgeText!: TextBlock;
  private levelProgressBar!: Rectangle;
  private toastNotification!: Rectangle;
  private toastText!: TextBlock;

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
    this.createGameOverScreen();

    // Start with menu visible
    this.showStartScreen();
  }

  // -------------------------------------------------------------
  // START / MENU SCREEN
  // -------------------------------------------------------------

  private createStartScreen(): void {
    this.startScreen = new Rectangle('startScreen');
    this.startScreen.width = 1.0;
    this.startScreen.height = 1.0;
    this.startScreen.background = 'rgba(12, 14, 24, 0.88)';
    this.startScreen.thickness = 0;
    this.startScreen.zIndex = 100;
    this.advancedTexture.addControl(this.startScreen);

    const panel = new StackPanel('startPanel');
    panel.width = '640px';
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.startScreen.addControl(panel);

    // Game Title
    const title = new TextBlock('startTitle', '🕳️ SINKHOLE');
    title.color = '#FFD700';
    title.fontSize = 58;
    title.fontFamily = 'Impact, -apple-system, sans-serif';
    title.height = '70px';
    panel.addControl(title);

    // Subtitle
    const subtitle = new TextBlock('startSubtitle', 'Dévorez la ville et devenez gigantesque !');
    subtitle.color = '#00FFFF';
    subtitle.fontSize = 22;
    subtitle.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    subtitle.height = '35px';
    panel.addControl(subtitle);

    // Instructions Box
    const box = new Rectangle('instructionsBox');
    box.width = '560px';
    box.height = '230px';
    box.background = 'rgba(255, 255, 255, 0.06)';
    box.color = 'rgba(0, 255, 255, 0.4)';
    box.thickness = 1;
    box.cornerRadius = 12;
    box.paddingTop = '15px';
    box.paddingBottom = '15px';
    panel.addControl(box);

    const instructionsStack = new StackPanel('instStack');
    instructionsStack.paddingLeft = '20px';
    instructionsStack.paddingRight = '20px';
    box.addControl(instructionsStack);

    const line1 = new TextBlock('inst1', '🎮 CONTRÔLES :');
    line1.color = '#FFFFFF';
    line1.fontSize = 18;
    line1.fontStyle = 'bold';
    line1.height = '28px';
    instructionsStack.addControl(line1);

    const line2 = new TextBlock('inst2', '🖱️ Souris : Déplacez le curseur pour diriger le trou');
    line2.color = '#D0D8E8';
    line2.fontSize = 16;
    line2.height = '26px';
    instructionsStack.addControl(line2);

    const line3 = new TextBlock('inst3', '📱 Tactile : Glissez votre doigt sur l\'écran');
    line3.color = '#D0D8E8';
    line3.fontSize = 16;
    line3.height = '26px';
    instructionsStack.addControl(line3);

    const line4 = new TextBlock('inst4', '⌨️ Clavier : Touches ZQSD / WASD / Flèches');
    line4.color = '#D0D8E8';
    line4.fontSize = 16;
    line4.height = '26px';
    instructionsStack.addControl(line4);

    const line5 = new TextBlock('inst5', '⏱️ Défi : 2 minutes pour faire grossir le trou et tout engloutir !');
    line5.color = '#FFCC00';
    line5.fontSize = 16;
    line5.fontStyle = 'bold';
    line5.height = '30px';
    instructionsStack.addControl(line5);

    // Play Button
    const playBtn = Button.CreateSimpleButton('playBtn', '▶️ JOUER (2 MIN)');
    playBtn.width = '280px';
    playBtn.height = '64px';
    playBtn.color = '#FFFFFF';
    playBtn.background = '#00B4D8';
    playBtn.cornerRadius = 32;
    playBtn.fontSize = 24;
    playBtn.fontStyle = 'bold';
    playBtn.thickness = 2;
    playBtn.paddingTop = '15px';
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

    // 1. Top Left: Level & Progression Bar
    const levelBox = new Rectangle('levelBox');
    levelBox.width = '320px';
    levelBox.height = '80px';
    levelBox.background = 'rgba(15, 18, 30, 0.75)';
    levelBox.color = 'rgba(0, 255, 255, 0.3)';
    levelBox.thickness = 1;
    levelBox.cornerRadius = 10;
    levelBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    levelBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    levelBox.left = '30px';
    levelBox.top = '25px';
    this.hudContainer.addControl(levelBox);

    const levelStack = new StackPanel('levelStack');
    levelStack.paddingLeft = '15px';
    levelStack.paddingRight = '15px';
    levelBox.addControl(levelStack);

    this.levelBadgeText = new TextBlock('levelBadge', '⭐ NIVEAU 1 — Micro Trou');
    this.levelBadgeText.color = '#00FFFF';
    this.levelBadgeText.fontSize = 18;
    this.levelBadgeText.fontStyle = 'bold';
    this.levelBadgeText.height = '32px';
    this.levelBadgeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    levelStack.addControl(this.levelBadgeText);

    const barBg = new Rectangle('progressBarBg');
    barBg.width = '280px';
    barBg.height = '14px';
    barBg.background = 'rgba(255, 255, 255, 0.15)';
    barBg.color = 'transparent';
    barBg.cornerRadius = 7;
    barBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    levelStack.addControl(barBg);

    this.levelProgressBar = new Rectangle('progressBarFill');
    this.levelProgressBar.width = '0px';
    this.levelProgressBar.height = '14px';
    this.levelProgressBar.background = '#00E5FF';
    this.levelProgressBar.color = 'transparent';
    this.levelProgressBar.cornerRadius = 7;
    this.levelProgressBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barBg.addControl(this.levelProgressBar);

    // 2. Top Center: Timer Clock Pill
    this.timerBox = new Rectangle('timerBox');
    this.timerBox.width = '180px';
    this.timerBox.height = '65px';
    this.timerBox.background = 'rgba(15, 18, 30, 0.85)';
    this.timerBox.color = '#00B4D8';
    this.timerBox.thickness = 2;
    this.timerBox.cornerRadius = 16;
    this.timerBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.timerBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.timerBox.top = '25px';
    this.hudContainer.addControl(this.timerBox);

    this.timerText = new TextBlock('timerText', '⏱️ 02:00');
    this.timerText.color = '#FFFFFF';
    this.timerText.fontSize = 28;
    this.timerText.fontStyle = 'bold';
    this.timerBox.addControl(this.timerText);

    // 3. Top Right: Score & Count Card
    const scoreBox = new Rectangle('scoreBox');
    scoreBox.width = '260px';
    scoreBox.height = '80px';
    scoreBox.background = 'rgba(15, 18, 30, 0.75)';
    scoreBox.color = 'rgba(255, 215, 0, 0.3)';
    scoreBox.thickness = 1;
    scoreBox.cornerRadius = 10;
    scoreBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    scoreBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    scoreBox.left = '-30px';
    scoreBox.top = '25px';
    this.hudContainer.addControl(scoreBox);

    const scoreStack = new StackPanel('scoreStack');
    scoreStack.paddingRight = '15px';
    scoreBox.addControl(scoreStack);

    this.scoreText = new TextBlock('scoreText', '💎 0 PTS');
    this.scoreText.color = '#FFD700';
    this.scoreText.fontSize = 26;
    this.scoreText.fontStyle = 'bold';
    this.scoreText.height = '38px';
    this.scoreText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    scoreStack.addControl(this.scoreText);

    this.countText = new TextBlock('countText', '0 objets avalés');
    this.countText.color = '#A0B0C8';
    this.countText.fontSize = 16;
    this.countText.height = '24px';
    this.countText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    scoreStack.addControl(this.countText);

    // 4. Center Toast Notification (Level Up)
    this.toastNotification = new Rectangle('toastBox');
    this.toastNotification.width = '420px';
    this.toastNotification.height = '60px';
    this.toastNotification.background = 'rgba(0, 229, 255, 0.9)';
    this.toastNotification.color = '#FFFFFF';
    this.toastNotification.thickness = 2;
    this.toastNotification.cornerRadius = 30;
    this.toastNotification.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.toastNotification.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.toastNotification.top = '110px';
    this.toastNotification.isVisible = false;
    this.hudContainer.addControl(this.toastNotification);

    this.toastText = new TextBlock('toastText', '🎉 LEVEL UP !');
    this.toastText.color = '#0B132B';
    this.toastText.fontSize = 22;
    this.toastText.fontStyle = 'bold';
    this.toastNotification.addControl(this.toastText);
  }

  // -------------------------------------------------------------
  // GAME OVER SCREEN
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

    const title = new TextBlock('goTitle', '🏁 TEMPS ÉCOULÉ !');
    title.color = '#FF4D6D';
    title.fontSize = 54;
    title.fontFamily = 'Impact, -apple-system, sans-serif';
    title.height = '65px';
    panel.addControl(title);

    const sub = new TextBlock('goSub', 'Bilan de votre massacre urbain :');
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
    this.finalScoreText.fontSize = 36;
    this.finalScoreText.fontStyle = 'bold';
    this.finalScoreText.height = '50px';
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
    this.gameOverScreen.isVisible = false;
  }

  public showHUD(): void {
    this.startScreen.isVisible = false;
    this.hudContainer.isVisible = true;
    this.gameOverScreen.isVisible = false;
  }

  public showGameOver(stats: GameOverStats): void {
    this.startScreen.isVisible = false;
    this.hudContainer.isVisible = false;
    this.gameOverScreen.isVisible = true;

    this.finalScoreText.text = `🏆 SCORE : ${stats.score.toLocaleString()} PTS`;
    this.finalStatsText.text = `${stats.swallowedCount} objets dévorés • ${stats.levelName}`;
  }

  public updateTimer(remainingSeconds: number): void {
    const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
    const secs = Math.floor(Math.max(0, remainingSeconds) % 60);
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.timerText.text = `⏱️ ${formatted}`;

    // Under 15s warning: turn red
    if (remainingSeconds <= 15) {
      this.timerBox.color = '#FF3366';
      this.timerText.color = '#FF3366';
    } else {
      this.timerBox.color = '#00B4D8';
      this.timerText.color = '#FFFFFF';
    }
  }

  public updateScore(score: number, swallowedCount: number): void {
    this.scoreText.text = `💎 ${score.toLocaleString()} PTS`;
    this.countText.text = `${swallowedCount} objets avalés`;
  }

  public updateLevel(level: number, levelName: string, progressRatio: number): void {
    this.levelBadgeText.text = `⭐ NIVEAU ${level} — ${levelName}`;
    const totalBarWidth = 280;
    const fillWidth = Math.max(0, Math.min(1.0, progressRatio)) * totalBarWidth;
    this.levelProgressBar.width = `${fillWidth}px`;
  }

  private toastTimeout: any = null;

  public showLevelUpToast(levelName: string): void {
    this.toastText.text = `🎉 NOUVEAU NIVEAU : ${levelName.toUpperCase()} !`;
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
