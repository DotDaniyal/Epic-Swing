let cachedSoftwareWebGL: boolean | null = null;

/**
 * Detects whether the browser is falling back to a software WebGL rasterizer
 * (e.g. SwiftShader, llvmpipe) and caches the result so 3D viewports don't
 * spawn extra temporary WebGL2 contexts on subsequent mounts.
 */
export function detectSoftwareWebGL(): boolean {
  if (cachedSoftwareWebGL !== null) return cachedSoftwareWebGL;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      cachedSoftwareWebGL = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareWebGL = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareWebGL;
  } catch {
    cachedSoftwareWebGL = true;
    return true;
  }
}

/**
 * Schedules the next render tick only after software WebGL finishes GPU commands
 * so low-end or virtualized environments never stall the main thread.
 */
export function scheduleAfterDraw(
  gl: WebGL2RenderingContext | null,
  isDisposed: () => boolean,
  onSetTimer: (id: number) => void,
  callback: () => void
): void {
  if (isDisposed()) return;
  if (!gl || !gl.fenceSync) {
    onSetTimer(window.setTimeout(callback, 80));
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    if (isDisposed()) {
      if (sync) gl.deleteSync(sync);
      return;
    }
    const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
    if (state === gl.UNSIGNALED) {
      onSetTimer(window.setTimeout(poll, 5));
    } else {
      if (sync) gl.deleteSync(sync);
      onSetTimer(window.setTimeout(callback, 80));
    }
  };
  onSetTimer(window.setTimeout(poll, 5));
}
