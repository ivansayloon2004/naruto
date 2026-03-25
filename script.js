const CARD_STORAGE_KEY = "naruto-kayou-card-archive-v1";
const AUTH_PROFILE_KEY = "naruto-kayou-owner-profile-v1";
const AUTH_SESSION_LOCAL_KEY = "naruto-kayou-owner-session-local-v1";
const AUTH_SESSION_TEMP_KEY = "naruto-kayou-owner-session-temp-v1";

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
  authScreen: document.querySelector("#auth-screen"),
  authForm: document.querySelector("#auth-form"),
  authTitle: document.querySelector("#auth-title"),
  authCopy: document.querySelector("#auth-copy"),
  authDisplayNameField: document.querySelector("#auth-display-name-field"),
  authDisplayName: document.querySelector("#auth-display-name"),
  authUsername: document.querySelector("#auth-username"),
  authPassword: document.querySelector("#auth-password"),
  authConfirmField: document.querySelector("#auth-confirm-field"),
  authConfirmPassword: document.querySelector("#auth-confirm-password"),
  authRemember: document.querySelector("#auth-remember"),
  authSubmitButton: document.querySelector("#auth-submit-button"),
  authFeedback: document.querySelector("#auth-feedback"),
  resetLoginButton: document.querySelector("#reset-login-button"),
  ownerBadge: document.querySelector("#owner-badge"),
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
let ownerProfile = loadOwnerProfile();
let authenticated = false;

syncAuthMode();
restoreAuthState();
render();

elements.authForm.addEventListener("submit", handleAuthSubmit);
elements.resetLoginButton.addEventListener("click", resetSavedLogin);
elements.logoutButton.addEventListener("click", handleLogout);
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

function handleAuthSubmit(event) {
  event.preventDefault();

  const username = normalizeUsername(elements.authUsername.value);
  const password = elements.authPassword.value;
  const remember = elements.authRemember.checked;

  if (!username) {
    setAuthFeedback("Enter a username before continuing.", true);
    return;
  }

  if (!password) {
    setAuthFeedback("Enter your password before continuing.", true);
    return;
  }

  if (!ownerProfile) {
    const displayName = elements.authDisplayName.value.trim() || "Collector";
    const confirmPassword = elements.authConfirmPassword.value;

    if (password.length < 4) {
      setAuthFeedback("Use at least 4 characters for the password.", true);
      return;
    }

    if (password !== confirmPassword) {
      setAuthFeedback("The password confirmation does not match.", true);
      return;
    }

    ownerProfile = {
      displayName,
      username,
      passwordHash: hashCredentials(username, password),
      createdAt: Date.now()
    };

    saveOwnerProfile();
    startSession(username, remember);
    unlockApp();
    clearAuthForm();
    setAuthFeedback("Owner login created. Your archive is unlocked.");
    return;
  }

  const matchesProfile =
    ownerProfile.username === username &&
    ownerProfile.passwordHash === hashCredentials(username, password);

  if (!matchesProfile) {
    setAuthFeedback("That username or password does not match the saved owner login.", true);
    return;
  }

  startSession(username, remember);
  unlockApp();
  clearAuthForm();
  setAuthFeedback("Welcome back. Your archive is unlocked.");
}

function resetSavedLogin() {
  if (!ownerProfile) {
    clearAuthForm();
    setAuthFeedback("");
    return;
  }

  const confirmed = window.confirm(
    "Reset the saved owner login for this browser? Your card collection will stay stored, but you will need to create a new login."
  );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(AUTH_PROFILE_KEY);
  clearSession();
  ownerProfile = null;
  syncAuthMode();
  lockApp();
  clearAuthForm();
  setAuthFeedback("Saved login removed. Create a new owner login to continue.");
}

function handleLogout() {
  clearSession();
  lockApp();
  clearAuthForm();
  setAuthFeedback("Signed out. Enter your owner credentials to unlock the archive again.");
}

function restoreAuthState() {
  const session = loadSession();

  if (ownerProfile && session?.username === ownerProfile.username) {
    unlockApp();
    return;
  }

  lockApp();
}

function unlockApp() {
  authenticated = true;
  document.body.classList.remove("auth-locked");
  document.body.classList.add("is-authenticated");
  elements.ownerBadge.textContent = `Signed in as ${ownerProfile?.displayName || "Collector"}`;
}

function lockApp() {
  authenticated = false;
  document.body.classList.remove("is-authenticated");
  document.body.classList.add("auth-locked");
  syncAuthMode();
  window.setTimeout(() => {
    elements.authUsername.focus();
  }, 40);
}

function syncAuthMode() {
  const setupMode = !ownerProfile;

  elements.authTitle.textContent = setupMode ? "Create your owner login." : "Sign in to your Naruto vault.";
  elements.authCopy.textContent = setupMode
    ? "Set the display name, username, and password you want to use on this browser for your collection."
    : `Use the saved owner login for ${ownerProfile.displayName} to unlock the archive.`;
  elements.authDisplayNameField.hidden = !setupMode;
  elements.authConfirmField.hidden = !setupMode;
  elements.resetLoginButton.hidden = setupMode;
  elements.authSubmitButton.textContent = setupMode ? "Create owner login" : "Sign in";
  elements.authPassword.autocomplete = setupMode ? "new-password" : "current-password";
  elements.authConfirmPassword.autocomplete = setupMode ? "new-password" : "off";

  if (setupMode) {
    elements.authUsername.placeholder = "choose a username";
  } else {
    elements.authUsername.placeholder = ownerProfile.username;
    elements.authDisplayName.value = ownerProfile.displayName;
  }
}

function setAuthFeedback(message, isError = false) {
  elements.authFeedback.textContent = message;
  elements.authFeedback.classList.toggle("is-error", isError);
}

function clearAuthForm() {
  elements.authForm.reset();
  elements.authRemember.checked = true;

  if (ownerProfile) {
    elements.authUsername.value = ownerProfile.username;
    elements.authDisplayName.value = ownerProfile.displayName;
  }
}

function loadOwnerProfile() {
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const username = normalizeUsername(parsed.username);
    if (!username || !parsed.passwordHash) {
      return null;
    }

    return {
      displayName: String(parsed.displayName || "Collector").trim() || "Collector",
      username,
      passwordHash: String(parsed.passwordHash),
      createdAt: Number(parsed.createdAt) || Date.now()
    };
  } catch (error) {
    console.error("Unable to load owner profile", error);
    return null;
  }
}

function saveOwnerProfile() {
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(ownerProfile));
}

function loadSession() {
  try {
    const raw =
      localStorage.getItem(AUTH_SESSION_LOCAL_KEY) ||
      sessionStorage.getItem(AUTH_SESSION_TEMP_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      username: normalizeUsername(parsed.username),
      createdAt: Number(parsed.createdAt) || Date.now()
    };
  } catch (error) {
    console.error("Unable to load auth session", error);
    return null;
  }
}

function startSession(username, remember) {
  const payload = JSON.stringify({
    username: normalizeUsername(username),
    createdAt: Date.now()
  });

  clearSession();

  if (remember) {
    localStorage.setItem(AUTH_SESSION_LOCAL_KEY, payload);
    return;
  }

  sessionStorage.setItem(AUTH_SESSION_TEMP_KEY, payload);
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_LOCAL_KEY);
  sessionStorage.removeItem(AUTH_SESSION_TEMP_KEY);
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function hashCredentials(username, password) {
  const input = `${normalizeUsername(username)}::${String(password)}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function loadCards() {
  try {
    const raw = localStorage.getItem(CARD_STORAGE_KEY);
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
  localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(cards));
}

function handleSubmit(event) {
  event.preventDefault();

  if (!authenticated) {
    lockApp();
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
  if (!authenticated) {
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
  if (!authenticated) {
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

function importCards(event) {
  if (!authenticated) {
    event.target.value = "";
    return;
  }

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
  if (!authenticated) {
    return;
  }

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
