const PUNCTUATION_CLASS = Object.freeze({
  opening: 'opening',
  closing: 'closing',
  middle: 'middle',
  space: 'space',
});

const ZH_CN_HORIZONTAL_PROFILE = Object.freeze({
  opening: new Set(
    Array.from(
      '\u2018\u201c\u3008\u300a\u300c\u300e\u3010\u3014\u3016\u3018\u301a\u301d\uff08\uff3b\uff5b\uff5f'
    )
  ),
  closing: new Set(
    Array.from(
      '\u2019\u201d\u3001\u3002\u3009\u300b\u300d\u300f\u3011\u3015\u3017\u3019\u301b\u301e\u301f\uff01\uff09\uff0c\uff0e\uff1a\uff1b\uff1f\uff3d\uff5d\uff60'
    )
  ),
  middle: new Set(Array.from('\u00b7\u2027\u30fb')),
  space: new Set(['\u3000']),
  supplemental: new Set(Array.from('\uff01\uff1f')),
  closingBrackets: new Set(
    Array.from(
      '\u2019\u201d\u3009\u300b\u300d\u300f\u3011\u3015\u3017\u3019\u301b\u301e\u301f\uff09\uff3d\uff5d\uff60'
    )
  ),
});

const PRECEDES_TRIMMED_OPENING = new Set([
  PUNCTUATION_CLASS.opening,
  PUNCTUATION_CLASS.closing,
  PUNCTUATION_CLASS.middle,
  PUNCTUATION_CLASS.space,
]);
const FOLLOWS_TRIMMED_CLOSING = new Set([
  PUNCTUATION_CLASS.closing,
  PUNCTUATION_CLASS.middle,
  PUNCTUATION_CLASS.space,
]);

export const resolveCjkPunctuationProfile = (languageTag, writingMode = 'horizontal-tb') => {
  const language = String(languageTag || '').toLowerCase();
  const mode = String(writingMode || '').toLowerCase();

  if (!language.startsWith('zh') || !mode.startsWith('horizontal')) return null;
  if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/u.test(language)) return null;

  return ZH_CN_HORIZONTAL_PROFILE;
};

const classifyPunctuation = (character, profile) => {
  if (!character || !profile) return null;
  if (profile.opening.has(character)) return PUNCTUATION_CLASS.opening;
  if (profile.closing.has(character)) return PUNCTUATION_CLASS.closing;
  if (profile.middle.has(character)) return PUNCTUATION_CLASS.middle;
  if (profile.space.has(character)) return PUNCTUATION_CLASS.space;
  return null;
};

export const getSupplementalTrimIndexes = (characters, profile) => {
  if (!profile) return [];

  const indexes = new Set();

  for (let index = 0; index < characters.length - 1; index += 1) {
    const left = characters[index];
    const right = characters[index + 1];
    if (!left || !right) continue;
    const needsSupplementalTrimming =
      profile.supplemental.has(left) ||
      profile.supplemental.has(right) ||
      profile.closingBrackets.has(left);
    if (!needsSupplementalTrimming) continue;

    const leftClass = classifyPunctuation(left, profile);
    const rightClass = classifyPunctuation(right, profile);

    // For the site's equal-size inline text, these are the CSS Text adjacent-pair
    // rules. Browser layout remains responsible for size-sensitive and line-edge cases.
    if (
      rightClass === PUNCTUATION_CLASS.opening &&
      PRECEDES_TRIMMED_OPENING.has(leftClass)
    ) {
      indexes.add(index + 1);
    } else if (
      leftClass === PUNCTUATION_CLASS.closing &&
      FOLLOWS_TRIMMED_CLOSING.has(rightClass)
    ) {
      indexes.add(index);
    }
  }

  return Array.from(indexes).sort((left, right) => left - right);
};
