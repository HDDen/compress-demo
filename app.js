const STORAGE_KEYS = {
  examples: "compression-demo.examples",
  dictionaries: "compression-demo.dictionaries",
  settings: "compression-demo.settings",
};

const encoder = new TextEncoder();
const MESH_METHOD_LABEL = "Mesh-compressor";
const LZW_METHOD_LABEL = "LZW-сжатие";
const DEFAULT_DICTIONARIES = [
  {
    name: "Cyr2Lat standard",
    enabled: true,
    mapping: {
      "А": "A",
      "В": "B",
      "Е": "E",
      "Ё": "E",
      "З": "3",
      "К": "K",
      "М": "M",
      "Н": "H",
      "О": "O",
      "Р": "P",
      "С": "C",
      "Т": "T",
      "Х": "X",
      "Ь": "b",
      "а": "a",
      "е": "e",
      "ё": "e",
      "о": "o",
      "р": "p",
      "с": "c",
      "у": "y",
      "х": "x",
    },
  },
  {
    name: "Cyr2Lat standard extended",
    enabled: true,
    mapping: {
      "А": "A",
      "В": "B",
      "Е": "E",
      "Ё": "E",
      "З": "3",
      "К": "K",
      "М": "M",
      "Н": "H",
      "О": "O",
      "Р": "P",
      "С": "C",
      "Т": "T",
      "Х": "X",
      "Ь": "b",
      "а": "a",
      "т": "m",
      "п": "n",
      "и": "u",
      "е": "e",
      "ё": "e",
      "о": "o",
      "р": "p",
      "с": "c",
      "у": "y",
      "х": "x",
    },
  },
  {
    name: "Transliterate",
    enabled: true,
    mapping: {
      "А": "A",
      "Б": "B",
      "В": "V",
      "Г": "G",
      "Д": "D",
      "Е": "E",
      "Ё": "E",
      "Ж": "Zh",
      "З": "Z",
      "И": "I",
      "Й": "Y",
      "К": "K",
      "Л": "L",
      "М": "M",
      "Н": "N",
      "О": "O",
      "П": "P",
      "Р": "R",
      "С": "S",
      "Т": "T",
      "У": "U",
      "Ф": "F",
      "Х": "H",
      "Ц": "C",
      "Ч": "Ch",
      "Ш": "Sh",
      "Щ": "Sch",
      "Ъ": "",
      "Ы": "Y",
      "Ь": "",
      "Э": "E",
      "Ю": "Yu",
      "Я": "Ya",
      "а": "a",
      "б": "b",
      "в": "v",
      "г": "g",
      "д": "d",
      "е": "e",
      "ё": "e",
      "ж": "zh",
      "з": "z",
      "и": "i",
      "й": "y",
      "к": "k",
      "л": "l",
      "м": "m",
      "н": "n",
      "о": "o",
      "п": "p",
      "р": "r",
      "с": "s",
      "т": "t",
      "у": "u",
      "ф": "f",
      "х": "h",
      "ц": "c",
      "ч": "ch",
      "ш": "sh",
      "щ": "sch",
      "ъ": "",
      "ы": "y",
      "ь": "",
      "э": "e",
      "ю": "yu",
      "я": "ya",
    },
  },
];

const state = {
  examples: loadJson(STORAGE_KEYS.examples, []),
  dictionaries: loadJson(STORAGE_KEYS.dictionaries, []).map(normalizeDictionary),
  settings: loadJson(STORAGE_KEYS.settings, {
    sortDirection: "desc",
    byteLimit: "",
    meshEnabled: false,
    lzwEnabled: false,
  }),
};
state.settings.meshEnabled = state.settings.meshEnabled ?? false;
state.settings.lzwEnabled = state.settings.lzwEnabled ?? false;

const elements = {
  sourceInput: document.getElementById("source-input"),
  addExampleButton: document.getElementById("add-example-button"),
  clearExamplesButton: document.getElementById("clear-examples-button"),
  toggleSortButton: document.getElementById("toggle-sort-button"),
  charCounter: document.getElementById("char-counter"),
  byteCounter: document.getElementById("byte-counter"),
  limitStatus: document.getElementById("limit-status"),
  byteLimitInput: document.getElementById("byte-limit-input"),
  meshToggleButton: document.getElementById("mesh-toggle-button"),
  lzwToggleButton: document.getElementById("lzw-toggle-button"),
  sortIndicator: document.getElementById("sort-indicator"),
  exampleCount: document.getElementById("example-count"),
  resultsBody: document.getElementById("results-body"),
  dictionaryNameInput: document.getElementById("dictionary-name-input"),
  dictionaryJsonInput: document.getElementById("dictionary-json-input"),
  addDictionaryButton: document.getElementById("add-dictionary-button"),
  resetDictionariesButton: document.getElementById("reset-dictionaries-button"),
  dictionaryList: document.getElementById("dictionary-list"),
  dictionaryCount: document.getElementById("dictionary-count"),
  dictionaryTemplate: document.getElementById("dictionary-item-template"),
};

let lastValidInput = "";
let meshModel = null;

init();

function init() {
  seedDefaultDictionaries();
  initMeshCompressor();
  elements.byteLimitInput.value = state.settings.byteLimit;
  updateInputStats();
  bindEvents();
  renderAll();
}

function bindEvents() {
  elements.sourceInput.addEventListener("keydown", handleSourceKeydown);
  elements.sourceInput.addEventListener("input", handleSourceInput);
  elements.addExampleButton.addEventListener("click", addExample);
  elements.clearExamplesButton.addEventListener("click", clearExamples);
  elements.resultsBody.addEventListener("click", handleResultsClick);
  elements.toggleSortButton.addEventListener("click", toggleSortDirection);
  elements.byteLimitInput.addEventListener("input", handleByteLimitChange);
  elements.meshToggleButton.addEventListener("click", toggleMeshMethod);
  elements.lzwToggleButton.addEventListener("click", toggleLzwMethod);
  elements.addDictionaryButton.addEventListener("click", addDictionary);
  elements.resetDictionariesButton.addEventListener("click", resetDictionaries);
}

function handleSourceKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  if (event.ctrlKey) {
    event.preventDefault();
    insertAtCursor(elements.sourceInput, "\n");
    handleSourceInput();
    return;
  }

  if (event.shiftKey || event.altKey || event.metaKey) {
    return;
  }

  event.preventDefault();
  addExample();
}

function handleSourceInput() {
  const limit = getByteLimit();
  const value = elements.sourceInput.value;

  if (limit && getUtf8ByteLength(value) > limit) {
    elements.sourceInput.value = lastValidInput;
  } else {
    lastValidInput = value;
  }

  updateInputStats();
}

function handleByteLimitChange() {
  const rawValue = elements.byteLimitInput.value.trim();

  if (rawValue === "") {
    state.settings.byteLimit = "";
  } else {
    const parsed = Number(rawValue);
    state.settings.byteLimit = Number.isFinite(parsed) && parsed > 0 ? String(Math.floor(parsed)) : "";
    elements.byteLimitInput.value = state.settings.byteLimit;
  }

  persistSettings();
  handleSourceInput();
}

function addExample() {
  const text = elements.sourceInput.value;

  if (!text.trim()) {
    return;
  }

  state.examples.push({
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
  });

  persistExamples();
  elements.sourceInput.value = "";
  lastValidInput = "";
  updateInputStats();
  renderResults();
}

function clearExamples() {
  if (!state.examples.length) {
    return;
  }

  const confirmed = window.confirm("Удалить все сохраненные примеры?");
  if (!confirmed) {
    return;
  }

  state.examples = [];
  persistExamples();
  renderResults();
}

function handleResultsClick(event) {
  const deleteButton = event.target.closest("[data-delete-example-id]");
  if (!deleteButton) {
    return;
  }

  deleteExample(deleteButton.dataset.deleteExampleId);
}

function deleteExample(exampleId) {
  state.examples = state.examples.filter((example) => example.id !== exampleId);
  persistExamples();
  renderResults();
}

function addDictionary() {
  const name = elements.dictionaryNameInput.value.trim();
  const rawJson = elements.dictionaryJsonInput.value.trim();

  if (!name) {
    window.alert("Введите название словаря.");
    return;
  }

  if (!rawJson) {
    window.alert("Введите JSON-словарь.");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    window.alert("JSON не распарсился. Проверьте синтаксис.");
    return;
  }

  if (!isPlainObject(parsed)) {
    window.alert("Словарь должен быть JSON-объектом формата {\"что\": \"на что\"}.");
    return;
  }

  const invalidEntry = Object.entries(parsed).find(([, value]) => typeof value !== "string");
  if (invalidEntry) {
    window.alert("Все значения словаря должны быть строками.");
    return;
  }

  state.dictionaries.push(
    normalizeDictionary({
      name,
      enabled: true,
      mapping: parsed,
      createdAt: Date.now(),
    })
  );

  persistDictionaries();
  elements.dictionaryNameInput.value = "";
  elements.dictionaryJsonInput.value = "";
  renderAll();
}

function toggleDictionary(dictionaryId, enabled) {
  const dictionary = state.dictionaries.find((item) => item.id === dictionaryId);
  if (!dictionary) {
    return;
  }

  dictionary.enabled = enabled;
  persistDictionaries();
  renderAll();
}

function deleteDictionary(dictionaryId) {
  const dictionary = state.dictionaries.find((item) => item.id === dictionaryId);
  if (!dictionary) {
    return;
  }

  const confirmed = window.confirm(`Удалить словарь "${dictionary.name}"?`);
  if (!confirmed) {
    return;
  }

  state.dictionaries = state.dictionaries.filter((item) => item.id !== dictionaryId);
  persistDictionaries();
  renderAll();
}

function resetDictionaries() {
  const confirmed = window.confirm("Заменить текущий список словарей базовым набором?");
  if (!confirmed) {
    return;
  }

  state.dictionaries = DEFAULT_DICTIONARIES.map((dictionary) =>
    normalizeDictionary({
      ...dictionary,
      createdAt: Date.now(),
    })
  );
  persistDictionaries();
  renderAll();
}

function toggleMeshMethod() {
  state.settings.meshEnabled = !state.settings.meshEnabled;
  persistSettings();
  renderMeshMethod();
  renderResults();
}

function toggleLzwMethod() {
  state.settings.lzwEnabled = !state.settings.lzwEnabled;
  persistSettings();
  renderLzwMethod();
  renderResults();
}

function toggleSortDirection() {
  state.settings.sortDirection = state.settings.sortDirection === "desc" ? "asc" : "desc";
  persistSettings();
  renderResults();
  renderSortState();
}

function renderAll() {
  renderSortState();
  renderMeshMethod();
  renderLzwMethod();
  renderDictionaries();
  renderResults();
}

function renderSortState() {
  const isDescending = state.settings.sortDirection === "desc";
  elements.sortIndicator.textContent = isDescending ? "Новые сверху" : "Новые снизу";
  elements.toggleSortButton.textContent = isDescending ? "Показать старые сверху" : "Показать новые сверху";
}

function renderMeshMethod() {
  const isEnabled = state.settings.meshEnabled;
  elements.meshToggleButton.textContent = isEnabled ? "Включен" : "Выключен";
  elements.meshToggleButton.classList.toggle("button--primary", isEnabled);
  elements.meshToggleButton.classList.toggle("button--ghost", !isEnabled);
}

function renderLzwMethod() {
  const isEnabled = state.settings.lzwEnabled;
  elements.lzwToggleButton.textContent = isEnabled ? "Включен" : "Выключен";
  elements.lzwToggleButton.classList.toggle("button--primary", isEnabled);
  elements.lzwToggleButton.classList.toggle("button--ghost", !isEnabled);
}

function renderDictionaries() {
  elements.dictionaryCount.textContent = formatWordCount(state.dictionaries.length, ["словарь", "словаря", "словарей"]);

  if (!state.dictionaries.length) {
    elements.dictionaryList.className = "dictionary-list empty-state";
    elements.dictionaryList.textContent = "Пока нет словарей. Добавьте первый JSON справа.";
    return;
  }

  elements.dictionaryList.className = "dictionary-list";
  elements.dictionaryList.innerHTML = "";

  state.dictionaries.forEach((dictionary) => {
    const fragment = elements.dictionaryTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".dictionary-card");
    const title = fragment.querySelector(".dictionary-card__title");
    const meta = fragment.querySelector(".dictionary-card__meta");
    const preview = fragment.querySelector(".dictionary-card__preview");
    const toggle = fragment.querySelector(".dictionary-toggle");
    const expandButton = fragment.querySelector(".dictionary-expand-button");
    const deleteButton = fragment.querySelector(".dictionary-delete-button");

    title.textContent = dictionary.name;
    meta.textContent = `${Object.keys(dictionary.mapping).length} ${pluralize(Object.keys(dictionary.mapping).length, ["замена", "замены", "замен"])}`;
    preview.textContent = JSON.stringify(dictionary.mapping, null, 2);
    toggle.checked = dictionary.enabled;
    toggle.addEventListener("change", () => toggleDictionary(dictionary.id, toggle.checked));
    expandButton.addEventListener("click", () => {
      const isHidden = preview.hasAttribute("hidden");
      if (isHidden) {
        preview.removeAttribute("hidden");
        expandButton.textContent = "Скрыть JSON";
      } else {
        preview.setAttribute("hidden", "");
        expandButton.textContent = "Показать JSON";
      }
    });
    deleteButton.addEventListener("click", () => deleteDictionary(dictionary.id));

    if (!dictionary.enabled) {
      card.style.opacity = "0.62";
    }

    elements.dictionaryList.appendChild(fragment);
  });
}

function renderResults() {
  const displayedExamples = getDisplayedExamples();
  elements.exampleCount.textContent = formatWordCount(state.examples.length, ["пример", "примера", "примеров"]);

  if (!displayedExamples.length) {
    elements.resultsBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Примеры пока не добавлены.</td>
      </tr>
    `;
    return;
  }

  const activeDictionaries = state.dictionaries.filter((dictionary) => dictionary.enabled);
  const rows = [];

  displayedExamples.forEach((example, index) => {
    const originalBytes = getUtf8ByteLength(example.text);
    const sectionRows = [
      buildResultRow({
        orderNumber: index + 1,
        label: "Ориг",
        text: example.text,
        originalBytes,
        isOriginal: true,
      }),
      ...activeDictionaries.map((dictionary) =>
        buildResultRow({
          orderNumber: index + 1,
          label: dictionary.name,
          text: applyDictionary(example.text, dictionary.mapping),
          originalBytes,
          isOriginal: false,
        })
      ),
    ];
    const meshRows = buildMeshResultRows(example.text, originalBytes, index + 1);
    if (meshRows.length) {
      sectionRows.push(...meshRows);
    }
    const lzwRow = buildLzwResultRow(example.text, originalBytes, index + 1);
    if (lzwRow) {
      sectionRows.push(lzwRow);
    }

    sectionRows.forEach((row, rowIndex) => {
      rows.push(`
        <tr class="${rowIndex === 0 ? "section-start" : ""}">
          ${rowIndex === 0 ? `<td class="section-index" rowspan="${sectionRows.length}">
            <div class="section-index__content">
              <span>${row.orderNumber}</span>
              <button class="icon-button" type="button" title="Удалить" aria-label="Удалить пример" data-delete-example-id="${escapeHtml(example.id)}">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"></path>
                </svg>
              </button>
            </div>
          </td>` : ""}
          <td class="${row.isOriginal ? "label-original" : ""}">${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.text)}</td>
          <td>${row.byteSize}</td>
          <td class="${row.metricClass}">${row.diffLabel}</td>
          <td class="${row.metricClass}">${row.percentLabel}</td>
        </tr>
      `);
    });
  });

  elements.resultsBody.innerHTML = rows.join("");
}

function buildResultRow({ orderNumber, label, text, originalBytes, isOriginal }) {
  const byteSize = getUtf8ByteLength(text);
  const diff = byteSize - originalBytes;
  const percent = originalBytes === 0 ? 0 : Math.round((diff / originalBytes) * 100);

  return {
    orderNumber,
    label,
    text,
    byteSize,
    isOriginal,
    diffLabel: isOriginal ? "" : formatSignedNumber(diff),
    percentLabel: isOriginal ? "" : `${formatSignedNumber(percent)}%`,
    metricClass: isOriginal ? "metric-neutral" : diff < 0 ? "metric-good" : diff > 0 ? "metric-bad" : "metric-neutral",
  };
}

function buildMeshResultRows(sourceText, originalBytes, orderNumber) {
  if (!state.settings.meshEnabled) {
    return [];
  }

  if (!meshModel || typeof compress === "undefined") {
    return [buildCompressedResultRow({
      orderNumber,
      label: MESH_METHOD_LABEL,
      text: "Модель mesh-compressor не загружена",
      byteSize: 0,
      originalBytes,
    })];
  }

  try {
    const compressed = compress(sourceText, meshModel);
    meshModel.clearCache();
    const base91Text = typeof compressText === "undefined" ? "" : compressText(sourceText, meshModel);
    meshModel.clearCache();

    const rows = [
      buildCompressedResultRow({
        orderNumber,
        label: `${MESH_METHOD_LABEL} binary`,
        text: bytesToHex(compressed),
        byteSize: compressed.length,
        originalBytes,
      }),
    ];

    if (base91Text) {
      rows.push(
        buildCompressedResultRow({
          orderNumber,
          label: `${MESH_METHOD_LABEL} base91`,
          text: base91Text,
          byteSize: getUtf8ByteLength(base91Text),
          originalBytes,
        })
      );
    }

    return rows;
  } catch (error) {
    return [buildCompressedResultRow({
      orderNumber,
      label: MESH_METHOD_LABEL,
      text: `Ошибка сжатия: ${error.message}`,
      byteSize: 0,
      originalBytes,
    })];
  }
}

function buildCompressedResultRow({ orderNumber, label, text, byteSize, originalBytes }) {
  const diff = byteSize - originalBytes;
  const percent = originalBytes === 0 ? 0 : Math.round((diff / originalBytes) * 100);

  return {
    orderNumber,
    label,
    text,
    byteSize,
    isOriginal: false,
    diffLabel: formatSignedNumber(diff),
    percentLabel: `${formatSignedNumber(percent)}%`,
    metricClass: diff < 0 ? "metric-good" : diff > 0 ? "metric-bad" : "metric-neutral",
  };
}

function buildLzwResultRow(sourceText, originalBytes, orderNumber) {
  if (!state.settings.lzwEnabled) {
    return null;
  }

  if (!window.lzwCompressionHelper) {
    return buildCompressedResultRow({
      orderNumber,
      label: LZW_METHOD_LABEL,
      text: "Хелпер lzwCompress.js не загружен",
      byteSize: 0,
      originalBytes,
    });
  }

  try {
    const compressed = window.lzwCompressionHelper.compressText(sourceText);

    return buildCompressedResultRow({
      orderNumber,
      label: LZW_METHOD_LABEL,
      text: compressed.display,
      byteSize: compressed.byteSize,
      originalBytes,
    });
  } catch (error) {
    return buildCompressedResultRow({
      orderNumber,
      label: LZW_METHOD_LABEL,
      text: `Ошибка сжатия: ${error.message}`,
      byteSize: 0,
      originalBytes,
    });
  }
}

function getDisplayedExamples() {
  const copy = [...state.examples];
  return state.settings.sortDirection === "desc" ? copy.reverse() : copy;
}

function applyDictionary(sourceText, mapping) {
  let result = sourceText;

  Object.entries(mapping).forEach(([searchValue, replacementValue]) => {
    if (!searchValue) {
      return;
    }

    result = result.split(searchValue).join(replacementValue);
  });

  return result;
}

function initMeshCompressor() {
  if (typeof NGramModel === "undefined" || !window.MESH_COMPRESSOR_MODEL_DATA) {
    return;
  }

  try {
    meshModel = NGramModel.fromJSON(window.MESH_COMPRESSOR_MODEL_DATA);
  } catch (error) {
    meshModel = null;
  }
}

function updateInputStats() {
  const value = elements.sourceInput.value;
  const charCount = [...value].length;
  const byteCount = getUtf8ByteLength(value);
  const limit = getByteLimit();

  elements.charCounter.textContent = String(charCount);
  elements.byteCounter.textContent = String(byteCount);
  elements.limitStatus.textContent = limit ? `Лимит: ${limit} байт` : "Лимит: не задан";
}

function getByteLimit() {
  const rawLimit = state.settings.byteLimit;
  return rawLimit ? Number(rawLimit) : 0;
}

function getUtf8ByteLength(text) {
  return encoder.encode(text).length;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function insertAtCursor(textarea, text) {
  const { selectionStart, selectionEnd, value } = textarea;
  const nextValue = value.slice(0, selectionStart) + text + value.slice(selectionEnd);

  if (getByteLimit() && getUtf8ByteLength(nextValue) > getByteLimit()) {
    return;
  }

  textarea.value = nextValue;
  const nextPosition = selectionStart + text.length;
  textarea.setSelectionRange(nextPosition, nextPosition);
  lastValidInput = nextValue;
}

function persistExamples() {
  localStorage.setItem(STORAGE_KEYS.examples, JSON.stringify(state.examples));
}

function persistDictionaries() {
  localStorage.setItem(STORAGE_KEYS.dictionaries, JSON.stringify(state.dictionaries));
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function seedDefaultDictionaries() {
  if (state.dictionaries.length) {
    return;
  }

  state.dictionaries = DEFAULT_DICTIONARIES.map((dictionary) =>
    normalizeDictionary({
      ...dictionary,
      createdAt: Date.now(),
    })
  );
  persistDictionaries();
}

function loadJson(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function normalizeDictionary(dictionary) {
  return {
    id: dictionary.id || crypto.randomUUID(),
    name: dictionary.name,
    enabled: dictionary.enabled ?? true,
    mapping: dictionary.mapping,
    createdAt: dictionary.createdAt || Date.now(),
  };
}

function pluralize(count, forms) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms[1];
  }
  return forms[2];
}

function formatWordCount(count, forms) {
  return `${count} ${pluralize(count, forms)}`;
}

function formatSignedNumber(value) {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
