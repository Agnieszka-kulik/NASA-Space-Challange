/** true if the browser can render WebGL (the 3D twin needs it; otherwise the 2D view is used) */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
