/**
 * Helper utilities for dictionary response normalization, URL validation, and array deduplication.
 */

export const normalizeWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return word.trim().toLowerCase();
};

export const isValidUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const normalizeAudioUrl = (audioUrl) => {
  if (!audioUrl || typeof audioUrl !== 'string') return null;
  let trimmed = audioUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  return isValidUrl(trimmed) ? trimmed : null;
};

export const deduplicateArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];

  for (const item of arr) {
    if (item && typeof item === 'string') {
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    }
  }

  return result;
};

export const extractPhonetic = (entries) => {
  if (!Array.isArray(entries)) return null;

  // 1. Direct phonetic property on entry
  for (const entry of entries) {
    if (entry.phonetic && typeof entry.phonetic === 'string' && entry.phonetic.trim()) {
      return entry.phonetic.trim();
    }
  }

  // 2. Search phonetics array
  for (const entry of entries) {
    if (Array.isArray(entry.phonetics)) {
      for (const ph of entry.phonetics) {
        if (ph && ph.text && typeof ph.text === 'string' && ph.text.trim()) {
          return ph.text.trim();
        }
      }
    }
  }

  return null;
};

export const extractAudioUrl = (entries) => {
  if (!Array.isArray(entries)) return null;

  for (const entry of entries) {
    if (Array.isArray(entry.phonetics)) {
      for (const ph of entry.phonetics) {
        if (ph && ph.audio) {
          const normalized = normalizeAudioUrl(ph.audio);
          if (normalized) return normalized;
        }
      }
    }
  }

  return null;
};

export const extractOrigin = (entries) => {
  if (!Array.isArray(entries)) return null;

  for (const entry of entries) {
    if (entry.origin && typeof entry.origin === 'string' && entry.origin.trim()) {
      return entry.origin.trim();
    }
    if (entry.etymology && typeof entry.etymology === 'string' && entry.etymology.trim()) {
      return entry.etymology.trim();
    }
  }

  return null;
};

export const normalizeApiResponse = (data, searchedWord) => {
  const entries = Array.isArray(data) ? data : [data];
  const mainWord = entries[0]?.word || searchedWord;
  const phonetic = extractPhonetic(entries);
  const audioUrl = extractAudioUrl(entries);
  const origin = extractOrigin(entries);

  const meaningsMap = new Map();
  const allSourceUrls = [];

  for (const entry of entries) {
    if (Array.isArray(entry.sourceUrls)) {
      allSourceUrls.push(...entry.sourceUrls);
    }

    if (Array.isArray(entry.meanings)) {
      for (const m of entry.meanings) {
        const partOfSpeech = (m.partOfSpeech || 'general').toLowerCase().trim();

        if (!meaningsMap.has(partOfSpeech)) {
          meaningsMap.set(partOfSpeech, {
            partOfSpeech,
            definitions: [],
            synonyms: [],
            antonyms: []
          });
        }

        const currentMeaning = meaningsMap.get(partOfSpeech);

        // Add synonyms & antonyms at meaning level
        if (Array.isArray(m.synonyms)) {
          currentMeaning.synonyms.push(...m.synonyms);
        }
        if (Array.isArray(m.antonyms)) {
          currentMeaning.antonyms.push(...m.antonyms);
        }

        // Add definitions
        if (Array.isArray(m.definitions)) {
          for (const d of m.definitions) {
            if (d && d.definition) {
              const defSynonyms = Array.isArray(d.synonyms) ? d.synonyms : [];
              const defAntonyms = Array.isArray(d.antonyms) ? d.antonyms : [];

              currentMeaning.definitions.push({
                definition: d.definition,
                example: d.example || null,
                synonyms: deduplicateArray(defSynonyms),
                antonyms: deduplicateArray(defAntonyms)
              });

              // Also append to meaning level
              currentMeaning.synonyms.push(...defSynonyms);
              currentMeaning.antonyms.push(...defAntonyms);
            }
          }
        }
      }
    }
  }

  // Format meanings list and deduplicate synonyms/antonyms
  const normalizedMeanings = Array.from(meaningsMap.values()).map(m => ({
    partOfSpeech: m.partOfSpeech,
    definitions: m.definitions,
    synonyms: deduplicateArray(m.synonyms),
    antonyms: deduplicateArray(m.antonyms)
  }));

  const validSourceUrls = deduplicateArray(allSourceUrls).filter(isValidUrl);

  return {
    word: mainWord,
    phonetic,
    audioUrl,
    origin,
    meanings: normalizedMeanings,
    sourceUrls: validSourceUrls
  };
};
