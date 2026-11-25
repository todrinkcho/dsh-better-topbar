/**
 * Browser half of `@todrink/dsh-better-topbar`.
 *
 * Goal: the sidebar keeps only the workspace browser. The host's own entry
 * buttons — brand/home and the panel list (插件 / 项目文件夹 / 自动化任务 / 更多) — are
 * painted as one compact icon row above the new-session button, on the same
 * left column as 新会话 and 工作区.
 *
 * Icons: every chip paints a 16px glyph through a CSS mask, so all five marks
 * share one grid (16×16), one stroke weight (1px), one colour (`currentColor`)
 * and one optical box. Four of them are the app's own artwork, copied from the
 * host icon set (plugin pinwheel / clock / apps-add / folder-open); the brand
 * button gets a house drawn on the same grid. The host glyphs — including
 * third-party ones such as the filled folder the Project Folders plugin
 * registers — are hidden once a chip owns an icon, and entries we cannot
 * classify fall back to their own glyph, normalized to the same 16px box.
 *
 * Settings and the account button stay where the host puts them (bottom-left of
 * the sidebar).
 *
 * Why paint instead of re-implement: the entries belong to other plugins and to
 * the host itself. Their click handlers, popovers, pin/unpin and shortcuts all
 * stay attached to the original nodes, so nothing is rebuilt. We only tag nodes
 * and let CSS place them. A React re-render that swaps a node never loses
 * behaviour, because nothing was moved in the DOM tree.
 *
 * Geometry is measured from the live sidebar box on every pass, so the row lands
 * under whatever chrome the platform draws above the frame (the Windows app menu
 * row) instead of assuming a fixed offset.
 *
 * Contract notes (verified against DSH 0.2.2-rc.5):
 *   - `[data-slot="sidebar.panellist"]` is only an entry's glyph slot; the list
 *     that stacks the entries is the nearest <nav> above it.
 *   - `[data-slot="sidebar.brand.mark"]` / `brand.name` sit inside the brand
 *     button, which is the host's home / new-session control.
 *   - Entry buttons carry the panel label in `aria-label` and nothing else we
 *     can classify by; the label is localized, so the matcher accepts both
 *     Chinese and English wording.
 *   - A collapsed sidebar is a ~48px icon rail; there the native layout is
 *     already icon-only, so this skin stands down (data-tbn-compact).
 */

const STYLE_ID = 'dsh-topbar-nav-style'
const BODY_ATTR = 'data-tbn'

/** Chip edge, gap between chips, and the row's left inset. */
const ICON = 28
const GAP = 4
/**
 * The host's collapse toggle keeps its native seat in the caption band (left:
 * 12px, top: 6px) — a row ABOVE this strip, because the sidebar starts below the
 * window's menu band. It therefore takes no horizontal room here: the strip
 * starts on the sidebar's icon column, where host glyphs sit at
 * `inline-padding(8) + row-padding(12) = 20` and a 28px chip centres a 16px
 * glyph with 6px on each side (20 - 6 = 14).
 */
const INSET = 14
/** Painted glyph edge; every mark uses the host's 16px grid. */
const GLYPH = 16
/** Gap kept free on the right so a wrapped chip never touches the edge. */
const TRAIL = 8

/** The panel entries follow the brand chip. */
const ROW_LEFT = ICON + GAP

/** 16-grid line art: one family, 1px stroke, round caps — same as the host set. */
const svg = (markup) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`

const GLYPHS = {
  /** The brand button is the host's home / new-session control. */
  home: svg('<path d="M2.15 7.3 8 2.45l5.85 4.85"/><path d="M3.85 6.7v6.65h8.3V6.7"/>'),
  plugins: svg(
    '<path d="M7.84457 5.06199C11.6605 4.93876 14.7962 6.14848 14.8484 7.76397C14.8875 8.97461 13.1838 10.0696 10.7215 10.5942"/>'
    + '<path d="M5.12742 8.07731C5.00419 4.26138 6.21391 1.12568 7.8294 1.07351C9.04004 1.03441 10.135 2.73808 10.6596 5.20037"/>'
    + '<path d="M8.02457 10.6802C4.20865 10.8034 1.07294 9.5937 1.02077 7.97821C0.981678 6.76758 2.68535 5.67262 5.14763 5.14798"/>'
    + '<path d="M10.7476 7.89535C10.8708 11.7113 9.66109 14.847 8.0456 14.8991C6.83496 14.9382 5.74 13.2346 5.21536 10.7723"/>',
  ),
  folder: svg(
    '<path d="M12.3994 13.5986H2.04956C1.49728 13.5986 1.04956 13.1509 1.04956 12.5986V3.40137C1.04956 2.84908 1.49728 2.40137 2.04956 2.40137H4.76632C5.01016 2.40137 5.24561 2.49046 5.42836 2.6519L6.94088 3.98799C7.12364 4.14943 7.35908 4.23852 7.60293 4.23852H12.3994C12.9517 4.23852 13.3994 4.68624 13.3994 5.23852V7.16991"/>'
    + '<path d="M2.55911 7.93683C2.67584 7.49906 3.07229 7.19446 3.52536 7.19446H13.6491C14.3061 7.19446 14.7846 7.81725 14.6153 8.45209L13.4411 12.856C13.3244 13.2938 12.9279 13.5984 12.4748 13.5984H2.35113C1.69411 13.5984 1.21562 12.9756 1.38489 12.3407L2.55911 7.93683Z"/>',
  ),
  schedules: svg(
    '<path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"/>'
    + '<path d="M8 4.31V8.46L11 10.08"/>',
  ),
  more: svg(
    '<rect x="2.25" y="2.25" width="4" height="4" rx="1"/>'
    + '<rect x="2.25" y="9.75" width="4" height="4" rx="1"/>'
    + '<rect x="9.75" y="9.75" width="4" height="4" rx="1"/>'
    + '<path d="M11.75 1.75v5M9.25 4.25h5"/>',
  ),
}

/** `url("…")` for a masked glyph, with the SVG encoded so quotes never escape. */
const maskUrl = (markup) => `url("data:image/svg+xml,${encodeURIComponent(markup)}")`

const GLYPH_RULES = Object.entries(GLYPHS)
  .map(([name, markup]) => `body[${BODY_ATTR}] [data-tbn-icon="${name}"] { --tbn-glyph: ${maskUrl(markup)}; }`)
  .join('\n')

const CSS = `
body[${BODY_ATTR}] [data-tbn-hidden] { display: none !important; }

/* The brand row is empty once its button moves up: collapse it, and clip it so
 * the host's own toggle inside cannot leak over the new-session button. */
body[${BODY_ATTR}] [class*="logoRow"] {
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

/* Reserve the icon row's band at the top of the sidebar; the height follows the
 * row, so extra plugin entries that wrap to a second line still get room. */
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-sidebar] {
  padding-top: var(--tbn-pad, 40px) !important;
}

body[${BODY_ATTR}]:not([data-tbn-compact]) button[data-tbn-home],
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] {
  position: fixed !important;
  top: var(--tbn-top, 8px) !important;
  margin: 0 !important;
  z-index: 31;
  -webkit-app-region: no-drag;
}

/* One chip geometry for the brand button: 28×28, the row's 8px radius, no
 * inherited padding/border, and the glyph painted by the shared mask below. */
body[${BODY_ATTR}]:not([data-tbn-compact]) button[data-tbn-home] {
  left: var(--tbn-left, 8px) !important;
  width: ${ICON}px;
  height: ${ICON}px;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666b70);
}
body[${BODY_ATTR}] button[data-tbn-home] > * { display: none !important; }
body[${BODY_ATTR}]:not([data-tbn-compact]) button[data-tbn-home]:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, rgba(17, 24, 39, 0.06));
}

/* The mask layer: every classified chip paints the same 16px grid, in the row's
 * own colour, so theme switches and the active state come for free. Both the
 * paint and the host-glyph hiding sit behind @supports: a browser without
 * masks keeps the original glyphs instead of showing solid squares. */
@supports ((-webkit-mask-image: url("#")) or (mask-image: url("#"))) {
  body[${BODY_ATTR}]:not([data-tbn-compact]) button[data-tbn-icon]::before {
    content: '';
    position: absolute;
    inset: ${(ICON - GLYPH) / 2}px;
    background-color: currentColor;
    -webkit-mask-image: var(--tbn-glyph);
    -webkit-mask-position: center;
    -webkit-mask-size: ${GLYPH}px ${GLYPH}px;
    -webkit-mask-repeat: no-repeat;
    mask-image: var(--tbn-glyph);
    mask-position: center;
    mask-size: ${GLYPH}px ${GLYPH}px;
    mask-repeat: no-repeat;
    pointer-events: none;
  }
  body[${BODY_ATTR}]:not([data-tbn-compact]) button[data-tbn-icon] > * { display: none !important; }
}
${GLYPH_RULES}

/* Panel entries: icon-only chips. Plugins that register a new sidebar entry land
 * in this same list, so they join the row automatically; when the row outgrows
 * the sidebar it wraps to a second line and the reserved band grows with it.
 * The host's 3px paint border and 32px row height are cancelled here so chips
 * are exactly 28×28 and share one baseline with the brand button. */
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] {
  left: calc(var(--tbn-left, 8px) + ${ROW_LEFT}px) !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-content: flex-start;
  align-items: flex-start;
  gap: ${GAP}px;
  width: max(0px, calc(var(--tbn-width, 280px) - ${INSET + ROW_LEFT + TRAIL}px)) !important;
  clip-path: var(--tbn-clip, none);
  padding: 0 !important;
  background: transparent;
}
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] > * {
  flex: 0 0 ${ICON}px;
  width: ${ICON}px !important;
  height: ${ICON}px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: var(--dsw-radius-sm, 8px);
  display: flex !important;
  align-items: center;
  justify-content: center;
}
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button {
  position: relative;
  width: ${ICON}px;
  height: ${ICON}px;
  min-height: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666b70);
  /* Text comes from the hover chip; keep stray text nodes from widening the
   * chip without hiding the icon (which may sit inside a wrapper). */
  font-size: 0;
  line-height: 0;
}
/* Entries we cannot classify keep their own glyph, normalized to the same box. */
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button:not([data-tbn-icon]) svg {
  width: ${GLYPH}px;
  height: ${GLYPH}px;
  display: block;
}
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button:not([data-tbn-icon]) img {
  max-width: ${GLYPH}px;
  max-height: ${GLYPH}px;
}

/* The pin/unpin affordances belong to the native vertical list. */
body[${BODY_ATTR}] [data-tbn-panels] [class*="panelUnpin"],
body[${BODY_ATTR}] [data-tbn-panels] button[aria-label*="取消固定"],
body[${BODY_ATTR}] [data-tbn-panels] button[aria-label*="固定到"],
body[${BODY_ATTR}] [data-tbn-panels] button[aria-label*="Unpin"],
body[${BODY_ATTR}] [data-tbn-panels] button[aria-label*="Pin to"] {
  display: none !important;
}

body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(17, 24, 39, 0.06));
}
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button[aria-current="page"] {
  color: var(--dsw-alias-label-primary, #1f2329);
}
/* The More launcher keeps the host's "menu is open" fill. */
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button[aria-expanded="true"] {
  background: var(--dsw-alias-interactive-bg-hover, rgba(17, 24, 39, 0.06));
}
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button:hover::after,
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] button:focus-visible::after {
  content: attr(aria-label);
  position: absolute;
  top: ${ICON + 6}px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 7px;
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-tooltip-bg, #1f2329);
  color: var(--dsw-alias-tooltip-label, #ffffff);
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 60;
}
/* A long label on the leftmost entry must not cross the window edge. */
body[${BODY_ATTR}]:not([data-tbn-compact]) [data-tbn-panels] > *:first-child button::after {
  left: 0;
  transform: none;
}
`

/**
 * Which glyph a panel entry gets, from its (localized) label. Entries that match
 * nothing keep their own icon and are only normalized to the shared box.
 */
const ICON_RULES = [
  ['plugins', /插件|plugin/i],
  ['folder', /项目|文件夹|project|folder/i],
  ['schedules', /自动化|定时|计划|任务|task|cron|schedul|automat/i],
  ['more', /更多|其他|more|other|apps|menu/i],
]

/** @param {string} label @returns {string | null} */
function classify(label) {
  for (const [icon, pattern] of ICON_RULES) {
    if (pattern.test(label)) return icon
  }
  return null
}

/** Walk up from a `display:contents` slot wrapper to the first box that can be positioned. */
function positionedAncestor(from) {
  let el = from
  while (el !== null && el !== document.body) {
    if (getComputedStyle(el).display !== 'contents') return el
    el = el.parentElement
  }
  return null
}

function ensureStyle() {
  const existing = document.getElementById(STYLE_ID)
  const style = existing ?? document.createElement('style')
  // Hot replacement may run the new module before the old effect disposed its
  // <style>; refresh the text instead of trusting an existing tag.
  if (style.textContent !== CSS) style.textContent = CSS
  if (existing === null) {
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
}

function tag(el, attribute) {
  if (el !== null && el !== undefined && !el.hasAttribute(attribute)) el.setAttribute(attribute, '')
}

function sidebarBox() {
  const slot = document.querySelector('[data-slot="sidebar"]')
  return slot === null ? null : positionedAncestor(slot)
}

/** The frame flags a collapsed sidebar directly, which flips before the width animates. */
function frameCollapsed() {
  const frame = document.querySelector('[data-slot="root"] > *')
  if (frame === null) return null
  return frame.hasAttribute('data-sidebar-collapsed')
}

/** Write a body variable only when it changes: streaming output mutates the body
 * every frame, and re-writing identical custom properties needlessly invalidates
 * style. */
function setVar(state, name, value) {
  if (state[name] === value) return
  state[name] = value
  if (value === null) document.body.style.removeProperty(name)
  else document.body.style.setProperty(name, value)
}

/** Mark each entry button with the glyph it should paint (or clear a stale mark). */
function markIcons(list) {
  if (list === null) return
  for (const button of list.querySelectorAll('button')) {
    const icon = classify(button.getAttribute('aria-label') ?? '')
    if (icon === null) {
      if (button.hasAttribute('data-tbn-icon')) button.removeAttribute('data-tbn-icon')
    } else if (button.getAttribute('data-tbn-icon') !== icon) {
      button.setAttribute('data-tbn-icon', icon)
    }
  }
}

function apply(state) {
  ensureStyle()
  if (!document.body.hasAttribute(BODY_ATTR)) document.body.setAttribute(BODY_ATTR, '')

  const sidebar = sidebarBox()
  if (sidebar === null) return
  tag(sidebar, 'data-tbn-sidebar')
  const box = sidebar.getBoundingClientRect()

  // Stand down only while the host reports a closed rail. Keying this on the
  // animated width made the row appear ~120ms late, once the track had already
  // grown past the threshold.
  const collapsed = frameCollapsed()
  if (collapsed === true || (collapsed === null && box.width < 120)) {
    document.body.setAttribute('data-tbn-compact', '')
    state.width = box.width
    return
  }
  document.body.removeAttribute('data-tbn-compact')

  const live = box.width
  // Row geometry follows the settled width so wrapping never reflows mid
  // animation, while the reveal follows the live width.
  if (state.settled === undefined || Math.abs(state.settled - live) <= 2) {
    state.settled = live
  } else {
    clearTimeout(state.settleTimer)
    state.settleTimer = setTimeout(() => { state.settled = undefined; apply(state) }, 260)
  }
  const settled = state.settled ?? live

  setVar(state, '--tbn-top', `${Math.round(box.top + 6)}px`)
  setVar(state, '--tbn-left', `${Math.round(box.left + INSET)}px`)
  setVar(state, '--tbn-width', `${Math.round(settled)}px`)

  // Reveal only the part of the row that fits in the sidebar right now: during
  // the expand animation the icons slide out with the track instead of popping.
  const rowWidth = Math.max(0, settled - (INSET + ROW_LEFT + TRAIL))
  const visible = Math.max(0, Math.min(rowWidth, live - (INSET + ROW_LEFT + TRAIL)))
  const hidden = Math.round(rowWidth - visible)
  setVar(state, '--tbn-clip', hidden > 0 ? `inset(0 ${hidden}px 0 0)` : null)

  const panels = document.querySelector('[data-slot="sidebar.panellist"]')
  const list = panels === null ? null : panels.closest('nav')
  tag(list, 'data-tbn-panels')
  markIcons(list)

  // Reserve as much room as the row actually needs — one line for the stock
  // entries, more once plugins add their own and the row wraps.
  if (list !== null) {
    const height = Math.ceil(list.getBoundingClientRect().height)
    const pad = Math.max(40, height + 12)
    setVar(state, '--tbn-pad', `${pad}px`)
  }

  const brandMark = document.querySelector('[data-slot="sidebar.brand.mark"]')
  tag(brandMark, 'data-tbn-hidden')
  tag(document.querySelector('[data-slot="sidebar.brand.name"]'), 'data-tbn-hidden')
  const home = brandMark === null ? null : brandMark.closest('button')
  tag(home, 'data-tbn-home')
  if (home !== null && home.getAttribute('data-tbn-icon') !== 'home') home.setAttribute('data-tbn-icon', 'home')
}

function install() {
  const state = {}
  apply(state)

  let queued = false
  const schedule = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      apply(state)
    })
  }

  const observer = new MutationObserver(schedule)
  // The collapse flag is an attribute flip, so it must be observed too: a
  // width-only signal arrived ~100ms late and read as lag.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-sidebar-collapsed'],
  })
  window.addEventListener('resize', schedule)

  // Collapsing the sidebar changes width without a DOM mutation.
  const sizeObserver = new ResizeObserver(schedule)
  const watchSidebar = () => {
    const box = sidebarBox()
    if (box !== null) sizeObserver.observe(box)
  }
  watchSidebar()
  const watchTimers = [500, 2000, 5000].map(ms => setTimeout(watchSidebar, ms))

  // The shell mounts late; re-check a few times at start-up.
  const timers = [300, 1200, 3000, 6000].map(ms => setTimeout(schedule, ms))

  return () => {
    observer.disconnect()
    sizeObserver.disconnect()
    window.removeEventListener('resize', schedule)
    for (const timer of [...timers, ...watchTimers]) clearTimeout(timer)
    document.getElementById(STYLE_ID)?.remove()
    document.body.removeAttribute(BODY_ATTR)
    document.body.removeAttribute('data-tbn-compact')
    for (const property of ['--tbn-top', '--tbn-left', '--tbn-width', '--tbn-pad', '--tbn-clip']) document.body.style.removeProperty(property)
    for (const attribute of ['data-tbn-panels', 'data-tbn-sidebar', 'data-tbn-hidden', 'data-tbn-home', 'data-tbn-icon']) {
      for (const el of document.querySelectorAll(`[${attribute}]`)) el.removeAttribute(attribute)
    }
  }
}

window.__ModuleLoader__.load({
  id: '@todrink/dsh-better-topbar',
  factory() {
    return {
      inject: [],
      apply(ctx) {
        ctx.effect(() => install(), 'topbar-nav: sidebar icon row')
      },
    }
  },
})
