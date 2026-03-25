const STORAGE_KEY = "naruto-kayou-card-archive-v1";

const SAMPLE_CARDS = [
  {
    id: crypto.randomUUID(),
    title: "Six Paths Naruto",
    character: "Naruto Uzumaki",
    set: "Tier 4 Wave 2",
    number: "MR-001",
    language: "Japanese",
    rarity: "Secret Rare",
    condition: "Near Mint",
    copies: 1,
    acquisitionDate: "2026-01-18",
    image: "",
    notes: "Sleeved in premium binder. Great foil pop under natural light.",
    createdAt: Date.now() - 300000
  },
  {
    id: crypto.randomUUID(),
    title: "Mangekyo Clash",
    character: "Sasuke Uchiha",
    set: "Tier 3 Wave 5",
    number: "UR-017",
    language: "Chinese",
    rarity: "Ultra Rare",
    condition: "Mint",
    copies: 2,
    acquisitionDate: "2026-02-05",
    image: "",
    notes: "One for binder, one for trade stock.",
    createdAt: Date.now() - 200000
  },
  {
    id: crypto.randomUUID(),
    title: "Team 7 Reunion",
    character: "Naruto, Sasuke, Sakura",
    set: "English Debut Set",
    number: "SR-009",
    language: "English",
    rarity: "Super Rare",
    condition: "Near Mint",
    copies: 1,
    acquisitionDate: "2026-03-02",
    image: "",
    notes: "Good reference card for future English set tracking.",
    createdAt: Date.now() - 100000
  }
];

const rarityRank = {
  "Collector Rare": 6,
  "Secret Rare": 5,
  "Ultra Rare": 4,
  "Super Rare": 3,
  Rare: 2,
  Common: 1
};

const elements = {
  form: document.querySelector("#card-form"),
  cardId: document.querySelector("#card-id"),
  title: document.querySelector("#card-title"),
  character: document.querySelector("#card-character"),
  set: document.querySelector("#card-set"),
  number: document.querySelector("#card-number"),
  language: document.querySelector("#card-language"),
  rarity: document.querySelector("#card-rarity"),
  condition: document.querySelector("#card-condition"),
  copies: document.querySelector("#card-copies"),
  date: document.querySelector("#card-date"),
  image: document.querySelector("#card-image"),
  notes: document.querySelector("#card-notes"),
  search: document.querySelector("#search-input"),
  filterLanguage: document.querySelector("#filter-language"),
  filterRarity: document.querySelector("#filter-rarity"),
  sort: document.querySelector("#sort-select"),
  grid: document.querySelector("#collection-grid"),
  template: document.querySelector("#card-template"),
  uniqueCount: document.querySelector("#unique-count"),
  copyCount: document.querySelector("#copy-count"),
  jpCount: document.querySelector("#jp-count"),
  cnCount: document.querySelector("#cn-count"),
  enCount: document.querySelector("#en-count"),
  resultsCount: document.querySelector("#results-count"),
  saveButton: document.querySelector("#save-button"),
  resetButton: document.querySelector("#reset-button"),
  exportButton: document.querySelector("#export-button"),
  importFile: document.querySelector("#import-file"),
  loadSampleButton: document.querySelector("#load-sample-button")
};

let cards = loadCards();
render();

elements.form.addEventListener("submit", handleSubmit);
elements.resetButton.addEventListener("click", resetForm);
elements.search.addEventListener("input", render);
elements.filterLanguage.addEventListener("change", render);
elements.filterRarity.addEventListener("change", render);
elements.sort.addEventListener("change", render);
elements.exportButton.addEventListener("click", exportCards);
elements.importFile.addEventListener("change", importCards);
elements.loadSampleButton.addEventListener("click", loadSampleCards);
elements.grid.addEventListener("click", handleGridClick);

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to load saved cards", error);
    return [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function handleSubmit(event) {
  event.preventDefault();

  const card = {
    id: elements.cardId.value || crypto.randomUUID(),
    title: elements.title.value.trim(),
    character: elements.character.value.trim(),
    set: elements.set.value.trim(),
    number: elements.number.value.trim(),
    language: elements.language.value,
    rarity: elements.rarity.value,
    condition: elements.condition.value,
    copies: Number(elements.copies.value) || 1,
    acquisitionDate: elements.date.value,
    image: elements.image.value.trim(),
    notes: elements.notes.value.trim(),
    createdAt: elements.cardId.value ? findCreatedAt(elements.cardId.value) : Date.now()
  };

  if (!card.title || !card.character || !card.set) {
    return;
  }

  const existingIndex = cards.findIndex((entry) => entry.id === card.id);
  if (existingIndex >= 0) {
    cards[existingIndex] = card;
  } else {
    cards.unshift(card);
  }

  saveCards();
  resetForm();
  render();
}

function handleGridClick(event) {
  const editButton = event.target.closest(".edit-button");
  const deleteButton = event.target.closest(".delete-button");
  const cardElement = event.target.closest(".collection-card");

  if (!cardElement) {
    return;
  }

  const { id } = cardElement.dataset;
  const card = cards.find((entry) => entry.id === id);
  if (!card) {
    return;
  }

  if (editButton) {
    populateForm(card);
  }

  if (deleteButton) {
    const confirmed = window.confirm(`Delete "${card.title}" from your archive?`);
    if (!confirmed) {
      return;
    }

    cards = cards.filter((entry) => entry.id !== id);
    saveCards();
    resetForm();
    render();
  }
}

function populateForm(card) {
  elements.cardId.value = card.id;
  elements.title.value = card.title;
  elements.character.value = card.character;
  elements.set.value = card.set;
  elements.number.value = card.number;
  elements.language.value = card.language;
  elements.rarity.value = card.rarity;
  elements.condition.value = card.condition;
  elements.copies.value = card.copies;
  elements.date.value = card.acquisitionDate || "";
  elements.image.value = card.image || "";
  elements.notes.value = card.notes || "";
  elements.saveButton.textContent = "Update card";
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  elements.form.reset();
  elements.cardId.value = "";
  elements.language.value = "Japanese";
  elements.rarity.value = "Common";
  elements.condition.value = "Mint";
  elements.copies.value = 1;
  elements.saveButton.textContent = "Save card";
}

function render() {
  const visibleCards = sortCards(filterCards(cards));
  renderStats(cards);
  renderGrid(visibleCards);
  elements.resultsCount.textContent = `${visibleCards.length} card${visibleCards.length === 1 ? "" : "s"} shown`;
}

function filterCards(source) {
  const search = elements.search.value.trim().toLowerCase();
  const language = elements.filterLanguage.value;
  const rarity = elements.filterRarity.value;

  return source.filter((card) => {
    const searchTarget = [
      card.title,
      card.character,
      card.set,
      card.number,
      card.language,
      card.rarity,
      card.notes
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchTarget.includes(search);
    const matchesLanguage = language === "All" || card.language === language;
    const matchesRarity = rarity === "All" || card.rarity === rarity;

    return matchesSearch && matchesLanguage && matchesRarity;
  });
}

function sortCards(source) {
  const sortMode = elements.sort.value;
  const copy = [...source];

  copy.sort((left, right) => {
    if (sortMode === "oldest") {
      return (left.createdAt || 0) - (right.createdAt || 0);
    }

    if (sortMode === "title") {
      return left.title.localeCompare(right.title);
    }

    if (sortMode === "character") {
      return left.character.localeCompare(right.character);
    }

    if (sortMode === "rarity") {
      return (rarityRank[right.rarity] || 0) - (rarityRank[left.rarity] || 0);
    }

    return (right.createdAt || 0) - (left.createdAt || 0);
  });

  return copy;
}

function renderStats(source) {
  const languageCounts = {
    Japanese: 0,
    Chinese: 0,
    English: 0
  };

  let totalCopies = 0;

  source.forEach((card) => {
    totalCopies += Number(card.copies) || 0;
    languageCounts[normalizeLanguage(card.language)] += 1;
  });

  elements.uniqueCount.textContent = String(source.length);
  elements.copyCount.textContent = String(totalCopies);
  elements.jpCount.textContent = String(languageCounts.Japanese);
  elements.cnCount.textContent = String(languageCounts.Chinese);
  elements.enCount.textContent = String(languageCounts.English);
}

function renderGrid(source) {
  elements.grid.innerHTML = "";

  if (!source.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <h3>Your archive is ready</h3>
      <p>Add your first Naruto Kayou card or load the starter sample to see the layout in action.</p>
    `;
    elements.grid.append(emptyState);
    return;
  }

  source.forEach((card) => {
    const fragment = elements.template.content.cloneNode(true);
    const article = fragment.querySelector(".collection-card");
    const imageWrap = fragment.querySelector(".card-image-wrap");
    const image = fragment.querySelector(".card-image");
    const languagePill = fragment.querySelector(".language-pill");

    article.dataset.id = card.id;
    languagePill.textContent = card.language;
    languagePill.classList.add(languageClass(card.language));

    fragment.querySelector(".rarity-pill").textContent = card.rarity;
    fragment.querySelector(".card-title").textContent = card.title;
    fragment.querySelector(".card-character").textContent = card.character;
    fragment.querySelector(".detail-set").textContent = card.set || "Unknown";
    fragment.querySelector(".detail-number").textContent = card.number || "Unlisted";
    fragment.querySelector(".detail-condition").textContent = card.condition || "Unknown";
    fragment.querySelector(".detail-copies").textContent = String(card.copies || 0);
    fragment.querySelector(".detail-date").textContent = formatDate(card.acquisitionDate);
    fragment.querySelector(".card-notes").textContent = card.notes || "";
    image.alt = `${card.title} ${card.language} card`;

    if (card.image) {
      image.src = card.image;
      image.addEventListener("error", () => {
        imageWrap.classList.add("no-image");
      });
    } else {
      imageWrap.classList.add("no-image");
    }

    elements.grid.append(fragment);
  });
}

function exportCards() {
  const payload = JSON.stringify(cards, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "naruto-kayou-collection.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importCards(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) {
        throw new Error("Imported file must contain an array of cards.");
      }

      cards = parsed.map(normalizeImportedCard);
      saveCards();
      resetForm();
      render();
    } catch (error) {
      window.alert("That JSON file could not be imported.");
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function normalizeImportedCard(card) {
  return {
    id: card.id || crypto.randomUUID(),
    title: String(card.title || "").trim(),
    character: String(card.character || "").trim(),
    set: String(card.set || "").trim(),
    number: String(card.number || "").trim(),
    language: normalizeLanguage(card.language),
    rarity: String(card.rarity || "Common"),
    condition: String(card.condition || "Mint"),
    copies: Number(card.copies) > 0 ? Number(card.copies) : 1,
    acquisitionDate: String(card.acquisitionDate || ""),
    image: String(card.image || "").trim(),
    notes: String(card.notes || "").trim(),
    createdAt: Number(card.createdAt) || Date.now()
  };
}

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value === "japanese") {
    return "Japanese";
  }

  if (value === "chinese") {
    return "Chinese";
  }

  if (value === "english") {
    return "English";
  }

  return "Japanese";
}

function loadSampleCards() {
  const existingKeys = new Set(cards.map((card) => sampleKey(card)));
  const incomingSamples = SAMPLE_CARDS
    .filter((card) => !existingKeys.has(sampleKey(card)))
    .map((card) => ({ ...card, id: crypto.randomUUID(), createdAt: Date.now() + Math.random() }));

  if (!incomingSamples.length) {
    window.alert("The starter sample cards are already in your archive.");
    return;
  }

  cards = [...incomingSamples, ...cards];
  saveCards();
  resetForm();
  render();
}

function languageClass(language) {
  if (language === "Chinese") {
    return "cn";
  }

  if (language === "English") {
    return "en";
  }

  return "jp";
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function findCreatedAt(id) {
  return cards.find((card) => card.id === id)?.createdAt || Date.now();
}

function sampleKey(card) {
  return `${card.title}::${normalizeLanguage(card.language)}::${card.number}`;
}
