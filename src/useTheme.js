/* ── Theme engine ──────────────────────────────────────────────────
   Colors are stored as space-separated RGB channel triplets on :root
   so Tailwind's opacity modifiers (bg-accent/15 etc.) keep working.

   The user picks a hue; we generate a full palette for both
   dark and light modes from that same hue.
   ────────────────────────────────────────────────────────────────── */

/** Convert HSL (degrees, %, %) → [r, g, b] 0-255 */
function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

/** Convert a #rrggbb hex string → [h (0-360), s (0-100), l (0-100)] */
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

/** Generate the accent hex for a given hue (for swatches / color input) */
export function hueToAccentHex(hue, mode = 'dark') {
  const [r, g, b] = hslToRgb(hue, 72, mode === 'light' ? 50 : 65)
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * Apply a complete theme.
 * @param {number} hue   - 0-360 hue from the color wheel
 * @param {number} sat   - 0-100 accent saturation
 * @param {'dark'|'light'} mode
 */
export function applyTheme(hue, sat = 72, mode = 'dark') {
  const set = (name, h, s, l) => {
    const [r, g, b] = hslToRgb(h, s, l)
    document.documentElement.style.setProperty(name, `${r} ${g} ${b}`)
  }

  if (mode === 'dark') {
    // Very dark backgrounds — low lightness, subtle hue tint
    set('--color-app',      hue, 18,  7)
    set('--color-app2',     hue, 20, 11)
    set('--color-surface',  hue, 22, 13)
    set('--color-surface2', hue, 24, 16)
    // Vibrant accent ramp
    set('--color-accent',   hue, sat,          65)
    set('--color-accent2',  hue, sat * 0.85,    72)
    set('--color-accent3',  hue, sat * 0.70,    78)
    // Foreground = white
    document.documentElement.style.setProperty('--color-fg', '255 255 255')
  } else {
    // Very light backgrounds — high lightness, soft hue tint
    set('--color-app',      hue, 30, 97)
    set('--color-app2',     hue, 25, 93)
    set('--color-surface',  hue, 20, 89)
    set('--color-surface2', hue, 18, 84)
    // Accent ramp — slightly darker in light mode for contrast
    set('--color-accent',   hue, sat,          48)
    set('--color-accent2',  hue, sat * 0.85,    42)
    set('--color-accent3',  hue, sat * 0.70,    36)
    // Foreground = dark, hue-tinted
    set('--color-fg',       hue, 25, 12)
  }

  localStorage.setItem('theme-hue',  String(hue))
  localStorage.setItem('theme-sat',  String(sat))
  localStorage.setItem('theme-mode', mode)
}

/** Restore the saved theme on app start. */
export function loadTheme() {
  const hue  = parseFloat(localStorage.getItem('theme-hue')  ?? '248')
  const sat  = parseFloat(localStorage.getItem('theme-sat')  ?? '72')
  const mode = (localStorage.getItem('theme-mode') ?? 'dark')
  applyTheme(hue, sat, mode)
  return { hue, sat, mode }
}

/** Reset to default dark purple theme. */
export function resetTheme() {
  localStorage.removeItem('theme-hue')
  localStorage.removeItem('theme-sat')
  localStorage.removeItem('theme-mode')
  applyTheme(248, 72, 'dark')
}

export const PRESETS = [
  { name: 'Violet', hue: 248, sat: 72 },
  { name: 'Blue',   hue: 213, sat: 80 },
  { name: 'Cyan',   hue: 185, sat: 75 },
  { name: 'Green',  hue: 142, sat: 65 },
  { name: 'Amber',  hue:  38, sat: 85 },
  { name: 'Rose',   hue: 345, sat: 78 },
  { name: 'Slate',  hue: 220, sat: 15 },
]
