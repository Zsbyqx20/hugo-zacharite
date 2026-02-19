const root = document.documentElement;
root.classList.add('js');

const THEME_MODES = ['light', 'dark', 'auto'];
const THEME_LABELS = {
  light: 'Sun',
  dark: 'Moon',
  auto: 'Auto',
};
const THEME_CYCLE_ORDER = ['auto', 'light', 'dark'];
const THEME_TRANSITION_DURATION_MS = 520;

const getThemeConfig = () => {
  const config = window.__zachariteTheme || {};
  const defaultMode =
    config.defaultMode === 'dark' || config.defaultMode === 'light' || config.defaultMode === 'auto'
      ? config.defaultMode
      : 'auto';
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

const getEffectiveThemeForMode = (mode) => (mode === 'auto' ? getPreferredColorScheme() : mode);

const initThemeToggle = () => {
  const config = getThemeConfig();
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const themeLabel = themeToggle ? themeToggle.querySelector('[data-theme-label]') : null;
  const themeShortLabel = themeToggle ? themeToggle.querySelector('[data-theme-short-label]') : null;
  const themeIcons = themeToggle ? Array.from(themeToggle.querySelectorAll('[data-theme-icon]')) : [];
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const initialModeFromRoot = root.dataset.themeMode === 'auto' ? null : root.dataset.themeMode;
  let clearThemeAnimationTimer = null;

  const setTheme = (mode, shouldPersist = false, shouldAnimate = false) => {
    const normalizedMode = THEME_MODES.includes(mode) ? mode : config.defaultMode;
    const effectiveTheme = getEffectiveThemeForMode(normalizedMode);
    const currentMode = root.dataset.theme === 'dark' ? 'dark' : 'light';

    if (themeToggle) {
      if (clearThemeAnimationTimer) {
        clearTimeout(clearThemeAnimationTimer);
        clearThemeAnimationTimer = null;
      }
      if (shouldAnimate && currentMode !== effectiveTheme) {
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
      const currentModeIndex = THEME_CYCLE_ORDER.indexOf(normalizedMode);
      const nextMode = THEME_CYCLE_ORDER[(currentModeIndex + 1) % THEME_CYCLE_ORDER.length];
      const nextLabel = THEME_LABELS[nextMode];

      themeToggle.setAttribute('aria-label', `Theme ${label}. Activate to switch to ${nextLabel}.`);
      themeToggle.removeAttribute('aria-pressed');
      themeToggle.dataset.themeMode = normalizedMode;
      themeToggle.dataset.themePreference = normalizedMode;
      if (themeLabel) {
        themeLabel.textContent = `Theme: ${label}`;
      }
      if (themeShortLabel) {
        themeShortLabel.textContent = label;
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
    const runThemeTransition = (nextMode) => {
      const prefersReducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
      const canAnimateThemeTransition =
        typeof document.startViewTransition === 'function' && !prefersReducedMotion;
      const nextEffectiveMode = getEffectiveThemeForMode(nextMode);
      const currentEffectiveMode = root.dataset.theme === 'dark' ? 'dark' : 'light';

      if (!canAnimateThemeTransition || currentEffectiveMode === nextEffectiveMode) {
        setTheme(nextMode, true, true);
        return;
      }

      const toggleBounds = themeToggle.getBoundingClientRect();
      const originX = toggleBounds.left + toggleBounds.width / 2;
      const originY = toggleBounds.top + toggleBounds.height / 2;
      const maxX = Math.max(originX, window.innerWidth - originX);
      const maxY = Math.max(originY, window.innerHeight - originY);
      const endRadius = Math.hypot(maxX, maxY);

      const transition = document.startViewTransition(() => {
        setTheme(nextMode, true, true);
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${originX}px ${originY}px)`,
                `circle(${endRadius}px at ${originX}px ${originY}px)`,
              ],
            },
            {
              duration: THEME_TRANSITION_DURATION_MS,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => {
          // Ignore transition setup errors and keep the updated theme.
        });
    };

    themeToggle.addEventListener('click', () => {
      const currentMode = THEME_MODES.includes(root.dataset.themeMode) ? root.dataset.themeMode : config.defaultMode;
      const currentModeIndex = THEME_CYCLE_ORDER.indexOf(currentMode);
      const nextMode = THEME_CYCLE_ORDER[(currentModeIndex + 1) % THEME_CYCLE_ORDER.length];
      runThemeTransition(nextMode);
    });
  }

  if (mediaQuery) {
    const syncAutoMode = () => {
      if (root.dataset.themeMode === 'auto') {
        setTheme('auto');
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

const initBackToTop = () => {
  const backToTop = document.querySelector('[data-back-to-top]');
  if (!backToTop) return;

  const visibilityOffset = 400;
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const syncVisibility = () => {
    if (window.scrollY > visibilityOffset) {
      backToTop.classList.add('is-visible');
    } else {
      backToTop.classList.remove('is-visible');
    }
  };

  backToTop.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  });

  window.addEventListener('scroll', syncVisibility, { passive: true });
  syncVisibility();
};

initBackToTop();

const searchInput = document.querySelector('[data-search-input]');

if (searchInput) {
  const searchPanel = searchInput.closest('[data-search-enabled]');
  const searchEnabled = !searchPanel || searchPanel.dataset.searchEnabled !== 'false';
  const searchIndexPath =
    (searchPanel && typeof searchPanel.dataset.searchIndexPath === 'string' && searchPanel.dataset.searchIndexPath) ||
    '/search-index.json';
  const debounceMsRaw = searchPanel ? searchPanel.dataset.searchDebounceMs : '';
  const minQueryLengthRaw = searchPanel ? searchPanel.dataset.searchMinQueryLength : '';
  const maxResultsRaw = searchPanel ? searchPanel.dataset.searchMaxResults : '';
  const debounceMs = Number.isInteger(Number.parseInt(debounceMsRaw, 10))
    ? Math.max(0, Number.parseInt(debounceMsRaw, 10))
    : 80;
  const minQueryLength = Number.isInteger(Number.parseInt(minQueryLengthRaw, 10))
    ? Math.max(0, Number.parseInt(minQueryLengthRaw, 10))
    : 1;
  const maxResults = Number.isInteger(Number.parseInt(maxResultsRaw, 10))
    ? Math.max(1, Number.parseInt(maxResultsRaw, 10))
    : 50;
  const searchResults = document.querySelector('[data-search-results]');
  const searchCount = document.querySelector('[data-search-count]');
  const searchEmpty = document.querySelector('[data-search-empty]');
  const searchLoading = document.querySelector('[data-search-loading]');
  const searchError = document.querySelector('[data-search-error]');
  const weightedFields = [
    { key: 'searchTitle', weight: 6 },
    { key: 'searchTags', weight: 4 },
    { key: 'searchSummary', weight: 2 },
  ];
  let cachedIndex = null;
  let loadIndexPromise = null;
  let latestSearchRunId = 0;
  let hasLoadFailure = false;

  const normalize = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');
  const tokenize = (query) => (query ? query.split(' ').filter(Boolean) : []);
  const debounce = (fn, waitMs) => {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        fn(...args);
      }, waitMs);
    };
  };
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

  const clearResults = () => {
    if (searchResults) {
      searchResults.textContent = '';
    }
  };

  const setCountMessage = (message) => {
    if (searchCount) {
      searchCount.textContent = message;
    }
  };

  const setLoadState = ({ loading = false, error = false }) => {
    if (searchLoading) {
      searchLoading.hidden = !loading;
    }
    if (searchError) {
      searchError.hidden = !error;
    }
  };

  const renderResults = (entries, terms) => {
    if (!searchResults) return;
    searchResults.textContent = '';
    const fragment = document.createDocumentFragment();

    entries.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'search-result';

      const title = document.createElement('a');
      title.href = entry.permalink;
      title.innerHTML = highlightText(entry.title || '', terms);
      item.appendChild(title);

      const date = document.createElement('span');
      date.className = 'muted';
      date.textContent = entry.dateDisplay || '';
      item.appendChild(date);

      if (entry.summary) {
        const summary = document.createElement('p');
        summary.innerHTML = highlightText(entry.summary, terms);
        item.appendChild(summary);
      }

      if (Array.isArray(entry.tags) && entry.tags.length) {
        const tagContainer = document.createElement('div');
        tagContainer.className = 'tags';
        tagContainer.setAttribute('aria-label', 'Tags');

        entry.tags.forEach((tag) => {
          const tagName = tag && typeof tag.name === 'string' ? tag.name : '';
          const tagPermalink = tag && typeof tag.permalink === 'string' ? tag.permalink : '';
          if (!tagName || !tagPermalink) return;

          const tagLink = document.createElement('a');
          tagLink.href = tagPermalink;
          tagLink.innerHTML = highlightText(`#${tagName}`, terms);
          tagContainer.appendChild(tagLink);
        });

        if (tagContainer.childElementCount > 0) {
          item.appendChild(tagContainer);
        }
      }

      fragment.appendChild(item);
    });

    searchResults.appendChild(fragment);
  };

  const loadSearchIndex = async () => {
    if (cachedIndex) return cachedIndex;
    if (loadIndexPromise) return loadIndexPromise;

    setLoadState({ loading: true, error: false });

    loadIndexPromise = fetch(searchIndexPath, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch search index: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (!Array.isArray(payload)) {
          return [];
        }

        cachedIndex = payload.map((entry) => ({
          ...entry,
          searchTitle: normalize(typeof entry.searchTitle === 'string' ? entry.searchTitle : entry.title || ''),
          searchTags: normalize(typeof entry.searchTags === 'string' ? entry.searchTags : ''),
          searchSummary: normalize(typeof entry.searchSummary === 'string' ? entry.searchSummary : entry.summary || ''),
          dateUnix: Number.isFinite(Number(entry.dateUnix)) ? Number(entry.dateUnix) : 0,
        }));

        hasLoadFailure = false;
        return cachedIndex;
      })
      .catch(() => {
        cachedIndex = [];
        hasLoadFailure = true;
        return cachedIndex;
      })
      .finally(() => {
        setLoadState({ loading: false, error: hasLoadFailure });
      });

    return loadIndexPromise;
  };

  const scoreEntry = (entry, terms) => {
    let totalScore = 0;

    for (const term of terms) {
      let termMatched = false;

      for (const field of weightedFields) {
        const fieldText = entry[field.key] || '';
        if (!fieldText.includes(term)) continue;

        termMatched = true;
        totalScore += field.weight;
        if (fieldText.startsWith(term)) {
          totalScore += 1;
        }
      }

      if (!termMatched) {
        return null;
      }
    }

    return totalScore;
  };

  const runSearch = async () => {
    const runId = ++latestSearchRunId;
    const query = normalize(searchInput.value);
    const terms = tokenize(query);

    if (!searchEnabled) {
      clearResults();
      if (searchEmpty) {
        searchEmpty.hidden = true;
      }
      setLoadState({ loading: false, error: true });
      setCountMessage('Search is disabled.');
      return;
    }

    if (query.length < minQueryLength) {
      clearResults();
      if (searchEmpty) {
        searchEmpty.hidden = true;
      }
      setLoadState({ loading: false, error: false });
      setCountMessage(
        minQueryLength > 1
          ? `Type at least ${minQueryLength} characters to search posts.`
          : 'Type to search posts.'
      );
      return;
    }

    const entries = await loadSearchIndex();
    if (runId !== latestSearchRunId) return;

    const matches = [];
    entries.forEach((entry) => {
      const score = scoreEntry(entry, terms);
      if (score === null) return;
      matches.push({ entry, score });
    });

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.entry.dateUnix || 0) - (a.entry.dateUnix || 0);
    });

    const limitedMatches = matches.slice(0, maxResults).map((match) => match.entry);
    renderResults(limitedMatches, terms);

    if (searchCount) {
      const totalCount = matches.length;
      const suffix = totalCount === 1 ? '' : 's';
      const limitSuffix =
        totalCount > limitedMatches.length ? ` (showing first ${limitedMatches.length})` : '';
      setCountMessage(`${totalCount} result${suffix}${limitSuffix}`);
    }

    if (searchEmpty) {
      searchEmpty.hidden = matches.length !== 0;
    }
  };

  if (!searchEnabled) {
    searchInput.disabled = true;
    setCountMessage('Search is disabled.');
    if (searchEmpty) {
      searchEmpty.hidden = true;
    }
    setLoadState({ loading: false, error: true });
  } else {
    const runSearchDebounced = debounce(runSearch, debounceMs);
    searchInput.addEventListener('input', runSearchDebounced);
    runSearch();
  }
}
