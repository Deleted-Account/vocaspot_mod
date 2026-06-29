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
    '</div>' +
    /* Dedicated scrolling viewport wrapper to isolate hyper-dense multi-definitions layout */
    '<div class="vs-scroll-viewport">' +
      '<div class="vs-definition-container"></div>' +
    '</div>' +
    /* Dual tracking containers for advanced thesaurus expansion */
    '<div class="vs-synonyms"></div>' +
    '<div class="vs-antonyms"></div>' +
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
      /* Enforced Lookupper industrial boundaries */
      width: 450px;
      max-width: 450px;
      max-height: 700px;
      padding: 12px;
      font-family: system-ui, sans-serif;
      line-height: 1.5;
      border-radius: 0px;
      border: 3px solid #0D9488;
      display: none;
      box-sizing: border-box;

      /* Strategic Brutalist multi-axis layout containment flexbox */
      display: flex;
      flex-direction: column;

      /* Centralized typography benchmark */
      font-size: 20px;

      /* 好的大佬：这里注入两个核心 CSS 变量，用来动态继承颜色以及驱动滚动条的淡入淡出 */
      --vs-scroll-thumb-color: #0D9488;
      --vs-scroll-thumb-opacity: 0;
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
      flex-shrink: 0;
    }
    #vs-tooltip .vs-word-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      flex-shrink: 0;
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
    /* Strategy 3: Tight internal layout encapsulation with custom slim vertical scrolling tracks */
    #vs-tooltip .vs-scroll-viewport {
      flex-grow: 1;
      overflow-y: auto;
      margin-bottom: 8px;
      padding-right: 4px;
    }
    /* 好的大佬：重构后的呼吸滚动条样式系统 */
    #vs-tooltip .vs-scroll-viewport::-webkit-scrollbar {
      width: 6px;
    }
    #vs-tooltip .vs-scroll-viewport::-webkit-scrollbar-track {
      background: transparent;
    }
    #vs-tooltip .vs-scroll-viewport::-webkit-scrollbar-thumb {
      /* 动态将颜色绑定至继承自 CEFR_COLORS 的 CSS 变量 */
      background-color: var(--vs-scroll-thumb-color);
      border-radius: 3px;
      /* 通过使用带透明度的颜色或者在隐藏状态下将其重设为透明色来实现无感知渐隐 */
      border: 3px solid transparent;
      box-shadow: inset 0 0 0 6px var(--vs-scroll-thumb-color);
      transition: box-shadow 300ms ease;
    }
    /* 当视口被赋予激活状态时，瞬间打破完全透明，让滚动滑块优雅亮起 */
    #vs-tooltip .vs-scroll-viewport.vs-scrolling::-webkit-scrollbar-thumb {
      box-shadow: inset 0 0 0 6px var(--vs-scroll-thumb-color);
    }
    #vs-tooltip .vs-scroll-viewport:not(.vs-scrolling)::-webkit-scrollbar-thumb {
      box-shadow: inset 0 0 0 6px transparent;
    }
    /* Structured Definition Block with sub-tiered inline control controls */
    #vs-tooltip .vs-def-block {
      border-bottom: 1px dashed #ccc;
      padding: 6px 0;
    }
    #vs-tooltip .vs-def-block:last-child {
      border-bottom: none;
    }
    #vs-tooltip .vs-def-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }
    #vs-tooltip .vs-pos-tag {
      font-size: 13px;
      font-style: italic;
      background: rgba(13, 148, 136, 0.1);
      padding: 1px 4px;
      font-weight: bold;
    }
    #vs-tooltip .vs-phonetic {
      font-size: calc(1em - 4px);
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
    #vs-tooltip .vs-audio-real.vs-muted {
      cursor: default;
      opacity: 0.5;
    }
    #vs-tooltip .vs-definition {
      font-size: 1em;
      margin-bottom: 4px;
      font-weight: bold;
    }
    #vs-tooltip .vs-example {
      font-style: italic;
      font-size: calc(1em - 2px);
      margin-bottom: 2px;
      color: #555;
    }
    #vs-tooltip .vs-synonyms,
    #vs-tooltip .vs-antonyms {
      color: #555;
      font-size: 13px;
      margin-bottom: 6px;
      flex-shrink: 0;
    }
    #vs-tooltip .vs-thesaurus-more {
      color: #0D9488;
      font-weight: bold;
      cursor: pointer;
      margin-left: 4px;
      user-select: none;
    }
    #vs-tooltip .vs-thesaurus-more:hover {
      text-decoration: underline;
    }
    #vs-tooltip .vs-links {
      display: flex;
      gap: 8px;
      font-size: 13px;
      flex-shrink: 0;
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
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

// ─── PART 3 — Show / hide ────────────────────────────────────────────────────

let _audioInstance = null;
let _requestToken = 0; // incremented on each click; callbacks check against it to detect staleness
let _cachedTheme = null;
let _scrollFadeTimer = null; // 好的大佬：用来管理滚动条渐隐时长的全局原子计时器

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
    const elements = tip.querySelectorAll(sel);
    for (const el of elements) {
      if (isDark) {
        el.style.setProperty('color', primaryColor, 'important');
      } else {
        el.style.removeProperty('color');
      }
    }
  }

  const mutedColor = isDark ? '#f1f5fb' : '';
  const mutedSelectors = ['.vs-context', '.vs-phonetic', '.vs-example', '.vs-synonyms', '.vs-antonyms'];
  for (const sel of mutedSelectors) {
    const elements = tip.querySelectorAll(sel);
    for (const el of elements) {
      if (isDark) {
        el.style.setProperty('color', mutedColor, 'important');
      } else {
        el.style.removeProperty('color');
      }
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

/**
 * Advanced compact thesaurus renderer supporting expandable text limits natively.
 * @param {HTMLElement} container 
 * @param {string} label 
 * @param {string[]} items 
 */
function _renderThesaurusWithExpansion(container, label, items) {
  if (!items || !items.length) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  container.style.display = '';

  if (items.length <= 5) {
    // If the list size safely fits within the design margins, display it all statically
    container.textContent = `${label}: ${items.join(', ')}`;
  } else {
    // Strategy 3 adaptation: Render first 5 items, truncate with clickable expansion anchors
    container.innerHTML = '';
    container.appendChild(document.createTextNode(`${label}: ${items.slice(0, 5).join(', ')}`));

    const moreBtn = document.createElement('span');
    moreBtn.className = 'vs-thesaurus-more';
    moreBtn.textContent = '...';
    moreBtn.setAttribute('title', 'Click to expand all');
    
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      // Smoothly expand the remaining array items inline on reader interaction
      container.innerHTML = '';
      container.appendChild(document.createTextNode(`${label}: ${items.join(', ')}`));
    };

    container.appendChild(moreBtn);
  }
}

/**
 * 好的大佬：用于绑定滚动条智能渐隐生命周期的辅助核心函数
 * @param {HTMLElement} scrollBox 
 */
function _setupScrollAutofade(scrollBox) {
  if (!scrollBox) return;
  
  // 每次重置时确保旧的类名和定时器被安全撤销
  scrollBox.classList.remove('vs-scrolling');
  if (_scrollFadeTimer) clearTimeout(_scrollFadeTimer);

  scrollBox.onscroll = () => {
    // 鼠标滚动发生时，立刻添加高亮类名，使滚动滑块由于 transition 丝滑显现
    scrollBox.classList.add('vs-scrolling');

    if (_scrollFadeTimer) clearTimeout(_scrollFadeTimer);
    
    // 停止滚动 800 毫秒后，自动将激活类除去，滚动条优雅淡回全透明隐形状态
    _scrollFadeTimer = setTimeout(() => {
      scrollBox.classList.remove('vs-scrolling');
    }, 800);
  };
}

/**
 * Highly optimized screen perimeter protective docking viewport positioning calculation matrix.
 * Eliminates out-of-bounds cutoffs under rigid 450x700 constraints.
 */
function _positionTooltip(tip, span) {
  // Ensure we switch block display to capture real physical offsets accurately
  tip.style.display = 'flex';

  const rect = (span instanceof Element) ? span.getBoundingClientRect() : span;
  const GAP  = 8;
  const tipH = tip.offsetHeight;
  const tipW = tip.offsetWidth; // Confirmed 450px mapping

  // Attempt standard top-side layout placement
  let top = rect.top - tipH - GAP;

  // Perimeter collision bypass: if upper boundaries compress past screen roof, flip down
  if (top < GAP) {
    top = rect.bottom + GAP;
  }

  // Double-insurance bottom guardrail: prevent overflow if word resides at absolute viewport bottom
  const maxTop = window.innerHeight - tipH - GAP;
  if (top > maxTop) {
    top = maxTop;
  }
  if (top < GAP) {
    top = GAP;
  }

  // Lateral axis horizontal distribution alignment
  let left = rect.left;
  const maxLeft = window.innerWidth - tipW - GAP;
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
      dynamicTextColor = CEFR_COLORS[currentLevel].text; // 👈 好的大佬：高能点，这里就是继承高亮配置里的文字颜色
    }

    levelEl.style.backgroundColor = dynamicBgColor;
    levelEl.style.color           = dynamicTextColor;
  } else {
    levelEl.textContent   = '';
    levelEl.style.display = 'none';
  }

  tip.style.borderColor = dynamicBgColor;

  // 好的大佬：驱动滚动条动态色彩继承核心！将 CSS 变量在运行时秒变当前 CEFR 级对应的文字颜色
  tip.style.setProperty('--vs-scroll-thumb-color', dynamicTextColor);

  const defContainer = tip.querySelector('.vs-definition-container');
  defContainer.innerHTML = '';

  let autoplayExecuted = false;

  if (definition.error) {
    const errorBlock = document.createElement('div');
    errorBlock.className = 'vs-def-block';
    
    const defEl = document.createElement('div');
    defEl.className = 'vs-definition';
    defEl.textContent = 'Definition not found — try Cambridge Dictionary';
    errorBlock.appendChild(defEl);
    defContainer.appendChild(errorBlock);

    // Fallback straight into Web Speech system engine during error state automatically if requested
    if (AUTO_PLAY_MODE === 1) {
      _speakFallback(word);
      autoplayExecuted = true;
    }
  } else {
    // Strategy 3 Loop Iteration: Flatten uncapped multi-definitions natively with isolated audio/phonetic nodes
    if (definition.definitions?.length) {
      definition.definitions.forEach((defItem, index) => {
        const defBlock = document.createElement('div');
        defBlock.className = 'vs-def-block';

        const headerEl = document.createElement('div');
        headerEl.className = 'vs-def-header';

        if (defItem.partOfSpeech) {
          const posEl = document.createElement('span');
          posEl.className = 'vs-pos-tag';
          posEl.textContent = defItem.partOfSpeech;
          headerEl.appendChild(posEl);
        }

        if (defItem.phonetic) {
          const phoEl = document.createElement('span');
          phoEl.className = 'vs-phonetic';
          phoEl.textContent = defItem.phonetic;
          headerEl.appendChild(phoEl);
        }

        // Dedicated Real Voice Audio Trigger Button Node
        const realAudioBtn = document.createElement('button');
        realAudioBtn.className = 'vs-audio-real';
        realAudioBtn.setAttribute('aria-label', `Play ${defItem.partOfSpeech || 'word'} pronunciation`);
        
        if (defItem.audio) {
          realAudioBtn.innerHTML = '&#128266;'; // 🔊
          realAudioBtn.onclick = (e) => {
            e.stopPropagation();
            try { window.speechSynthesis.cancel(); } catch (err) {}
            if (!_audioInstance) _audioInstance = new Audio();
            else _audioInstance.pause();
            _audioInstance.src = defItem.audio;
            _audioInstance.play().catch(() => {});
          };
        } else {
          realAudioBtn.innerHTML = '&#128264;'; // 🔈
          realAudioBtn.classList.add('vs-muted');
        }
        headerEl.appendChild(realAudioBtn);

        // Native System Text-To-Speech Button Channel Interface
        const sysAudioBtn = document.createElement('button');
        sysAudioBtn.className = 'vs-audio-sys';
        sysAudioBtn.innerHTML = '&#128226;'; // 📣
        sysAudioBtn.setAttribute('aria-label', 'Play system TTS');
        sysAudioBtn.onclick = (e) => {
          e.stopPropagation();
          if (_audioInstance) { try { _audioInstance.pause(); } catch (err) {} }
          _speakFallback(word);
        };
        headerEl.appendChild(sysAudioBtn);

        defBlock.appendChild(headerEl);

        const bodyDefEl = document.createElement('div');
        bodyDefEl.className = 'vs-definition';
        bodyDefEl.textContent = defItem.definition;
        defBlock.appendChild(bodyDefEl);

        if (defItem.example) {
          const exEl = document.createElement('div');
          exEl.className = 'vs-example';
          defItem.example.includes('**')
            ? _renderSentenceSecurely(exEl, defItem.example)
            : (exEl.textContent = defItem.example);
          defBlock.appendChild(exEl);
        }

        defContainer.appendChild(defBlock);

        // Core Auto-play dispatcher handling on the very first parsed item node index match
        if (AUTO_PLAY_MODE === 1 && !autoplayExecuted && index === 0) {
          if (defItem.audio) {
            realAudioBtn.onclick({ stopPropagation: () => {} });
          } else {
            sysAudioBtn.onclick({ stopPropagation: () => {} });
          }
          autoplayExecuted = true;
        }
      });
    } else {
      const emptyBlock = document.createElement('div');
      emptyBlock.className = 'vs-def-block';
      const emptyDef = document.createElement('div');
      emptyDef.className = 'vs-definition';
      emptyDef.textContent = 'No core definition entries structured.';
      emptyBlock.appendChild(emptyDef);
      defContainer.appendChild(emptyBlock);
    }

    // Render expanding synonyms and antonyms datasets side by side safely
    const synEl = tip.querySelector('.vs-synonyms');
    const antEl = tip.querySelector('.vs-antonyms');
    
    _renderThesaurusWithExpansion(synEl, 'Synonyms', definition.synonyms);
    _renderThesaurusWithExpansion(antEl, 'Antonyms', definition.antonyms);
  }

  const activeContainerBg = _applyAdaptiveTheme(tip);

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

  // Reset the internal scrolling element to the absolute top on every new word presentation cycle
  const scrollBox = tip.querySelector('.vs-scroll-viewport');
  if (scrollBox) {
    scrollBox.scrollTop = 0;
    _setupScrollAutofade(scrollBox); // 👈 好的大佬：在此处激活智能渐隐监听链条
  }

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

  const levelEl = tip.querySelector('.vs-level');
  const currentLevel = span.dataset.level || '';
  levelEl.textContent   = currentLevel;
  levelEl.style.display = currentLevel ? '' : 'none';

  let loadingThumbColor = '#0D9488';
  if (currentLevel && typeof CEFR_COLORS !== 'undefined' && CEFR_COLORS[currentLevel]) {
    levelEl.style.backgroundColor = CEFR_COLORS[currentLevel].bg;
    levelEl.style.color           = CEFR_COLORS[currentLevel].text;
    loadingThumbColor             = CEFR_COLORS[currentLevel].text;
  } else {
    levelEl.style.backgroundColor = '';
    levelEl.style.color           = '';
  }

  tip.style.setProperty('--vs-scroll-thumb-color', loadingThumbColor);

  const defContainer = tip.querySelector('.vs-definition-container');
  defContainer.innerHTML = '<div class="vs-def-block"><div class="vs-definition"></div></div>';
  tip.querySelector('.vs-synonyms').style.display = 'none';
  tip.querySelector('.vs-antonyms').style.display = 'none';
  tip.querySelector('.vs-links').innerHTML        = '';
  tip.querySelector('.vs-full-def').style.display = 'none';

  _applyAdaptiveTheme(tip);

  const scrollBox = tip.querySelector('.vs-scroll-viewport');
  if (scrollBox) _setupScrollAutofade(scrollBox);

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

  tip.style.setProperty('--vs-scroll-thumb-color', '#ffffff');

  const defContainer = tip.querySelector('.vs-definition-container');
  defContainer.innerHTML = '<div class="vs-def-block"><div class="vs-definition">Loading…</div></div>';
  tip.querySelector('.vs-synonyms').style.display = 'none';
  tip.querySelector('.vs-antonyms').style.display = 'none';
  tip.querySelector('.vs-links').innerHTML        = '';
  tip.querySelector('.vs-full-def').style.display = 'none';

  _applyAdaptiveTheme(tip);

  const scrollBox = tip.querySelector('.vs-scroll-viewport');
  if (scrollBox) _setupScrollAutofade(scrollBox);

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
