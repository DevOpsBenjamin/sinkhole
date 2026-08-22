import { GameApp } from './app';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new GameApp();
    (window as any)._gameApp = app;
    await app.start();
  } catch (error) {
    console.error('[Main] Application bootstrap failed:', error);
  }
});
