/* ════════════════════════════════════════════════════════════════════════════
   theme.js — Conmutador de tema claro/oscuro
   Mismo patrón que i18n.js. El tema se aplica vía atributo data-theme en <html>.
   API:
     Theme.get()          → 'dark' | 'light'
     Theme.set(theme)     → fija tema, persiste, dispara 'theme:change'
     Theme.toggle()       → alterna dark <-> light
   Persistencia: localStorage 'goscm.theme' (default 'dark').
   El parpadeo inicial se evita con un script inline en <head> que setea
   data-theme antes del primer paint.
   ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'goscm.theme';
  const DEFAULT_THEME = 'dark';
  const SUPPORTED = ['dark', 'light'];

  let currentTheme = DEFAULT_THEME;

  function detectInitialTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (_) { /* localStorage bloqueado */ }
    return DEFAULT_THEME;
  }

  function persist(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function titleFor(theme) {
    // El título describe la acción: cambiar al tema contrario.
    const key = theme === 'light' ? 'theme.toDark' : 'theme.toLight';
    const fallback = theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
    if (global.I18n && typeof global.I18n.t === 'function' && global.I18n.has && global.I18n.has(key)) {
      return global.I18n.t(key);
    }
    return fallback;
  }

  function refreshToggleUi() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isLight = currentTheme === 'light';
    btn.setAttribute('aria-checked', String(isLight));
    btn.setAttribute('title', titleFor(currentTheme));
    const icon = btn.querySelector('.theme-toggle-icon');
    if (icon) icon.textContent = isLight ? '☀' : '🌙'; // ☀ / 🌙
  }

  function setTheme(theme) {
    if (!SUPPORTED.includes(theme)) return;
    currentTheme = theme;
    applyTheme(theme);
    persist(theme);
    refreshToggleUi();
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }));
  }

  function toggle() {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function getTheme() { return currentTheme; }

  function wireToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', toggle);
    refreshToggleUi();
  }

  function init() {
    // data-theme ya fue seteado por el script inline del <head>; re-sincronizamos.
    currentTheme = detectInitialTheme();
    applyTheme(currentTheme);
    wireToggle();
  }

  // Mantener el tooltip sincronizado cuando cambia el idioma.
  document.addEventListener('i18n:change', refreshToggleUi);
  document.addEventListener('i18n:ready', refreshToggleUi);

  // Auto-init en DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.Theme = { get: getTheme, set: setTheme, toggle };
})(window);
