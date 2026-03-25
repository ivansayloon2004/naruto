const LEGACY_STORAGE_KEY = "naruto-kayou-card-archive-v1";
const SUPABASE_TABLE = "kayou_cards";

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
  authForm: document.querySelector("#auth-form"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authSubmitButton: document.querySelector("#auth-submit-button"),
  authFeedback: document.querySelector("#auth-feedback"),
  authNote: document.querySelector("#auth-note"),
  setupBanner: document.querySelector("#setup-banner"),
  publicNote: document.querySelector("#public-note"),
  ownerBadge: document.querySelector("#owner-badge"),
  ownerToolbar: document.querySelector("#owner-toolbar"),
  refreshButton: document.querySelector("#refresh-button"),
  migrateLocalButton: document.querySelector("#migrate-local-button"),
  managerShell: document.querySelector("#manager-shell"),
  logoutButton: document.querySelector("#logout-button"),
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
  photoInput: document.querySelector("#card-photo-input"),
  photoPreviewWrap: document.querySelector("#card-photo-preview-wrap"),
  photoPreview: document.querySelector("#card-photo-preview"),
  photoPlaceholder: document.querySelector("#card-photo-placeholder"),
  photoNote: document.querySelector("#card-photo-note"),
  removePhotoButton: document.querySelector("#remove-photo-button"),
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

const config = window.SUPABASE_CONFIG || {};
const hasSupabaseClient = Boolean(window.supabase && typeof window.supabase.createClient === "function");
const hasSupabaseConfig = Boolean(config.url && config.anonKey && hasSupabaseClient);
const supabase = hasSupabaseConfig
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;

let cards = [];
let legacyCards = loadLegacyCards();
let currentOwner = null;
let currentCardImage = "";

bindEventListeners();
updatePhotoPreview("", "No photo selected. On phones, this can open the camera. On desktop, it lets you choose an image file.");
initializeApp();

function bindEventListeners() {
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.refreshButton.addEventListener("click", () => {
    void loadSharedCards();
  });
  elements.migrateLocalButton.addEventListener("click", () => {
    void publishLegacyCards();
  });
  elements.logoutButton.addEventListener("click", () => {
    void handleLogout();
  });
  elements.form.addEventListener("submit", handleSubmit);
  elements.resetButton.addEventListener("click", resetForm);
  elements.photoInput.addEventListener("change", handlePhotoChange);
  elements.removePhotoButton.addEventListener("click", clearSelectedPhoto);
  elements.search.addEventListener("input", render);
  elements.filterLanguage.addEventListener("change", render);
  elements.filterRarity.addEventListener("change", render);
  elements.sort.addEventListener("change", render);
  elements.exportButton.addEventListener("click", exportCards);
  elements.importFile.addEventListener("change", importCards);
  elements.loadSampleButton.addEventListener("click", () => {
    void loadSampleCards();
  });
  elements.grid.addEventListener("click", (event) => {
    void handleGridClick(event);
  });
}

async function initializeApp() {
  elements.authSubmitButton.disabled = !supabase;
  updateOwnerUI();
  render();

  if (!supabase) {
    elements.setupBanner.hidden = false;
    cards = legacyCards;
    setAuthFeedback(
      "Supabase is not configured yet. The page is only showing browser-local records on this device until shared storage is connected.",
      true
    );
    render();
    return;
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    currentOwner = session?.user || null;
    updateOwnerUI();
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Unable to restore owner session", error);
  }

  currentOwner = data?.session?.user || null;
  updateOwnerUI();
  await loadSharedCards();
}

async function loadSharedCards() {
  if (!supabase) {
    cards = legacyCards;
    render();
    return;
  }

  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load shared archive", error);
    if (!cards.length && legacyCards.length) {
      cards = legacyCards;
    }
    setAuthFeedback(
      "The shared archive could not be loaded. Confirm the Supabase table, policies, and config values.",
      true
    );
    render();
    return;
  }

  cards = (data || []).map(mapRowToCard);
  if (!currentOwner) {
    setAuthFeedback("");
  }
  render();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    setAuthFeedback("Add your Supabase project values in supabase-config.js before signing in.", true);
    return;
  }

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    setAuthFeedback("Enter the owner email and password to continue.", true);
    return;
  }

  setAuthFeedback("Authorizing owner access...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setAuthFeedback(error.message, true);
    return;
  }

  currentOwner = data?.user || data?.session?.user || null;
  elements.authForm.reset();
  updateOwnerUI();
  setAuthFeedback("Owner access granted. Management tools are now available.");
  await loadSharedCards();
}

async function handleLogout() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    setAuthFeedback(error.message, true);
    return;
  }

  currentOwner = null;
  updateOwnerUI();
  setAuthFeedback("Signed out. The archive remains visible to all visitors.");
}

function updateOwnerUI() {
  const ownerActive = Boolean(currentOwner);

  document.body.classList.toggle("owner-mode", ownerActive);
  document.body.classList.toggle("viewer-mode", !ownerActive);

  elements.ownerToolbar.hidden = !ownerActive;
  elements.managerShell.hidden = !ownerActive;
  elements.loadSampleButton.hidden = !ownerActive;
  elements.authForm.hidden = ownerActive;
  elements.publicNote.hidden = ownerActive;
  elements.setupBanner.hidden = Boolean(supabase);
  elements.migrateLocalButton.hidden = !ownerActive || !legacyCards.length;

  elements.ownerBadge.textContent = ownerActive
    ? `Owner session: ${currentOwner.email || "Authenticated owner"}`
    : "Public archive online";

  elements.authNote.textContent = ownerActive
    ? `Signed in as ${currentOwner.email}. Any changes you save here publish to the shared archive for all visitors.`
    : "Owner access uses Supabase Auth. Public visitors can browse the archive without signing in.";

  if (!ownerActive) {
    resetForm();
  }

  render();
}

async function handlePhotoChange(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    updatePhotoPreview("", "Select an image file to continue.");
    event.target.value = "";
    return;
  }

  try {
    elements.photoNote.textContent = "Preparing card photo...";
    const imageData = await resizeImageFile(file);
    currentCardImage = imageData;
    updatePhotoPreview(currentCardImage, `Photo ready: ${file.name}`);
  } catch (error) {
    console.error("Unable to process selected photo", error);
    updatePhotoPreview("", "That photo could not be processed. Try another image.");
  } finally {
    event.target.value = "";
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!currentOwner || !supabase) {
    setAuthFeedback("Sign in as the owner before publishing changes.", true);
    return;
  }

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
    image: currentCardImage,
    notes: elements.notes.value.trim(),
    createdAt: elements.cardId.value ? findCreatedAt(elements.cardId.value) : Date.now()
  };

  if (!card.title || !card.character || !card.set) {
    setAuthFeedback("Complete the title, character, and set fields before saving.", true);
    return;
  }

  const payload = toDatabasePayload(card, currentOwner.id);
  let error;

  if (elements.cardId.value) {
    ({ error } = await supabase
      .from(SUPABASE_TABLE)
      .update(payload)
      .eq("id", card.id));
  } else {
    ({ error } = await supabase
      .from(SUPABASE_TABLE)
      .insert(payload));
  }

  if (error) {
    console.error("Unable to save card", error);
    setAuthFeedback(error.message, true);
    return;
  }

  setAuthFeedback("Shared archive updated successfully.");
  resetForm();
  await loadSharedCards();
}

async function handleGridClick(event) {
  if (!currentOwner || !supabase) {
    return;
  }

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
    const confirmed = window.confirm(`Delete "${card.title}" from the shared archive?`);
    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Unable to delete card", error);
      setAuthFeedback(error.message, true);
      return;
    }

    setAuthFeedback("Record removed from the shared archive.");
    resetForm();
    await loadSharedCards();
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
  currentCardImage = card.image || "";
  updatePhotoPreview(currentCardImage, currentCardImage ? "Saved card photo loaded." : "No photo selected.");
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
  clearSelectedPhoto();
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
      <h3>The archive is ready</h3>
      <p>${supabase ? "No shared records are published yet." : "Configure Supabase or publish records to begin."}</p>
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
    const actions = fragment.querySelector(".card-actions");

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

    actions.hidden = !currentOwner;
    elements.grid.append(fragment);
  });
}

function exportCards() {
  if (!currentOwner) {
    setAuthFeedback("Sign in as the owner before exporting the archive.", true);
    return;
  }

  const payload = JSON.stringify(cards, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "naruto-kayou-collection.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importCards(event) {
  if (!currentOwner || !supabase) {
    event.target.value = "";
    setAuthFeedback("Sign in as the owner before importing records.", true);
    return;
  }

  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) {
        throw new Error("Imported file must contain an array of cards.");
      }

      const importedCards = parsed.map(normalizeImportedCard);
      const payload = importedCards.map((card) => toDatabasePayload(card, currentOwner.id));
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert(payload, { onConflict: "id" });

      if (error) {
        throw error;
      }

      setAuthFeedback("Archive import complete. Shared records were updated.");
      await loadSharedCards();
    } catch (error) {
      console.error(error);
      window.alert("That JSON file could not be imported into the shared archive.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

async function loadSampleCards() {
  if (!currentOwner || !supabase) {
    setAuthFeedback("Sign in as the owner before publishing sample records.", true);
    return;
  }

  const existingKeys = new Set(cards.map((card) => archiveKey(card)));
  const incomingSamples = SAMPLE_CARDS.filter((card) => !existingKeys.has(archiveKey(card)));

  if (!incomingSamples.length) {
    window.alert("The sample records are already in the shared archive.");
    return;
  }

  const payload = incomingSamples.map((card) => toDatabasePayload(card, currentOwner.id));
  const { error } = await supabase
    .from(SUPABASE_TABLE)
    .insert(payload);

  if (error) {
    console.error("Unable to load sample records", error);
    setAuthFeedback(error.message, true);
    return;
  }

  setAuthFeedback("Sample records published to the shared archive.");
  await loadSharedCards();
}

async function publishLegacyCards() {
  if (!currentOwner || !supabase || !legacyCards.length) {
    return;
  }

  const confirmed = window.confirm(
    `Publish ${legacyCards.length} browser-local card record${legacyCards.length === 1 ? "" : "s"} to the shared archive?`
  );

  if (!confirmed) {
    return;
  }

  const existingKeys = new Set(cards.map((card) => archiveKey(card)));
  const cardsToPublish = legacyCards.filter((card) => !existingKeys.has(archiveKey(card)));

  if (!cardsToPublish.length) {
    setAuthFeedback("Your browser-local archive is already represented in the shared collection.");
    return;
  }

  const payload = cardsToPublish.map((card) => toDatabasePayload(card, currentOwner.id));
  const { error } = await supabase
    .from(SUPABASE_TABLE)
    .insert(payload);

  if (error) {
    console.error("Unable to publish browser-local archive", error);
    setAuthFeedback(error.message, true);
    return;
  }

  setAuthFeedback("Browser-local records published to the shared archive.");
  await loadSharedCards();
}

function setAuthFeedback(message, isError = false) {
  elements.authFeedback.textContent = message;
  elements.authFeedback.classList.toggle("is-error", isError);
}

function loadLegacyCards() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeImportedCard);
  } catch (error) {
    console.error("Unable to load browser-local archive", error);
    return [];
  }
}

function normalizeImportedCard(card) {
  return {
    id: card.id || crypto.randomUUID(),
    title: String(card.title || "").trim(),
    character: String(card.character || "").trim(),
    set: String(card.set || card.set_name || "").trim(),
    number: String(card.number || card.card_number || "").trim(),
    language: normalizeLanguage(card.language),
    rarity: String(card.rarity || "Common"),
    condition: String(card.condition || "Mint"),
    copies: Number(card.copies) > 0 ? Number(card.copies) : 1,
    acquisitionDate: String(card.acquisitionDate || card.acquisition_date || ""),
    image: String(card.image || card.image_data || "").trim(),
    notes: String(card.notes || "").trim(),
    createdAt: Number(card.createdAt) || Date.now()
  };
}

function mapRowToCard(row) {
  return {
    id: row.id,
    title: row.title,
    character: row.character,
    set: row.set_name || "",
    number: row.card_number || "",
    language: normalizeLanguage(row.language),
    rarity: row.rarity || "Common",
    condition: row.condition || "Mint",
    copies: Number(row.copies) || 1,
    acquisitionDate: row.acquisition_date || "",
    image: row.image_data || "",
    notes: row.notes || "",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now()
  };
}

function toDatabasePayload(card, ownerId) {
  const payload = {
    id: card.id || crypto.randomUUID(),
    title: card.title,
    character: card.character,
    set_name: card.set,
    card_number: card.number || null,
    language: normalizeLanguage(card.language),
    rarity: card.rarity,
    condition: card.condition || null,
    copies: Number(card.copies) || 1,
    acquisition_date: card.acquisitionDate || null,
    image_data: card.image || null,
    notes: card.notes || null,
    owner_user_id: ownerId
  };

  if (card.createdAt) {
    payload.created_at = new Date(card.createdAt).toISOString();
  }

  return payload;
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

function archiveKey(card) {
  return `${card.title}::${normalizeLanguage(card.language)}::${card.number}::${card.set}`;
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

function clearSelectedPhoto() {
  currentCardImage = "";
  updatePhotoPreview("", "No photo selected. On phones, this can open the camera. On desktop, it lets you choose an image file.");
}

function updatePhotoPreview(imageData, message) {
  if (imageData) {
    elements.photoPreview.src = imageData;
    elements.photoPreview.hidden = false;
    elements.photoPreviewWrap.classList.remove("is-empty");
    elements.photoPlaceholder.hidden = true;
  } else {
    elements.photoPreview.removeAttribute("src");
    elements.photoPreview.hidden = true;
    elements.photoPreviewWrap.classList.add("is-empty");
    elements.photoPlaceholder.hidden = false;
  }

  elements.photoNote.textContent = message;
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas is not available."));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("Selected file could not be read as an image."));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Selected file could not be read."));
    reader.readAsDataURL(file);
  });
}
