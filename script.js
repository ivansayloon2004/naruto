const LEGACY_STORAGE_KEY = "naruto-kayou-card-archive-v1";
const SUPABASE_TABLE = "kayou_cards";
const SUPABASE_SET_TABLE = "kayou_set_targets";
const CARD_STATUSES = ["Owned", "Wishlist", "For Trade"];
const PHYSICAL_CARD_STATUSES = new Set(["Owned", "For Trade"]);

const SAMPLE_CARDS = [
  {
    id: crypto.randomUUID(),
    ownerName: "Archive Owner",
    title: "Six Paths Naruto",
    character: "Naruto Uzumaki",
    set: "Tier 4 Wave 2",
    number: "MR-001",
    language: "Japanese",
    status: "Owned",
    rarity: "Secret Rare",
    condition: "Near Mint",
    copies: 1,
    acquisitionDate: "2026-01-18",
    purchasePrice: 185,
    estimatedValue: 240,
    tradeContact: "",
    image: "",
    notes: "Sleeved in premium binder. Great foil pop under natural light.",
    createdAt: Date.now() - 300000
  },
  {
    id: crypto.randomUUID(),
    ownerName: "Archive Owner",
    title: "Mangekyo Clash",
    character: "Sasuke Uchiha",
    set: "Tier 3 Wave 5",
    number: "UR-017",
    language: "Chinese",
    status: "For Trade",
    rarity: "Ultra Rare",
    condition: "Mint",
    copies: 2,
    acquisitionDate: "2026-02-05",
    purchasePrice: 120,
    estimatedValue: 165,
    tradeContact: "ivansayloon2004@example.com",
    image: "",
    notes: "One for binder, one for trade stock.",
    createdAt: Date.now() - 200000
  },
  {
    id: crypto.randomUUID(),
    ownerName: "Archive Owner",
    title: "Team 7 Reunion",
    character: "Naruto, Sasuke, Sakura",
    set: "English Debut Set",
    number: "SR-009",
    language: "English",
    status: "Wishlist",
    rarity: "Super Rare",
    condition: "Near Mint",
    copies: 1,
    acquisitionDate: "2026-03-02",
    purchasePrice: null,
    estimatedValue: 80,
    tradeContact: "",
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
  guestHeading: document.querySelector("#guest-heading"),
  dashboardHeading: document.querySelector("#dashboard-heading"),
  authShell: document.querySelector("#auth-shell"),
  authForm: document.querySelector("#auth-form"),
  authOwnerName: document.querySelector("#auth-owner-name"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authSubmitButton: document.querySelector("#auth-submit-button"),
  authFeedback: document.querySelector("#auth-feedback"),
  authNote: document.querySelector("#auth-note"),
  setupBanner: document.querySelector("#setup-banner"),
  publicNote: document.querySelector("#public-note"),
  dashboardTools: document.querySelector("#dashboard-tools"),
  ownerBadge: document.querySelector("#owner-badge"),
  ownerToolbar: document.querySelector("#owner-toolbar"),
  refreshButton: document.querySelector("#refresh-button"),
  migrateLocalButton: document.querySelector("#migrate-local-button"),
  managerShell: document.querySelector("#manager-shell"),
  logoutButton: document.querySelector("#logout-button"),
  setTargetForm: document.querySelector("#set-target-form"),
  setTargetId: document.querySelector("#set-target-id"),
  setTargetName: document.querySelector("#set-target-name"),
  setTargetTotal: document.querySelector("#set-target-total"),
  setTargetResetButton: document.querySelector("#set-target-reset-button"),
  setTargetList: document.querySelector("#set-target-list"),
  form: document.querySelector("#card-form"),
  cardId: document.querySelector("#card-id"),
  ownerName: document.querySelector("#card-owner-name"),
  title: document.querySelector("#card-title"),
  character: document.querySelector("#card-character"),
  set: document.querySelector("#card-set"),
  number: document.querySelector("#card-number"),
  language: document.querySelector("#card-language"),
  status: document.querySelector("#card-status"),
  rarity: document.querySelector("#card-rarity"),
  condition: document.querySelector("#card-condition"),
  copies: document.querySelector("#card-copies"),
  date: document.querySelector("#card-date"),
  purchasePrice: document.querySelector("#card-purchase-price"),
  estimatedValue: document.querySelector("#card-estimated-value"),
  tradeContact: document.querySelector("#card-trade-contact"),
  photoInput: document.querySelector("#card-photo-input"),
  photoPreviewWrap: document.querySelector("#card-photo-preview-wrap"),
  photoPreview: document.querySelector("#card-photo-preview"),
  photoPlaceholder: document.querySelector("#card-photo-placeholder"),
  photoNote: document.querySelector("#card-photo-note"),
  removePhotoButton: document.querySelector("#remove-photo-button"),
  notes: document.querySelector("#card-notes"),
  statusTabs: document.querySelector("#status-tabs"),
  search: document.querySelector("#search-input"),
  filterOwner: document.querySelector("#filter-owner"),
  filterLanguage: document.querySelector("#filter-language"),
  filterRarity: document.querySelector("#filter-rarity"),
  sort: document.querySelector("#sort-select"),
  setProgressGrid: document.querySelector("#set-progress-grid"),
  setProgressTemplate: document.querySelector("#set-progress-template"),
  grid: document.querySelector("#collection-grid"),
  template: document.querySelector("#card-template"),
  uniqueCount: document.querySelector("#unique-count"),
  copyCount: document.querySelector("#copy-count"),
  jpCount: document.querySelector("#jp-count"),
  cnCount: document.querySelector("#cn-count"),
  enCount: document.querySelector("#en-count"),
  costBasisTotal: document.querySelector("#cost-basis-total"),
  estimatedTotal: document.querySelector("#estimated-total"),
  valueChangeTotal: document.querySelector("#value-change-total"),
  ownedCount: document.querySelector("#owned-count"),
  wishlistCount: document.querySelector("#wishlist-count"),
  tradeCount: document.querySelector("#trade-count"),
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
let setTargets = [];
let legacyCards = loadLegacyCards();
let currentOwner = null;
let currentCardImage = "";
let selectedStatusFilter = "All";

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
  elements.setTargetForm.addEventListener("submit", (event) => {
    void handleSetTargetSubmit(event);
  });
  elements.setTargetResetButton.addEventListener("click", resetSetTargetForm);
  elements.setTargetList.addEventListener("click", (event) => {
    void handleSetTargetListClick(event);
  });
  elements.form.addEventListener("submit", handleSubmit);
  elements.resetButton.addEventListener("click", resetForm);
  elements.photoInput.addEventListener("change", handlePhotoChange);
  elements.removePhotoButton.addEventListener("click", clearSelectedPhoto);
  elements.statusTabs.addEventListener("click", handleStatusTabClick);
  elements.search.addEventListener("input", render);
  elements.filterOwner.addEventListener("input", render);
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

function handleStatusTabClick(event) {
  const button = event.target.closest(".status-tab");
  if (!button) {
    return;
  }

  const nextStatus = button.dataset.statusFilter;
  if (!CARD_STATUSES.includes(nextStatus) && nextStatus !== "All") {
    return;
  }

  if (nextStatus === selectedStatusFilter) {
    return;
  }

  selectedStatusFilter = nextStatus;
  render();
}

async function initializeApp() {
  elements.authSubmitButton.disabled = !supabase;
  elements.authOwnerName.value = inferOwnerNameFromEmail("");
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
  await Promise.all([loadSharedCards(), loadSetTargets()]);
  updateOwnerUI();
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
  if (currentOwner && !currentOwner.ownerName) {
    currentOwner.ownerName = resolveArchiveOwnerName();
  }
  if (!currentOwner) {
    setAuthFeedback("");
  }
  render();
}

async function loadSetTargets() {
  if (!supabase) {
    setTargets = [];
    render();
    return;
  }

  const { data, error } = await supabase
    .from(SUPABASE_SET_TABLE)
    .select("*")
    .order("set_name", { ascending: true });

  if (error) {
    console.error("Unable to load set tracker targets", error);
    setAuthFeedback(
      "Set tracker targets could not be loaded. Confirm the Supabase setup SQL has been run.",
      true
    );
    render();
    return;
  }

  setTargets = (data || []).map(mapSetTargetRow);
  if (currentOwner && !currentOwner.ownerName) {
    currentOwner.ownerName = resolveArchiveOwnerName();
  }
  render();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    setAuthFeedback("Add your Supabase project values in supabase-config.js before signing in.", true);
    return;
  }

  const ownerName = elements.authOwnerName.value.trim();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!ownerName || !email || !password) {
    setAuthFeedback("Enter the public owner name, owner email, and password to continue.", true);
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
  currentOwner.ownerName = ownerName;
  elements.authForm.reset();
  updateOwnerUI();
  setAuthFeedback("Owner access granted. Management tools are now available.");
  await Promise.all([loadSharedCards(), loadSetTargets()]);
  updateOwnerUI();
  revealOwnerDashboard();
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

  elements.guestHeading.hidden = ownerActive;
  elements.dashboardHeading.hidden = !ownerActive;
  elements.ownerToolbar.hidden = !ownerActive;
  elements.dashboardTools.hidden = !ownerActive;
  elements.managerShell.hidden = !ownerActive;
  elements.loadSampleButton.hidden = !ownerActive;
  elements.authShell.hidden = ownerActive;
  elements.setupBanner.hidden = Boolean(supabase);
  elements.migrateLocalButton.hidden = !ownerActive || !legacyCards.length;

  if (!ownerActive) {
    resetForm();
    resetSetTargetForm();
  } else {
    syncOwnerNameFields(resolveArchiveOwnerName() || currentOwner.ownerName || inferOwnerNameFromEmail(currentOwner.email));
    elements.authForm.reset();
    setAuthFeedback("");
  }

  render();
}

function revealOwnerDashboard() {
  requestAnimationFrame(() => {
    elements.dashboardHeading.scrollIntoView({ behavior: "smooth", block: "start" });

    requestAnimationFrame(() => {
      elements.title.focus({ preventScroll: true });
    });
  });
}

async function handleSetTargetSubmit(event) {
  event.preventDefault();

  if (!currentOwner || !supabase) {
    setAuthFeedback("Sign in as the owner before saving set tracker totals.", true);
    return;
  }

  const setName = elements.setTargetName.value.trim();
  const totalCards = Number(elements.setTargetTotal.value);
  const targetId = elements.setTargetId.value;

  if (!setName || !Number.isFinite(totalCards) || totalCards < 1) {
    setAuthFeedback("Enter the set name and a valid total card count.", true);
    return;
  }

  const payload = toSetTargetPayload({
    id: targetId || crypto.randomUUID(),
    setName,
    totalCards
  }, currentOwner.id);

  let error;

  if (targetId) {
    ({ error } = await supabase
      .from(SUPABASE_SET_TABLE)
      .update(payload)
      .eq("id", targetId));
  } else {
    ({ error } = await supabase
      .from(SUPABASE_SET_TABLE)
      .insert(payload));
  }

  if (error) {
    console.error("Unable to save set target", error);
    setAuthFeedback(error.message, true);
    return;
  }

  setAuthFeedback("Set tracker target saved.");
  resetSetTargetForm();
  await loadSetTargets();
}

async function handleSetTargetListClick(event) {
  if (!currentOwner || !supabase) {
    return;
  }

  const editButton = event.target.closest(".set-target-edit");
  const deleteButton = event.target.closest(".set-target-delete");
  const item = event.target.closest(".set-target-item");

  if (!item) {
    return;
  }

  const { id } = item.dataset;
  const target = setTargets.find((entry) => entry.id === id);
  if (!target) {
    return;
  }

  if (editButton) {
    elements.setTargetId.value = target.id;
    elements.setTargetName.value = target.setName;
    elements.setTargetTotal.value = target.totalCards;
    elements.setTargetName.focus();
  }

  if (deleteButton) {
    const confirmed = window.confirm(`Delete the set tracker target for "${target.setName}"?`);
    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from(SUPABASE_SET_TABLE)
      .delete()
      .eq("id", target.id);

    if (error) {
      console.error("Unable to delete set target", error);
      setAuthFeedback(error.message, true);
      return;
    }

    setAuthFeedback("Set tracker target removed.");
    resetSetTargetForm();
    await loadSetTargets();
  }
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
    ownerName: elements.ownerName.value.trim(),
    title: elements.title.value.trim(),
    character: elements.character.value.trim(),
    set: elements.set.value.trim(),
    number: elements.number.value.trim(),
    language: elements.language.value,
    status: elements.status.value,
    rarity: elements.rarity.value,
    condition: elements.condition.value,
    copies: Number(elements.copies.value) || 1,
    acquisitionDate: elements.date.value,
    purchasePrice: parseOptionalAmount(elements.purchasePrice.value),
    estimatedValue: parseOptionalAmount(elements.estimatedValue.value),
    tradeContact: elements.tradeContact.value.trim(),
    image: currentCardImage,
    notes: elements.notes.value.trim(),
    createdAt: elements.cardId.value ? findCreatedAt(elements.cardId.value) : Date.now()
  };

  if (!card.ownerName || !card.title || !card.character || !card.set) {
    setAuthFeedback("Complete the owner name, title, character, and set fields before saving.", true);
    return;
  }

  if (normalizeCardStatus(card.status) === "For Trade" && !card.tradeContact) {
    setAuthFeedback("Add a public trade contact before publishing a trade listing.", true);
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
  const tradeButton = event.target.closest(".trade-contact-button");
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

  if (tradeButton) {
    await handleTradeContact(card);
    return;
  }

  if (!currentOwner || !supabase) {
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

async function handleTradeContact(card) {
  if (normalizeCardStatus(card.status) !== "For Trade" || !card.tradeContact) {
    return;
  }

  const contactAction = resolveTradeContactAction(card.tradeContact, card.title);
  if (contactAction.kind === "link") {
    window.open(contactAction.href, "_blank", "noopener,noreferrer");
    return;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(contactAction.value);
      window.alert("Trade contact copied to your clipboard.");
      return;
    } catch (error) {
      console.error("Unable to copy trade contact", error);
    }
  }

  window.prompt("Copy this trade contact:", contactAction.value);
}

function populateForm(card) {
  elements.cardId.value = card.id;
  elements.ownerName.value = card.ownerName || "";
  elements.title.value = card.title;
  elements.character.value = card.character;
  elements.set.value = card.set;
  elements.number.value = card.number;
  elements.language.value = card.language;
  elements.status.value = normalizeCardStatus(card.status);
  elements.rarity.value = card.rarity;
  elements.condition.value = card.condition;
  elements.copies.value = card.copies;
  elements.date.value = card.acquisitionDate || "";
  elements.purchasePrice.value = card.purchasePrice ?? "";
  elements.estimatedValue.value = card.estimatedValue ?? "";
  elements.tradeContact.value = card.tradeContact || "";
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
  elements.status.value = "Owned";
  elements.rarity.value = "Common";
  elements.condition.value = "Mint";
  elements.copies.value = 1;
  elements.purchasePrice.value = "";
  elements.estimatedValue.value = "";
  elements.tradeContact.value = "";
  syncOwnerNameFields(resolveArchiveOwnerName() || currentOwner?.ownerName || inferOwnerNameFromEmail(currentOwner?.email));
  clearSelectedPhoto();
  elements.saveButton.textContent = "Save card";
}

function resetSetTargetForm() {
  elements.setTargetForm.reset();
  elements.setTargetId.value = "";
}

function render() {
  const ownerScopedCards = filterCardsByOwner(cards);
  const ownerScopedTargets = filterSetTargetsByOwner(setTargets);
  const visibleCards = sortCards(filterCards(ownerScopedCards));
  renderStats(ownerScopedCards);
  renderSetProgress(ownerScopedCards, ownerScopedTargets);
  renderSetTargetList();
  updateOwnerBadge(ownerScopedCards, ownerScopedTargets);
  updateStatusTabs();
  renderGrid(visibleCards);
  elements.resultsCount.textContent = formatResultsSummary(visibleCards.length);
}

function filterCards(source) {
  const search = elements.search.value.trim().toLowerCase();
  const language = elements.filterLanguage.value;
  const rarity = elements.filterRarity.value;
  const status = selectedStatusFilter;

  return source.filter((card) => {
    const searchTarget = [
      card.ownerName,
      card.title,
      card.character,
      card.set,
      card.number,
      card.language,
      card.status,
      card.rarity,
      card.notes
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchTarget.includes(search);
    const matchesLanguage = language === "All" || card.language === language;
    const matchesRarity = rarity === "All" || card.rarity === rarity;
    const matchesStatus = status === "All" || normalizeCardStatus(card.status) === status;

    return matchesSearch && matchesLanguage && matchesRarity && matchesStatus;
  });
}

function filterCardsByOwner(source) {
  const ownerQuery = elements.filterOwner.value.trim().toLowerCase();
  if (!ownerQuery) {
    return source;
  }

  return source.filter((card) => String(card.ownerName || "").toLowerCase().includes(ownerQuery));
}

function filterSetTargetsByOwner(source) {
  const ownerQuery = elements.filterOwner.value.trim().toLowerCase();
  if (!ownerQuery) {
    return source;
  }

  return source.filter((target) => String(target.ownerName || "").toLowerCase().includes(ownerQuery));
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

    if (sortMode === "estimatedValue") {
      return (right.estimatedValue || 0) - (left.estimatedValue || 0);
    }

    return (right.createdAt || 0) - (left.createdAt || 0);
  });

  return copy;
}

function renderStats(source) {
  const physicalCards = source.filter((card) => countsTowardCollection(card.status));
  const languageCounts = {
    Japanese: 0,
    Chinese: 0,
    English: 0
  };
  const statusCounts = {
    Owned: 0,
    Wishlist: 0,
    "For Trade": 0
  };

  let totalCopies = 0;
  let totalCostBasis = 0;
  let totalEstimatedValue = 0;

  source.forEach((card) => {
    const status = normalizeCardStatus(card.status);
    statusCounts[status] += 1;
  });

  physicalCards.forEach((card) => {
    totalCopies += Number(card.copies) || 0;
    languageCounts[normalizeLanguage(card.language)] += 1;
    totalCostBasis += Number(card.purchasePrice) || 0;
    totalEstimatedValue += Number(card.estimatedValue) || 0;
  });

  elements.uniqueCount.textContent = String(physicalCards.length);
  elements.copyCount.textContent = String(totalCopies);
  elements.jpCount.textContent = String(languageCounts.Japanese);
  elements.cnCount.textContent = String(languageCounts.Chinese);
  elements.enCount.textContent = String(languageCounts.English);
  elements.costBasisTotal.textContent = formatAmount(totalCostBasis);
  elements.estimatedTotal.textContent = formatAmount(totalEstimatedValue);
  const valueDelta = totalEstimatedValue - totalCostBasis;
  elements.valueChangeTotal.textContent = formatSignedAmount(valueDelta);
  elements.valueChangeTotal.classList.toggle("is-positive", valueDelta > 0);
  elements.valueChangeTotal.classList.toggle("is-negative", valueDelta < 0);
  elements.ownedCount.textContent = `Owned ${statusCounts.Owned}`;
  elements.wishlistCount.textContent = `Wishlist ${statusCounts.Wishlist}`;
  elements.tradeCount.textContent = `For Trade ${statusCounts["For Trade"]}`;
}

function renderSetProgress(sourceCards = cards, sourceTargets = setTargets) {
  elements.setProgressGrid.innerHTML = "";

  const progressEntries = buildSetProgressEntries(sourceCards, sourceTargets);
  if (!progressEntries.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <h3>No set progress published yet</h3>
      <p>Owner-managed set totals will appear here once they are added to the archive.</p>
    `;
    elements.setProgressGrid.append(emptyState);
    return;
  }

  progressEntries.forEach((entry) => {
    const fragment = elements.setProgressTemplate.content.cloneNode(true);
    const status = fragment.querySelector(".set-progress-status");
    const fill = fragment.querySelector(".set-progress-fill");

    status.textContent = entry.statusLabel;
    status.classList.add(entry.statusClass);
    fragment.querySelector(".set-progress-percent").textContent = entry.percentLabel;
    fragment.querySelector(".set-progress-title").textContent = entry.setName;
    fragment.querySelector(".set-progress-owner").textContent = `Owner: ${entry.ownerName}`;
    fragment.querySelector(".set-progress-owned").textContent = String(entry.ownedCards);
    fragment.querySelector(".set-progress-total").textContent = entry.totalCards ? String(entry.totalCards) : "Not set";
    fill.style.width = `${entry.percent}%`;
    elements.setProgressGrid.append(fragment);
  });
}

function renderSetTargetList() {
  elements.setTargetList.innerHTML = "";

  if (!currentOwner) {
    return;
  }

  if (!setTargets.length) {
    const empty = document.createElement("div");
    empty.className = "public-note";
    empty.textContent = "No set totals have been published yet. Add your first set target above.";
    elements.setTargetList.append(empty);
    return;
  }

  const progressBySet = new Map(buildSetProgressEntries().map((entry) => [entry.setName, entry]));

  setTargets
    .slice()
    .sort((left, right) => left.setName.localeCompare(right.setName))
    .forEach((target) => {
      const item = document.createElement("div");
      item.className = "set-target-item";
      item.dataset.id = target.id;

      const progress = progressBySet.get(target.setName);
      const ownedCards = progress?.ownedCards ?? 0;

      item.innerHTML = `
        <div class="set-target-copy">
          <strong>${escapeHtml(target.setName)}</strong>
          <span>${ownedCards} owned out of ${target.totalCards} total cards</span>
        </div>
        <div class="set-target-actions">
          <button class="button button-secondary small set-target-edit" type="button">Edit</button>
          <button class="button button-ghost small set-target-delete" type="button">Delete</button>
        </div>
      `;

      elements.setTargetList.append(item);
    });
}

function renderGrid(source) {
  elements.grid.innerHTML = "";
  const archiveOwnerName = resolveArchiveOwnerName() || "Archive Owner";

  if (!source.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <h3>${selectedStatusFilter === "All" ? "The archive is ready" : `No ${selectedStatusFilter} records found`}</h3>
      <p>${supabase ? emptyStateMessageForStatus() : "Configure Supabase or publish records to begin."}</p>
    `;
    elements.grid.append(emptyState);
    return;
  }

  source.forEach((card) => {
    const fragment = elements.template.content.cloneNode(true);
    const article = fragment.querySelector(".collection-card");
    const imageWrap = fragment.querySelector(".card-image-wrap");
    const image = fragment.querySelector(".card-image");
    const statusPill = fragment.querySelector(".status-pill");
    const languagePill = fragment.querySelector(".language-pill");
    const actions = fragment.querySelector(".card-actions");
    const publicActions = fragment.querySelector(".card-public-actions");
    const tradeContactButton = fragment.querySelector(".trade-contact-button");
    const detailCopiesLabel = fragment.querySelector(".detail-copies-label");
    const detailPurchaseLabel = fragment.querySelector(".detail-purchase-label");
    const detailEstimateLabel = fragment.querySelector(".detail-estimate-label");

    article.dataset.id = card.id;
    statusPill.textContent = normalizeCardStatus(card.status);
    statusPill.classList.add(statusClass(normalizeCardStatus(card.status)));
    languagePill.textContent = card.language;
    languagePill.classList.add(languageClass(card.language));

    fragment.querySelector(".rarity-pill").textContent = card.rarity;
    fragment.querySelector(".card-title").textContent = card.title;
    fragment.querySelector(".card-character").textContent = card.character;
    fragment.querySelector(".detail-set").textContent = card.set || "Unknown";
    fragment.querySelector(".detail-number").textContent = card.number || "Unlisted";
    fragment.querySelector(".detail-owner").textContent = card.ownerName || archiveOwnerName;
    fragment.querySelector(".detail-condition").textContent = card.condition || "Unknown";
    detailCopiesLabel.textContent = normalizeCardStatus(card.status) === "Wishlist" ? "Target" : "Copies";
    detailPurchaseLabel.textContent = normalizeCardStatus(card.status) === "Wishlist" ? "Target Budget" : "Purchase Total";
    detailEstimateLabel.textContent = normalizeCardStatus(card.status) === "Wishlist" ? "Target Value" : "Estimated Total";
    fragment.querySelector(".detail-copies").textContent = String(card.copies || 0);
    fragment.querySelector(".detail-date").textContent = formatDate(card.acquisitionDate);
    fragment.querySelector(".detail-purchase").textContent = formatOptionalAmount(card.purchasePrice);
    fragment.querySelector(".detail-estimate").textContent = formatOptionalAmount(card.estimatedValue);
    fragment.querySelector(".card-notes").textContent = card.notes || "";
    image.alt = `${card.title} ${card.language} card`;

    publicActions.hidden = !(normalizeCardStatus(card.status) === "For Trade" && card.tradeContact);
    if (!publicActions.hidden) {
      const contactAction = resolveTradeContactAction(card.tradeContact, card.title);
      tradeContactButton.textContent = contactAction.kind === "link" ? "Contact for trade" : "Copy trade contact";
    }

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
  elements.authFeedback.hidden = !message;
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
    ownerName: String(card.ownerName || card.owner_name || "").trim(),
    title: String(card.title || "").trim(),
    character: String(card.character || "").trim(),
    set: String(card.set || card.set_name || "").trim(),
    number: String(card.number || card.card_number || "").trim(),
    language: normalizeLanguage(card.language),
    status: normalizeCardStatus(card.status || card.card_status),
    rarity: String(card.rarity || "Common"),
    condition: String(card.condition || "Mint"),
    copies: Number(card.copies) > 0 ? Number(card.copies) : 1,
    acquisitionDate: String(card.acquisitionDate || card.acquisition_date || ""),
    purchasePrice: parseStoredAmount(card.purchasePrice ?? card.purchase_price),
    estimatedValue: parseStoredAmount(card.estimatedValue ?? card.estimated_value),
    tradeContact: String(card.tradeContact || card.trade_contact || "").trim(),
    image: String(card.image || card.image_data || "").trim(),
    notes: String(card.notes || "").trim(),
    createdAt: Number(card.createdAt) || Date.now()
  };
}

function mapRowToCard(row) {
  return {
    id: row.id,
    ownerName: row.owner_name || "",
    title: row.title,
    character: row.character,
    set: row.set_name || "",
    number: row.card_number || "",
    language: normalizeLanguage(row.language),
    status: normalizeCardStatus(row.card_status),
    rarity: row.rarity || "Common",
    condition: row.condition || "Mint",
    copies: Number(row.copies) || 1,
    acquisitionDate: row.acquisition_date || "",
    purchasePrice: parseStoredAmount(row.purchase_price),
    estimatedValue: parseStoredAmount(row.estimated_value),
    tradeContact: row.trade_contact || "",
    image: row.image_data || "",
    notes: row.notes || "",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now()
  };
}

function mapSetTargetRow(row) {
  return {
    id: row.id,
    setName: row.set_name,
    totalCards: Number(row.total_cards) || 0,
    ownerName: row.owner_name || "",
    ownerUserId: row.owner_user_id || "",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now()
  };
}

function toDatabasePayload(card, ownerId) {
  const payload = {
    id: card.id || crypto.randomUUID(),
    owner_name: card.ownerName || inferOwnerNameFromEmail(currentOwner?.email),
    title: card.title,
    character: card.character,
    set_name: card.set,
    card_number: card.number || null,
    language: normalizeLanguage(card.language),
    card_status: normalizeCardStatus(card.status),
    rarity: card.rarity,
    condition: card.condition || null,
    copies: Number(card.copies) || 1,
    acquisition_date: card.acquisitionDate || null,
    purchase_price: toDatabaseAmount(card.purchasePrice),
    estimated_value: toDatabaseAmount(card.estimatedValue),
    trade_contact: card.tradeContact || null,
    image_data: card.image || null,
    notes: card.notes || null,
    owner_user_id: ownerId
  };

  if (card.createdAt) {
    payload.created_at = new Date(card.createdAt).toISOString();
  }

  return payload;
}

function toSetTargetPayload(target, ownerId) {
  return {
    id: target.id || crypto.randomUUID(),
    set_name: target.setName,
    total_cards: Number(target.totalCards) || 0,
    owner_name: resolveArchiveOwnerName() || currentOwner?.ownerName || inferOwnerNameFromEmail(currentOwner?.email),
    owner_user_id: ownerId
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

function normalizeCardStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "wishlist" || value === "wish list") {
    return "Wishlist";
  }

  if (value === "for trade" || value === "for_trade" || value === "fortrade" || value === "trade") {
    return "For Trade";
  }

  return "Owned";
}

function parseOptionalAmount(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Number(amount.toFixed(2));
}

function parseStoredAmount(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : null;
}

function toDatabaseAmount(value) {
  const amount = parseStoredAmount(value);
  return amount === null ? null : amount;
}

function resolveTradeContactAction(contact, cardTitle) {
  const value = String(contact || "").trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
    return {
      kind: "link",
      href: value
    };
  }

  if (emailPattern.test(value)) {
    const subject = encodeURIComponent(`Trade inquiry: ${cardTitle}`);
    return {
      kind: "link",
      href: `mailto:${value}?subject=${subject}`
    };
  }

  return {
    kind: "copy",
    value
  };
}

function archiveKey(card) {
  return `${card.title}::${normalizeLanguage(card.language)}::${normalizeCardStatus(card.status)}::${card.number}::${card.set}`;
}

function buildSetProgressEntries(sourceCards = cards, sourceTargets = setTargets) {
  const groups = new Map();

  sourceCards.forEach((card) => {
    const key = card.set || "Unassigned Set";
    const entry = groups.get(key) || {
      setName: key,
      ownedCards: 0,
      ownerName: card.ownerName || resolveArchiveOwnerName(sourceCards, sourceTargets) || "Archive Owner",
      totalCards: 0
    };

    if (countsTowardCollection(card.status)) {
      entry.ownedCards += 1;
    }
    if (!entry.ownerName && card.ownerName) {
      entry.ownerName = card.ownerName;
    }
    groups.set(key, entry);
  });

  sourceTargets.forEach((target) => {
    const entry = groups.get(target.setName) || {
      setName: target.setName,
      ownedCards: 0,
      ownerName: target.ownerName || resolveArchiveOwnerName(sourceCards, sourceTargets) || "Archive Owner",
      totalCards: 0
    };

    entry.totalCards = target.totalCards;
    if (!entry.ownerName && target.ownerName) {
      entry.ownerName = target.ownerName;
    }
    groups.set(target.setName, entry);
  });

  return [...groups.values()]
    .map((entry) => {
      const percent = entry.totalCards > 0
        ? Math.min(100, Math.round((entry.ownedCards / entry.totalCards) * 100))
        : 0;

      let statusLabel = "Untracked";
      let statusClass = "is-untracked";
      if (entry.totalCards > 0 && entry.ownedCards >= entry.totalCards) {
        statusLabel = "Complete";
        statusClass = "is-complete";
      } else if (entry.totalCards > 0) {
        statusLabel = "In Progress";
        statusClass = "is-in-progress";
      }

      return {
        ...entry,
        ownerName: entry.ownerName || resolveArchiveOwnerName(sourceCards, sourceTargets) || "Archive Owner",
        percent,
        percentLabel: entry.totalCards > 0 ? `${percent}%` : "Target pending",
        statusLabel,
        statusClass
      };
    })
    .sort((left, right) => left.setName.localeCompare(right.setName));
}

function countsTowardCollection(status) {
  return PHYSICAL_CARD_STATUSES.has(normalizeCardStatus(status));
}

function updateStatusTabs() {
  elements.statusTabs.querySelectorAll(".status-tab").forEach((button) => {
    const isActive = button.dataset.statusFilter === selectedStatusFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function statusClass(status) {
  if (status === "Wishlist") {
    return "wishlist";
  }

  if (status === "For Trade") {
    return "trade";
  }

  return "owned";
}

function formatResultsSummary(count) {
  const ownerQuery = getOwnerFilterValue();
  if (selectedStatusFilter === "All") {
    return ownerQuery
      ? `${count} record${count === 1 ? "" : "s"} shown for "${ownerQuery}"`
      : `${count} record${count === 1 ? "" : "s"} shown`;
  }

  return ownerQuery
    ? `${count} ${selectedStatusFilter} record${count === 1 ? "" : "s"} shown for "${ownerQuery}"`
    : `${count} ${selectedStatusFilter} record${count === 1 ? "" : "s"} shown`;
}

function emptyStateMessageForStatus() {
  const ownerQuery = getOwnerFilterValue();
  if (ownerQuery) {
    return `No public collection matched the owner name "${ownerQuery}" with the current filters.`;
  }

  if (selectedStatusFilter === "All") {
    return "No shared records are published yet.";
  }

  return "No records match the selected status tab and filters right now.";
}

function updateOwnerBadge(sourceCards = cards, sourceTargets = setTargets) {
  const ownerQuery = getOwnerFilterValue();
  const publicOwnerName = resolveArchiveOwnerName(sourceCards, sourceTargets);

  if (currentOwner) {
    elements.ownerBadge.textContent = `Owner session: ${publicOwnerName || currentOwner.email || "Authenticated owner"}`;
    return;
  }

  if (ownerQuery) {
    elements.ownerBadge.textContent = publicOwnerName
      ? `Viewing collection for: ${publicOwnerName}`
      : `Searching owner: ${ownerQuery}`;
    return;
  }

  elements.ownerBadge.textContent = publicOwnerName
    ? `Archive owner: ${publicOwnerName}`
    : "Public archive online";
}

function resolveArchiveOwnerName(sourceCards = cards, sourceTargets = setTargets) {
  const ownerNames = sourceCards
    .map((card) => String(card.ownerName || "").trim())
    .filter(Boolean);

  sourceTargets.forEach((target) => {
    const name = String(target.ownerName || "").trim();
    if (name) {
      ownerNames.push(name);
    }
  });

  if (currentOwner?.ownerName) {
    ownerNames.unshift(currentOwner.ownerName);
  }

  if (!ownerNames.length) {
    return "";
  }

  const counts = new Map();
  ownerNames.forEach((name) => {
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0];
}

function getOwnerFilterValue() {
  return elements.filterOwner.value.trim();
}

function syncOwnerNameFields(name) {
  const fallbackName = String(name || "").trim();
  elements.authOwnerName.value = fallbackName;
  elements.ownerName.value = fallbackName;
}

function inferOwnerNameFromEmail(email) {
  const value = String(email || "").trim();
  if (!value.includes("@")) {
    return "Archive Owner";
  }

  const localPart = value.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!localPart) {
    return "Archive Owner";
  }

  return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatOptionalAmount(value) {
  const amount = parseStoredAmount(value);
  return amount === null ? "Not set" : formatAmount(amount);
}

function formatSignedAmount(value) {
  const amount = Number(value) || 0;
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${prefix}${formatAmount(Math.abs(amount))}`;
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
