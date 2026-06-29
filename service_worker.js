// VocaSpot - Vocabulary spotter for English learners
// Copyright (C) 2026 Grapes Labs by Viet Hoa Nguyen
// Licensed under GPL v3 — see LICENSE for details

const definitionCache = new Map();
const FETCH_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1000;

function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function fetchDefinitionData(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

  let res = await fetchWithTimeout(url);
  if (!res.ok) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('not_found');
  }

  const data = await res.json();
  const entry = data[0];

  const definitions = [];
  const synonyms = [];
  const antonyms = []; // New data track for antonyms

  // Parse and extract all diverse definitions and associated thesaurus tracking tags natively without any length caps
  for (const meaning of entry.meanings ?? []) {
    // Attempt to isolate partOfSpeech-specific phonetics if provided by the API architecture
    // Fall back to general entry-level phonetic mapping arrays if specialized ones are missing
    const posPhonetic = entry.phonetics?.find(p => p.text && p.audio?.includes(`-${meaning.partOfSpeech}`))?.text
      ?? entry.phonetic
      ?? entry.phonetics?.find(p => p.text)?.text
      ?? '';

    const posAudio = entry.phonetics?.find(p => p.audio && p.audio.includes(`-${meaning.partOfSpeech}`))?.audio
      ?? entry.phonetics?.find(p => p.audio)?.audio
      ?? '';

    for (const def of meaning.definitions ?? []) {
      // Uncapped extraction layer: Push everything directly into the payload array safely
      definitions.push({
        partOfSpeech: meaning.partOfSpeech,
        definition: def.definition,
        example: def.example ?? null,
        phonetic: posPhonetic, // Audio/Phonetics now encapsulated downstream at the granular definition tier
        audio: posAudio
      });
    }

    // Uncapped thesaurus data gathering: Pull all synonyms and antonyms under this part of speech safely without deduplication overlaps
    for (const syn of meaning.synonyms ?? []) {
      if (!synonyms.includes(syn)) synonyms.push(syn);
    }
    for (const ant of meaning.antonyms ?? []) {
      if (!antonyms.includes(ant)) antonyms.push(ant);
    }
  }

  return { word: entry.word, definitions, synonyms, antonyms };
}

/**
 * Double-layered storage fallback lookup (Memory Map -> chrome.storage.local -> Network Fetch)
 * @param {string} targetWord 
 * @returns {Promise<object>}
 */
async function getDefinitionWithStorageFallback(targetWord) {
  // Layer 1: Check volatile Service Worker runtime memory map
  if (definitionCache.has(targetWord)) {
    return definitionCache.get(targetWord);
  }

  // Layer 2: Query non-volatile persistent LevelDB storage (survives MV3 worker dormancy)
  const localStorageObj = await chrome.storage.local.get([targetWord]);
  if (localStorageObj && localStorageObj[targetWord]) {
    const cachedResult = localStorageObj[targetWord];
    // Sync back up into rapid memory map cache for sequential localized hover lookup cycles
    definitionCache.set(targetWord, cachedResult);
    return cachedResult;
  }

  // Layer 3: Execute network query fallback chain when local disks are completely blank
  const networkResult = await fetchDefinitionData(targetWord);
  
  // Concurrently dump into memory and write straight down onto the physical storage tracks
  definitionCache.set(targetWord, networkResult);
  await chrome.storage.local.set({ [targetWord]: networkResult });
  
  return networkResult;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Global cache purging pipeline triggered via administrative console commands
  // chrome.runtime.sendMessage({ action: 'clearAllCache' }, res => console.log('Cache status:', res));
  // chrome.storage.local.clear(() => console.log('LevelDB Clear!'));
  if (message && message.action === 'clearAllCache') {
    definitionCache.clear();
    chrome.storage.local.clear(() => {
      console.log('[VocaSpot] Double-layered cache system successfully purged (Memory Map + LevelDB).');
      sendResponse({ success: true });
    });
    return true; // Keep communication port open during asynchronous local disk clearing operations
  }

  if (message.action !== 'fetchDefinition') return false;

  // Support both { payload: { word } } (CEFR click) and { word, lemma } (manual lookup)
  const word = message.payload?.word ?? message.word;
  const lemma = message.payload?.lemma ?? message.lemma;

  if (!word) {
    sendResponse({ error: true, word: '' });
    return false;
  }

  // Route querying through the optimized persistent fallback router pipeline
  getDefinitionWithStorageFallback(word)
    .then(result => {
      sendResponse(result);
    })
    .catch(() => {
      // Execute alternative lemma query fallback logic sequence if primary text token fails
      if (lemma && lemma !== word) {
        getDefinitionWithStorageFallback(lemma)
          .then(result => {
            sendResponse(result);
          })
          .catch(() => {
            sendResponse({ error: true, word });
          });
      } else {
        sendResponse({ error: true, word });
      }
    });

  return true; // Keep message channel port open asynchronously for the promises to finish routing
});
