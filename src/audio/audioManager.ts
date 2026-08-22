import { PropTier } from '../entities/swallowableEntity';

/**
 * Gestionnaire Audio procédural basé sur l'API WebAudio native.
 * Génère des effets sonores réactifs sans aucune dépendance de fichier externe.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterGain: GainNode | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn('[AudioManager] WebAudio not supported in this environment.', e);
    }
  }

  private ensureUnlocked(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Joue un son d'ingestion dont la fréquence et la durée s'adaptent au Tier et à la masse.
   */
  public playSwallowSound(tier: PropTier, _mass = 1.0): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureUnlocked();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    if (tier === PropTier.TIER_1) {
      // Micro Pop aigu
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } else if (tier === PropTier.TIER_2) {
      // Thud moyen
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);
    } else if (tier === PropTier.TIER_3) {
      // Grand crash / bang
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Macro & Giga-Macro Sub-Bass Rumble
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    }
  }

  /**
   * Joue une fanfare d'arpeggio ascendante lors du passage au niveau supérieur.
   */
  public playLevelUpSound(_level: number): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureUnlocked();

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4, E4, G4, C5, E5
    const startTime = this.ctx.currentTime;

    notes.forEach((freq, index) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + index * 0.08);

      gain.gain.setValueAtTime(0.35, startTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + index * 0.08 + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime + index * 0.08);
      osc.stop(startTime + index * 0.08 + 0.22);
    });
  }

  /**
   * Joue la fanfare de victoire finale 100% Speedrun.
   */
  public playVictorySound(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureUnlocked();

    const chords = [
      [523.25, 659.25, 783.99], // C Major
      [587.33, 739.99, 880.0],  // D Major
      [659.25, 830.61, 987.77], // E Major
      [1046.5, 1318.5, 1567.98] // High C Major
    ];

    const startTime = this.ctx.currentTime;

    chords.forEach((chord, stepIndex) => {
      chord.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + stepIndex * 0.18);

        const duration = stepIndex === chords.length - 1 ? 0.8 : 0.25;
        gain.gain.setValueAtTime(0.28, startTime + stepIndex * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + stepIndex * 0.18 + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime + stepIndex * 0.18);
        osc.stop(startTime + stepIndex * 0.18 + duration);
      });
    });
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
    }
  }

  public dispose(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
