document.documentElement.classList.add('js');

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
