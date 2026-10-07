import '../styles/admin-video-player.css';

const expandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
const externalIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>';

/** One native player moves into the theater dialog without restarting playback. */
export function mountAdminVideo(host: HTMLElement, url: URL): () => void {
  let disposed = false;
  const video = document.createElement('video');
  const source = new URL(url);
  if (source.origin === location.origin && source.pathname.startsWith('/api/recruitment/video/')) source.searchParams.set('raw', '1');
  video.src = source.href;
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.className = 'admin-video-media';
  const frame = document.createElement('div');
  frame.className = 'admin-video-frame';
  frame.append(video);
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
  sound.className = 'admin-video-action';
  sound.textContent = 'Activar sonido';
  sound.hidden = true;
  sound.addEventListener('click', () => { video.muted = false; video.play().catch(() => {}); });
  video.addEventListener('volumechange', () => { sound.hidden = !video.muted; });
  toolbar.append(expand, external, sound);
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
  expand.addEventListener('click', () => {
    const playing = !video.paused;
    largeFrame.append(video);
    dialog.showModal();
    if (playing) video.play().catch(() => {});
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (disposed) return;
    const playing = !video.paused;
    frame.append(video);
    if (playing) video.play().catch(() => {});
    expand.focus();
  });
  // Browsers may block sound after asynchronous authorization. Start muted in that case.
  video.play().catch(async () => {
    if (disposed) return;
    video.muted = true;
    sound.hidden = false;
    try { await video.play(); } catch { /* Native play control remains available. */ }
  });
  return () => {
    disposed = true;
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (dialog.open) dialog.close();
    dialog.remove();
    host.replaceChildren();
    host.hidden = true;
  };
}
