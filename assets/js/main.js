const root = document.documentElement;
root.classList.add('js');

const THEME_MODES = ['light', 'dark'];
const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
};

const getThemeConfig = () => {
  const config = window.__zachariteTheme || {};
  const defaultMode =
    config.defaultMode === 'dark' || config.defaultMode === 'light'
      ? config.defaultMode
      : getPreferredColorScheme();
  const storageKey =
    typeof config.storageKey === 'string' && config.storageKey.trim()
      ? config.storageKey.trim()
      : 'zacharite-theme';

  return { defaultMode, storageKey };
};

const getPreferredColorScheme = () => {
  if (!window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredThemeMode = (storageKey) => {
  try {
    const savedMode = localStorage.getItem(storageKey);
    return THEME_MODES.includes(savedMode) ? savedMode : null;
  } catch (error) {
    return null;
  }
};

const persistThemeMode = (storageKey, mode) => {
  try {
    localStorage.setItem(storageKey, mode);
  } catch (error) {
    // Ignore storage write failures.
  }
};

const initThemeToggle = () => {
  const config = getThemeConfig();
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const themeLabel = themeToggle ? themeToggle.querySelector('[data-theme-label]') : null;
  const themeIcons = themeToggle ? Array.from(themeToggle.querySelectorAll('[data-theme-icon]')) : [];
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const initialModeFromRoot = root.dataset.themeMode === 'auto' ? null : root.dataset.themeMode;
  let clearThemeAnimationTimer = null;

  const setTheme = (mode, shouldPersist = false, shouldAnimate = false) => {
    const normalizedMode = THEME_MODES.includes(mode) ? mode : config.defaultMode;
    const effectiveTheme = normalizedMode;
    const currentMode = root.dataset.theme === 'dark' ? 'dark' : 'light';

    if (themeToggle) {
      if (clearThemeAnimationTimer) {
        clearTimeout(clearThemeAnimationTimer);
        clearThemeAnimationTimer = null;
      }
      if (shouldAnimate && currentMode !== normalizedMode) {
        themeToggle.dataset.themeAnimating = 'true';
        clearThemeAnimationTimer = window.setTimeout(() => {
          delete themeToggle.dataset.themeAnimating;
          clearThemeAnimationTimer = null;
        }, 220);
      } else {
        delete themeToggle.dataset.themeAnimating;
      }
    }

    root.dataset.themeMode = normalizedMode;
    root.dataset.theme = effectiveTheme;

    if (themeToggle) {
      const label = THEME_LABELS[normalizedMode];
      const nextMode = normalizedMode === 'dark' ? 'light' : 'dark';
      const nextLabel = THEME_LABELS[nextMode];

      themeToggle.setAttribute('aria-label', `Theme ${label}. Activate to switch to ${nextLabel}.`);
      themeToggle.setAttribute('aria-pressed', normalizedMode === 'dark' ? 'true' : 'false');
      themeToggle.dataset.themeMode = normalizedMode;
      if (themeLabel) {
        themeLabel.textContent = `Theme: ${label}`;
      }
      themeIcons.forEach((icon) => {
        icon.hidden = icon.dataset.themeIcon !== normalizedMode;
      });
    }

    if (shouldPersist) {
      persistThemeMode(config.storageKey, normalizedMode);
    }
  };

  const initialMode =
    getStoredThemeMode(config.storageKey) ||
    (THEME_MODES.includes(initialModeFromRoot) ? initialModeFromRoot : config.defaultMode);
  setTheme(initialMode);
  if (themeToggle) {
    themeToggle.dataset.themeReady = 'true';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentMode = root.dataset.theme === 'dark' ? 'dark' : 'light';
      const nextMode = currentMode === 'dark' ? 'light' : 'dark';
      setTheme(nextMode, true, true);
    });
  }

  if (mediaQuery) {
    const syncAutoMode = () => {
      if (root.dataset.themeMode === 'auto') {
        setTheme(getPreferredColorScheme());
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncAutoMode);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(syncAutoMode);
    }
  }
};

initThemeToggle();

const searchInput = document.querySelector('[data-search-input]');

if (searchInput) {
  const searchItems = Array.from(document.querySelectorAll('[data-search-item]'));
  const searchCount = document.querySelector('[data-search-count]');
  const searchEmpty = document.querySelector('[data-search-empty]');

  const normalize = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const highlightText = (value, terms) => {
    if (!terms.length) return escapeHtml(value);
    const pattern = terms.map(escapeRegExp).join('|');
    if (!pattern) return escapeHtml(value);

    return value
      .split(new RegExp(`(${pattern})`, 'ig'))
      .map((part, index) =>
        index % 2 === 1
          ? `<strong class="search-highlight">${escapeHtml(part)}</strong>`
          : escapeHtml(part)
      )
      .join('');
  };

  searchItems.forEach((item) => {
    const targets = item.querySelectorAll('[data-highlight-target]');
    targets.forEach((target) => {
      target.dataset.originalText = target.textContent || '';
    });
  });

  const updateSearchResults = () => {
    const query = normalize(searchInput.value);
    const terms = query ? query.split(' ') : [];
    let visibleCount = 0;

    searchItems.forEach((item) => {
      const text = item.dataset.searchText || '';
      const isMatch = query && terms.every((term) => text.includes(term));
      item.hidden = !isMatch;
      if (isMatch) visibleCount += 1;

      const targets = item.querySelectorAll('[data-highlight-target]');
      targets.forEach((target) => {
        const originalText = target.dataset.originalText || '';
        target.innerHTML = isMatch ? highlightText(originalText, terms) : escapeHtml(originalText);
      });
    });

    if (searchCount) {
      searchCount.textContent = query
        ? `${visibleCount} result${visibleCount === 1 ? '' : 's'}`
        : 'Type to search posts.';
    }

    if (searchEmpty) {
      searchEmpty.hidden = !query || visibleCount !== 0;
    }
  };

  searchInput.addEventListener('input', updateSearchResults);
  updateSearchResults();
}
