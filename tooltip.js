// ─── CONFIGURATION ──────────────────────────────────────────────────────────
// 0: Disable auto-play completely
// 1: Auto-play real audio when available; fallback to Web Speech API when unavailable
const AUTO_PLAY_MODE = 1;

// ─── PART 1 — Tooltip element ────────────────────────────────────────────────

function createTooltip() {
  if (document.getElementById('vs-tooltip')) return;
  const el = document.createElement('div');
  el.id = 'vs-tooltip';
  el.innerHTML =
    '<div class="vs-source-label"></div>' +
    '<div class="vs-context"></div>' +
    '<div class="vs-word-header">' +
      '<span class="vs-word"></span>' +
      '<span class="vs-level"></span>' +
      '<span class="vs-phonetic"></span>' +
      /* Split into two dedicated button elements for distinct audio paths */
      '<button class="vs-audio-real" aria-label="Play real pronunciation"></button>' +
      '<button class="vs-audio-sys" aria-label="Play system TTS">&#128226;</button>' +
    '</div>' +
    '<div class="vs-definition"></div>' +
    '<div class="vs-example"></div>' +
    '<div class="vs-synonyms"></div>' +
    '<div class="vs-links"></div>' +
    '<button class="vs-full-def">Full definition &#x2192;</button>';
  document.body.appendChild(el);
}

// ─── PART 2 — Styles ─────────────────────────────────────────────────────────

function injectTooltipStyles() {
  if (document.getElementById('vs-tooltip-styles')) return;
  const style = document.createElement('style');
  style.id = 'vs-tooltip-styles';

  style.textContent = `
    #vs-tooltip {
      position: fixed;
      z-index: 999999;
      max-width: 320px;
      padding: 12px;
      font-family: system-ui, sans-serif;
      line-height: 1.5;
      border-radius: 0px;
      border: 3px solid #0D9488;
      display: none;

      /* Centralized typography benchmark */
      font-size: 20px;
    }
    #vs-tooltip .vs-source-label {
      font-size: 11px;
      color: #888;
      margin-bottom: 4px;
      display: none;
    }
    #vs-tooltip .vs-context {
      font-size: calc(1em - 2px);
      font-style: italic;
      margin-bottom: 10px;
      color: #666;
    }
    #vs-tooltip .vs-word-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    #vs-tooltip .vs-word {
      font-size: calc(1em + 2px);
      font-weight: bold;
    }
    #vs-tooltip .vs-level {
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: bold;
    }
    #vs-tooltip .vs-phonetic {
      font-size: calc(1em - 2px);
      color: #666;
    }
    #vs-tooltip .vs-audio-real,
    #vs-tooltip .vs-audio-sys {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      line-height: 1;
    }
    /* Dim the real audio button when it's in a muted/low volume state */
    #vs-tooltip .vs-audio-real.vs-muted {
      cursor: default;
      opacity: 0.5;
    }
    #vs-tooltip .vs-definition {
      font-size: 1em;
      margin-bottom: 6px;
      font-weight: bold;
    }
    #vs-tooltip .vs-example {
      font-style: italic;
      font-size: calc(1em - 2px);
      margin-bottom: 8px;
      color: #555;
    }
    #vs-tooltip .vs-synonyms {
      color: #555;
      font-size: 13px;
      margin-bottom: 8px;
    }
    #vs-tooltip .vs-links {
      display: flex;
      gap: 8px;
      font-size: 13px;
    }
    #vs-tooltip .vs-links a {
      text-decoration: none;
    }
    #vs-tooltip .vs-links a:hover {
      text-decoration: underline;
    }
    #vs-tooltip .vs-full-def {
      margin-top: 10px;
      width: 100%;
      padding: 8px 0;
      border: none;
      border-radius: 0px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
}

// ─── PART 3 — Show / hide ────────────────────────────────────────────────────

let _audioInstance = null;
let _requestToken = 0; // incremented on each click; callbacks check against it to detect staleness
let _cachedTheme = null;

/**
 * Defensive SpeechSynthesis engine wrapper to prevent ghost overlapping audio queue cascades.
 * @param {string} word
 */
function _speakFallback(word) {
  try {
    // Clear any previous queued utterance fragments immediately before starting new speech cycle
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        window.speechSynthesis.speak(utter);
      }, { once: true });
    } else {
      window.speechSynthesis.speak(utter);
    }
  } catch (err) {
    console.warn('[VocaSpot] SpeechSynthesis error:', err.message);
  }
}

function _applyAdaptiveTheme(tip) {
  if (!_cachedTheme) {
    let containerBg   = '#ffffff';
    let containerText = '#1a1a1a';
    let isDark        = false;

    try {
      const bodyBg    = window.getComputedStyle(document.body).backgroundColor;
      const rgbValues = bodyBg.match(/\d+/g);

      if (rgbValues && rgbValues.length >= 3) {
        const r = parseInt(rgbValues[0]);
        const g = parseInt(rgbValues[1]);
        const b = parseInt(rgbValues[2]);

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 128) {
          containerBg   = '#121212';
          containerText = '#e5e7eb';
          isDark        = true;
        }
      }
    } catch (e) {
      console.warn('[VocaSpot] Background theme sensing failed, falling back to light schema.');
    }

    _cachedTheme = { containerBg, containerText, isDark };
  }

  const { containerBg, containerText, isDark } = _cachedTheme;

  tip.style.setProperty('background', containerBg, 'important');
  tip.style.setProperty('color', containerText, 'important');

  const primaryColor = isDark ? '#ffffdd' : '';
  const primarySelectors = ['.vs-definition'];
  for (const sel of primarySelectors) {
    const el = tip.querySelector(sel);
    if (!el) continue;
    if (isDark) {
      el.style.setProperty('color', primaryColor, 'important');
    } else {
      el.style.removeProperty('color');
    }
  }

  const mutedColor = isDark ? '#f1f5fb' : '';
  const mutedSelectors = ['.vs-context', '.vs-phonetic', '.vs-example', '.vs-synonyms'];
  for (const sel of mutedSelectors) {
    const el = tip.querySelector(sel);
    if (!el) continue;
    if (isDark) {
      el.style.setProperty('color', mutedColor, 'important');
    } else {
      el.style.removeProperty('color');
    }
  }

  return containerBg;
}

function _renderSentenceSecurely(container, sentence) {
  container.textContent = '';

  const tokens = sentence.split(/\*\*(.+?)\*\*/g);
  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i]) continue;

    if (i % 2 === 1) {
      const strongEl = document.createElement('strong');
      strongEl.textContent = tokens[i];
      container.appendChild(strongEl);
    } else {
      container.appendChild(document.createTextNode(tokens[i]));
    }
  }
}

function _positionTooltip(tip, span) {
  const rect = (span instanceof Element) ? span.getBoundingClientRect() : span;
  const GAP  = 8;
  const tipH = tip.offsetHeight;
  const tipW = tip.offsetWidth;

  let top = rect.top - tipH - GAP >= 0
    ? rect.top - tipH - GAP
    : rect.bottom + GAP;

  const maxTop = window.innerHeight - tipH - GAP;
  if (top > maxTop) top = maxTop;
  if (top < GAP)    top = GAP;

  let left       = rect.left;
  const maxLeft  = window.innerWidth - tipW - GAP;
  if (left > maxLeft) left = maxLeft;
  if (left < GAP)     left = GAP;

  tip.style.top  = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}

function showTooltip(span, data, source = 'cefr') {
  const tip = document.getElementById('vs-tooltip');
  if (!tip) return;

  const isManual   = source === 'manual';
  const definition = data.definition;
  const word       = isManual
    ? data.word
    : (span.dataset.lemma || span.dataset.word || span.textContent.trim());

  const sourceLabelEl = tip.querySelector('.vs-source-label');
  if (sourceLabelEl) {
    sourceLabelEl.textContent  = isManual ? 'Manual lookup' : '';
    sourceLabelEl.style.display = isManual ? '' : 'none';
  }

  const contextEl = tip.querySelector('.vs-context');
  const contextSentence = data.context?.sentence;
  if (contextSentence) {
    _renderSentenceSecurely(contextEl, contextSentence);
    contextEl.style.display = '';
  } else {
    contextEl.textContent   = '';
    contextEl.style.display = 'none';
  }

  tip.querySelector('.vs-word').textContent = word;

  const levelEl    = tip.querySelector('.vs-level');
  const fullDefBtn = tip.querySelector('.vs-full-def');
  const linksEl    = tip.querySelector('.vs-links');

  let dynamicBgColor   = '#0D9488';
  let dynamicTextColor = '#ffffff';

  if (!isManual) {
    const currentLevel = span.dataset.level || '';
    levelEl.textContent  = currentLevel;
    levelEl.style.display = '';

    if (typeof CEFR_COLORS !== 'undefined' && CEFR_COLORS[currentLevel]) {
      dynamicBgColor   = CEFR_COLORS[currentLevel].bg;
      dynamicTextColor = CEFR_COLORS[currentLevel].text;
    }

    levelEl.style.backgroundColor = dynamicBgColor;
    levelEl.style.color           = dynamicTextColor;
  } else {
    levelEl.textContent   = '';
    levelEl.style.display = 'none';
  }

  tip.style.borderColor = dynamicBgColor;

  const activeContainerBg = _applyAdaptiveTheme(tip);

  const phoneticEl = tip.querySelector('.vs-phonetic');
  const audioRealBtn = tip.querySelector('.vs-audio-real');
  const audioSysBtn  = tip.querySelector('.vs-audio-sys');
  const defEl      = tip.querySelector('.vs-definition');
  const exEl       = tip.querySelector('.vs-example');
  const synEl      = tip.querySelector('.vs-synonyms');

  if (definition.error) {
    phoneticEl.textContent = '';
    defEl.textContent      = 'Definition not found — try Cambridge Dictionary';
    exEl.style.display     = 'none';
    synEl.style.display    = 'none';

    // When dictionary extraction fails, treat as no real audio
    audioRealBtn.innerHTML = '&#128264;'; // 🔈 (Low Volume / Muted placeholder)
    audioRealBtn.classList.add('vs-muted');
    audioRealBtn.onclick = null;
  } else {
    phoneticEl.textContent = definition.phonetic || '';

    if (definition.audio) {
      audioRealBtn.innerHTML = '&#128266;'; // 🔊 (High Volume)
      audioRealBtn.classList.remove('vs-muted');
      audioRealBtn.onclick = () => {
        // Halt any ongoing Web Speech synthesis to prevent cross-channel overlapping audio clash
        try { window.speechSynthesis.cancel(); } catch (e) {}

        if (!_audioInstance) {
          _audioInstance = new Audio();
        } else {
          _audioInstance.pause();
        }
        _audioInstance.src = definition.audio;
        _audioInstance.play().catch(() => { /* catch programmatic layout play rejections gracefully */ });
      };
    } else {
      audioRealBtn.innerHTML = '&#128264;'; // 🔈 (Low Volume / Muted placeholder)
      audioRealBtn.classList.add('vs-muted');
      audioRealBtn.onclick = null;
    }

    const firstDef = definition.definitions?.[0];
    if (firstDef) {
      defEl.textContent = `${firstDef.partOfSpeech} · ${firstDef.definition}`;
      if (firstDef.example) {
        firstDef.example.includes('**')
          ? _renderSentenceSecurely(exEl, firstDef.example)
          : (exEl.textContent = firstDef.example);
        exEl.style.display = '';
      } else {
        exEl.style.display = 'none';
      }
    } else {
      defEl.textContent  = '';
      exEl.style.display = 'none';
    }

    if (definition.synonyms?.length) {
      synEl.textContent  = 'Synonyms: ' + definition.synonyms.join(', ');
      synEl.style.display = '';
    } else {
      synEl.style.display = 'none';
    }
  }

  // System fallback TTS channel is always fully responsive regardless of API state mapping
  audioSysBtn.onclick = () => {
    if (_audioInstance) { try { _audioInstance.pause(); } catch (e) {} }
    _speakFallback(word);
  };

  // ─── RUNTIME AUTO PLAY DISPATCH ────────────────────────────────────────────
  if (AUTO_PLAY_MODE === 1) {
    if (!definition.error && definition.audio) {
      // Real native human voice path execution triggered via click virtualization routing
      audioRealBtn.onclick();
    } else {
      // Fallback straight into Web Speech engine directly
      audioSysBtn.onclick();
    }
  }

  const enc = encodeURIComponent(word);
  linksEl.innerHTML =
    `<a href="https://dictionary.cambridge.org/dictionary/english/${enc}" target="_blank" rel="noopener">Cambridge</a>` +
    ' | ' +
    `<a href="https://www.merriam-webster.com/dictionary/${enc}" target="_blank" rel="noopener">Merriam-Webster</a>`;

  fullDefBtn.style.backgroundColor = dynamicBgColor;
  fullDefBtn.style.color           = dynamicTextColor;

  const linkElements = linksEl.querySelectorAll('a');
  linkElements.forEach(a => {
    if (activeContainerBg === '#121212') {
      a.style.setProperty('color', dynamicBgColor, 'important');
    } else {
      const targetColor = (dynamicTextColor === '#ffffff' || dynamicTextColor === '#fff')
        ? dynamicBgColor
        : dynamicTextColor;
      a.style.setProperty('color', targetColor, 'important');
    }
  });

  fullDefBtn.style.display = '';
  fullDefBtn.onclick = () => {
    hideTooltip();
    if (isManual) {
      populateSidebar(word, word, '', data.context || { sentence: '' }, definition);
    } else {
      populateSidebar(word, span.dataset.lemma || word, span.dataset.level || '', data.context, definition);
    }
    showSidebar();
  };

  tip.style.display = 'block';
  _positionTooltip(tip, span);
}

function _showLoading(span) {
  const tip = document.getElementById('vs-tooltip');
  if (!tip) return;

  _cachedTheme = null;

  const sourceLabelEl = tip.querySelector('.vs-source-label');
  if (sourceLabelEl) { sourceLabelEl.textContent = ''; sourceLabelEl.style.display = 'none'; }

  tip.querySelector('.vs-context').textContent  = 'Loading…';
  tip.querySelector('.vs-context').style.display = '';
  tip.querySelector('.vs-word').textContent      = span.dataset.lemma || span.textContent.trim();

  const levelEl      = tip.querySelector('.vs-level');
  const currentLevel = span.dataset.level || '';
  levelEl.textContent   = currentLevel;
  levelEl.style.display = currentLevel ? '' : 'none';

  if (currentLevel && typeof CEFR_COLORS !== 'undefined' && CEFR_COLORS[currentLevel]) {
    levelEl.style.backgroundColor = CEFR_COLORS[currentLevel].bg;
    levelEl.style.color           = CEFR_COLORS[currentLevel].text;
  } else {
    levelEl.style.backgroundColor = '';
    levelEl.style.color           = '';
  }

  tip.querySelector('.vs-phonetic').textContent  = '';
  
  // Set neutral setup during loading state to prevent flash states
  const audioRealBtn = tip.querySelector('.vs-audio-real');
  audioRealBtn.innerHTML = '&#128266;';
  audioRealBtn.classList.remove('vs-muted');
  audioRealBtn.onclick = null;
  tip.querySelector('.vs-audio-sys').onclick = null;

  tip.querySelector('.vs-definition').textContent = '';
  tip.querySelector('.vs-example').style.display  = 'none';
  tip.querySelector('.vs-synonyms').style.display = 'none';
  tip.querySelector('.vs-links').innerHTML        = '';
  tip.querySelector('.vs-full-def').style.display = 'none';

  _applyAdaptiveTheme(tip);

  tip.style.display = 'block';
  _positionTooltip(tip, span);
}

function hideTooltip() {
  const tip = document.getElementById('vs-tooltip');
  if (tip) tip.style.display = 'none';
  _cachedTheme = null;
  
  // Cut off system speech channel if tooltip loses focus/visibility context contextually
  try { window.speechSynthesis.cancel(); } catch (e) {}
}

// ─── PART 3b — Manual lookup button ─────────────────────────────────────────

function _getLemmaForLookup(word) {
  if (typeof nlp !== 'function') return word;
  const doc        = nlp(word);
  const infinitive = doc.verbs().toInfinitive().out('text');
  if (infinitive) return infinitive;
  const singular = doc.nouns().toSingular().out('text');
  if (singular) return singular;
  return word;
}

function _showLoadingAt(word, rect) {
  const tip = document.getElementById('vs-tooltip');
  if (!tip) return;

  _cachedTheme = null;

  const sourceLabelEl = tip.querySelector('.vs-source-label');
  if (sourceLabelEl) { sourceLabelEl.textContent = 'Manual lookup'; sourceLabelEl.style.display = ''; }

  const contextEl = tip.querySelector('.vs-context');
  contextEl.textContent   = '';
  contextEl.style.display = 'none';

  tip.querySelector('.vs-word').textContent = word;

  const levelEl = tip.querySelector('.vs-level');
  levelEl.textContent   = '';
  levelEl.style.display = 'none';

  tip.querySelector('.vs-phonetic').textContent   = '';
  
  const audioRealBtn = tip.querySelector('.vs-audio-real');
  audioRealBtn.innerHTML = '&#128266;';
  audioRealBtn.classList.remove('vs-muted');
  audioRealBtn.onclick = null;
  tip.querySelector('.vs-audio-sys').onclick = null;

  tip.querySelector('.vs-definition').textContent = 'Loading…';
  tip.querySelector('.vs-example').style.display  = 'none';
  tip.querySelector('.vs-synonyms').style.display = 'none';
  tip.querySelector('.vs-links').innerHTML        = '';
  tip.querySelector('.vs-full-def').style.display = 'none';

  _applyAdaptiveTheme(tip);

  tip.style.display = 'block';
  _positionTooltip(tip, rect);
}

function removeLookupButton() {
  const btn = document.getElementById('vs-lookup-btn');
  if (btn) btn.remove();
}

function showLookupButton(selectedText, rect) {
  removeLookupButton();
  injectTooltipStyles();
  createTooltip();

  const btn = document.createElement('div');
  btn.id            = 'vs-lookup-btn';
  btn.textContent   = `Look up: ${selectedText}`;
  Object.assign(btn.style, {
    position:     'fixed',
    zIndex:       '999997',
    background:   '#0D9488',
    color:        'white',
    borderRadius: '20px',
    padding:      '6px 12px',
    fontSize:     '13px',
    fontFamily:   'system-ui, sans-serif',
    cursor:       'pointer',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.2)',
    opacity:      '0',
    transition:   'opacity 150ms',
    whiteSpace:   'nowrap',
    userSelect:   'none',
    border:       'none',
  });

  document.body.appendChild(btn);

  const btnW    = btn.offsetWidth;
  const centerX = rect.left + rect.width / 2;
  let left      = centerX - btnW / 2;
  const top     = rect.top >= 60 ? rect.top - 40 : rect.bottom + 10;
  left          = Math.max(4, Math.min(window.innerWidth - btnW - 4, left));

  btn.style.top  = `${Math.round(top)}px`;
  btn.style.left = `${Math.round(left)}px`;

  requestAnimationFrame(() => { btn.style.opacity = '1'; });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    const context = extractContext(null, selectedText);

    removeLookupButton();
    window.getSelection().removeAllRanges();

    const lemma = selectedText.includes(' ') ? selectedText : _getLemmaForLookup(selectedText);
    _showLoadingAt(selectedText, rect);

    const token = ++_requestToken;
    chrome.runtime.sendMessage(
      { action: 'fetchDefinition', word: selectedText, lemma },
      definition => {
        if (chrome.runtime.lastError || !definition) {
          definition = { error: true, word: selectedText };
        }
        if (token !== _requestToken) return;
        showTooltip(rect, { word: selectedText, definition, context }, 'manual');
      }
    );
  });
}

// ─── PART 4 — Event listeners ─────────────────────────────────────────────────

let _initialized = false;

function init() {
  if (_initialized) return;
  _initialized = true;

  injectTooltipStyles();
  createTooltip();
  injectSidebar().catch(err => console.error('[VocaSpot] sidebar injection failed:', err));

  document.addEventListener('click', e => {
    const path = e.composedPath();

    let clickedHighlight = null;
    let clickedTooltip   = null;
    let clickedSidebar   = null;
    let clickedLookup    = null;

    for (const el of path) {
      if (!el.tagName) continue;
      if (el.classList?.contains('vs-highlight')) clickedHighlight = el;
      if (el.id === 'vs-tooltip')      clickedTooltip  = el;
      if (el.id === 'vs-sidebar-host') clickedSidebar  = el;
      if (el.id === 'vs-lookup-btn')   clickedLookup   = el;
    }

    if (clickedHighlight) {
      e.stopPropagation();
      _showLoading(clickedHighlight);
      const context = extractContext(clickedHighlight);
      const token   = ++_requestToken;
      chrome.runtime.sendMessage(
        { action: 'fetchDefinition', payload: { word: clickedHighlight.dataset.lemma } },
        definition => {
          if (chrome.runtime.lastError || !definition) {
            definition = { error: true, word: clickedHighlight.dataset.lemma };
          }
          if (token !== _requestToken) return;
          showTooltip(clickedHighlight, { context, definition });
        }
      );
      return;
    }

    if (!clickedTooltip && !clickedSidebar && !clickedLookup) {
      hideTooltip();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      removeLookupButton();
      if (isSidebarVisible()) {
        hideSidebar();
      } else {
        hideTooltip();
      }
    }
  });
}
