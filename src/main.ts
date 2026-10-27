/**
 * Entry point: creates the PixiJS renderer, builds all generated art, and
 * hands control to the UI (menus) which starts runs.
 */
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import jerseyUrl from '@fontsource/jersey-10/files/jersey-10-latin-400-normal.woff2?url';
import './ui/style.css';
import { Application } from 'pixi.js';
import { audio } from './audio/audio';
import { save } from './core/save';
import { Input } from './input/input';
import { buildAssets } from './render/assets';
import { UI } from './ui/ui';

async function boot(): Promise<void> {
  const stage = document.getElementById('stage')!;
  const uiRoot = document.getElementById('ui')!;
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: 0x05060a,
    antialias: false,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    powerPreference: 'high-performance',
    preference: 'webgl',
  });
  stage.appendChild(app.canvas);

  // Jersey 10 runs small, so register it scaled up as "Jersey UI" (keeps all CSS sizes sensible)
  try {
    const jersey = new FontFace('Jersey UI', `url(${jerseyUrl})`, { sizeAdjust: '122%' } as FontFaceDescriptors);
    document.fonts.add(jersey);
    void jersey.load();
  } catch {
    /* older browsers fall back to the unscaled face */
  }
  // fonts are used by in-world labels (Pixi Text), so wait for them first
  try {
    await Promise.race([
      Promise.all([document.fonts.load('10px Silkscreen'), document.fonts.load('16px "Jersey UI"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  if (window.matchMedia?.('(pointer: coarse)').matches) document.body.classList.add('touch');
  const assets = buildAssets();
  const input = new Input(document.getElementById('app')!);
  audio.setVolumes(save.data.settings.music, save.data.settings.sfx);

  // browsers only allow audio after a user gesture
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  const ui = new UI(app, assets, input, uiRoot);
  document.getElementById('boot')?.remove();
  app.ticker.add((t) => ui.frame(t.deltaMS));
  ui.showMenu();
  // ?debug exposes the UI for automated play-tests
  if (location.search.includes('debug')) (window as unknown as { swarmbreak: unknown }).swarmbreak = { ui, app, save };
}

void boot();
