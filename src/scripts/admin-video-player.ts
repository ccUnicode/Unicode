import '../styles/admin-video-player.css';

const expandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
const externalIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>';

/** One native player moves into the theater dialog without restarting playback. */
export function mountAdminVideo(host: HTMLElement, url: URL, durationSeconds: number): () => void {
  let disposed = false;
  let wantsPlayback = true;
  const video = document.createElement('video');
  const source = new URL(url);
  if (source.origin === location.origin && source.pathname.startsWith('/api/recruitment/video/')) source.searchParams.set('raw', '1');
  video.src = source.href;
  video.controls = false;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.className = 'admin-video-media';
  const frame = document.createElement('div');
  frame.className = 'admin-video-frame';
  const playerBox = document.createElement('div');
  playerBox.className = 'admin-video-player-box';
  const controls = document.createElement('div');
  controls.className = 'admin-video-controls';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'admin-video-control';
  const progress = document.createElement('input');
  progress.type = 'range';
  progress.min = '0';
  progress.max = String(Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0);
  progress.step = '0.1';
  progress.value = '0';
  progress.disabled = Number(progress.max) === 0;
  progress.setAttribute('aria-label', 'Posición del video');
  const time = document.createElement('span');
  time.className = 'admin-video-time';
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  let previewing = false;
  const update = () => {
    toggle.innerHTML = video.paused ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 4 12 8-12 8z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
    toggle.setAttribute('aria-label', video.paused ? 'Reproducir' : 'Pausar');
    const position = Math.min(Number(progress.max), Math.max(0, video.currentTime));
    if (!previewing) progress.value = String(position);
    time.textContent = `${formatTime(previewing ? Number(progress.value) : position)} / ${formatTime(Number(progress.max))}`;
    progress.setAttribute('aria-valuetext', time.textContent);
  };
  const play = () => { wantsPlayback = true; video.play().catch(() => { wantsPlayback = false; update(); }); };
  const pause = () => { wantsPlayback = false; video.pause(); update(); };
  toggle.addEventListener('click', () => { if (video.paused) play(); else pause(); });
  progress.addEventListener('pointerdown', () => { previewing = true; });
  progress.addEventListener('input', () => { previewing = true; update(); });
  progress.addEventListener('change', () => {
    const playing = wantsPlayback;
    video.currentTime = Math.min(Number(progress.max), Math.max(0, Number(progress.value)));
    previewing = false;
    if (playing) video.play().catch(() => {});
    update();
  });
  progress.addEventListener('pointercancel', () => { previewing = false; update(); });
  progress.addEventListener('blur', () => { previewing = false; update(); });
  ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata'].forEach(event => video.addEventListener(event, update));
  video.addEventListener('ended', () => { wantsPlayback = false; });
  // Preserve the explicit play/pause choice across browser-driven pauses and seeking.
  video.addEventListener('pause', () => {
    if (!wantsPlayback || disposed || video.ended || document.hidden) return;
    queueMicrotask(() => { if (wantsPlayback && !disposed && !video.ended) video.play().catch(() => { wantsPlayback = false; update(); }); });
  });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
  }
  const full = document.createElement('button');
  full.type = 'button';
  full.className = 'admin-video-control';
  full.innerHTML = expandIcon;
  full.setAttribute('aria-label', 'Pantalla completa');
  full.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else playerBox.requestFullscreen().catch(() => {});
  });
  controls.append(toggle, progress, time);
  playerBox.append(video, controls);
  frame.append(playerBox);
  const toolbar = document.createElement('div');
  toolbar.className = 'admin-video-toolbar';
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'admin-video-action';
  expand.innerHTML = `${expandIcon}<span>Ampliar</span>`;
  expand.setAttribute('aria-haspopup', 'dialog');
  const external = document.createElement('a');
  external.className = 'admin-video-action';
  external.href = url.href;
  external.target = '_blank';
  external.rel = 'noopener noreferrer';
  external.innerHTML = `${externalIcon}<span>Abrir en otra pestaña</span>`;
  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'admin-video-control';
  const updateSound = () => {
    sound.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/>${video.muted ? '<path d="m16 9 5 6m0-6-5 6"/>' : '<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;
    sound.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar');
  };
  sound.addEventListener('click', () => { video.muted = !video.muted; updateSound(); });
  video.addEventListener('volumechange', updateSound);
  controls.append(sound, full);
  updateSound(); update();
  toolbar.append(expand, external);
  host.replaceChildren(frame, toolbar);
  host.hidden = false;

  const dialog = document.createElement('dialog');
  dialog.className = 'admin-video-theater';
  dialog.setAttribute('aria-label', 'Video de postulación ampliado');
  const header = document.createElement('div');
  header.className = 'admin-video-theater-header';
  const title = document.createElement('span');
  title.textContent = 'Video de postulación';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'admin-video-action';
  close.textContent = 'Cerrar ✕';
  const largeFrame = document.createElement('div');
  largeFrame.className = 'admin-video-theater-frame';
  header.append(title, close);
  dialog.append(header, largeFrame);
  document.body.append(dialog);
  const movePlayer = (parent: HTMLElement) => {
    const playing = wantsPlayback;
    // Chromium preserves media playback when moving a connected tree this way.
    const movable = parent as HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void };
    if (typeof movable.moveBefore === 'function') movable.moveBefore(playerBox, null);
    else parent.append(playerBox);
    if (playing) video.play().catch(() => {});
  };
  expand.addEventListener('click', () => {
    dialog.showModal();
    movePlayer(largeFrame);
  });
  const closeTheater = () => { movePlayer(frame); dialog.close(); };
  close.addEventListener('click', closeTheater);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeTheater(); });
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closeTheater();
  });
  dialog.addEventListener('close', () => {
    if (disposed) return;
    if (playerBox.parentElement !== frame) movePlayer(frame);
    expand.focus();
  });
  // Browsers may block sound after asynchronous authorization. Start muted in that case.
  video.play().catch(async () => {
    if (disposed) return;
    video.muted = true;
    updateSound();
    try { await video.play(); } catch { /* Native play control remains available. */ }
  });
  return () => {
    disposed = true;
    wantsPlayback = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (dialog.open) dialog.close();
    dialog.remove();
    host.replaceChildren();
    host.hidden = true;
  };
}
