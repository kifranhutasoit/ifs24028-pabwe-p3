/**
 * DompetKu — Studi Kasus Praktikum 3 PABWE
 * Fitur: Tab switcher, Expense Tracker (CRUD), Bookmark Manager (CRUD), Quiz App
 * Semua data persisten memakai localStorage dengan key terpisah per fitur.
 */

/* ========== UTILITAS ========== */

function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
  return el;
}

function $all(selector) {
  return document.querySelectorAll(selector);
}

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function openModal(modal) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

/* ========== TAB SWITCHER ========== */

const TAB_STORAGE_KEY = "dompetku-active-tab";
const tabButtons = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

function switchTab(name) {
  if (!panels[name]) name = "expense";

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.setAttribute("aria-selected", String(active));
    btn.classList.toggle("bg-sky-600", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("shadow", active);
    btn.classList.toggle("text-slate-600", !active);
    btn.classList.toggle("hover:bg-slate-100", !active);
  });

  localStorage.setItem(TAB_STORAGE_KEY, name);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

const savedTab = localStorage.getItem(TAB_STORAGE_KEY) || "expense";
switchTab(savedTab);

/* =====================================================================
   FITUR 1: EXPENSE TRACKER (Catatan Pengeluaran Harian)
   Key localStorage: dompetku-expenses
   ===================================================================== */

const EXP_STORAGE_KEY = "dompetku-expenses";

let expenses = loadExpenses();
let expEditingId = null;
let expDeletingId = null;

const expForm = $("#exp-form");
const expTitle = $("#exp-title");
const expCategory = $("#exp-category");
const expAmount = $("#exp-amount");
const expType = $("#exp-type");
const expDate = $("#exp-date");
const expFormError = $("#exp-form-error");

const expSearch = $("#exp-search");
const expFilterType = $("#exp-filter-type");
const expSort = $("#exp-sort");
const expList = $("#exp-list");
const expEmpty = $("#exp-empty");

const expTotalIncomeEl = $("#exp-total-income");
const expTotalExpenseEl = $("#exp-total-expense");
const expBalanceEl = $("#exp-balance");

const expModalEdit = $("#exp-modal-edit");
const expModalDelete = $("#exp-modal-delete");
const expEditForm = $("#exp-edit-form");
const expEditTitle = $("#exp-edit-title");
const expEditCategory = $("#exp-edit-category");
const expEditAmount = $("#exp-edit-amount");
const expEditType = $("#exp-edit-type");
const expEditDate = $("#exp-edit-date");
const expDeleteTitle = $("#exp-delete-title");
const expDeleteConfirm = $("#exp-delete-confirm");

function loadExpenses() {
  try {
    const raw = localStorage.getItem(EXP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(expenses));
}

function showExpError(message) {
  expFormError.textContent = message;
  expFormError.classList.toggle("hidden", !message);
}

/** Hitung dan tampilkan ringkasan total pemasukan, pengeluaran, saldo */
function renderExpenseSummary() {
  const totalIncome = expenses
    .filter((t) => t.type === "Pemasukan")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses
    .filter((t) => t.type === "Pengeluaran")
    .reduce((sum, t) => sum + t.amount, 0);

  expTotalIncomeEl.textContent = formatRupiah(totalIncome);
  expTotalExpenseEl.textContent = formatRupiah(totalExpense);
  expBalanceEl.textContent = formatRupiah(totalIncome - totalExpense);
}

/** Filter, cari, urutkan, lalu render daftar transaksi ke DOM */
function renderExpenses() {
  const query = expSearch.value.trim().toLowerCase();
  const typeFilter = expFilterType.value;
  const sort = expSort.value;

  let items = expenses.filter((t) => t.title.toLowerCase().includes(query));
  if (typeFilter !== "all") {
    items = items.filter((t) => t.type === typeFilter);
  }

  items = [...items].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt - b.createdAt;
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const noExpenses = expenses.length === 0;
  expEmpty.classList.toggle("hidden", !noExpenses);
  expList.classList.toggle("hidden", noExpenses);
  expList.innerHTML = "";

  if (noExpenses) {
    renderExpenseSummary();
    return;
  }

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600";
    li.textContent = "Tidak ada transaksi yang cocok.";
    expList.appendChild(li);
    renderExpenseSummary();
    return;
  }

  items.forEach((t) => {
    const li = document.createElement("li");
    li.className = "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 px-4 py-3";

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const titleEl = document.createElement("p");
    titleEl.className = "font-medium text-slate-900 truncate";
    titleEl.textContent = t.title;

    const metaEl = document.createElement("p");
    metaEl.className = "text-xs text-slate-500 mt-0.5";
    metaEl.textContent = `${t.category} · ${formatDate(t.date)}`;

    const badgeRow = document.createElement("div");
    badgeRow.className = "flex items-center gap-2 mt-1";

    const typeBadge = document.createElement("span");
    typeBadge.className = `inline-flex text-xs font-semibold px-2 py-0.5 rounded-md ${
      t.type === "Pemasukan" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
    }`;
    typeBadge.textContent = t.type;

    const amountEl = document.createElement("span");
    amountEl.className = `text-sm font-semibold ${t.type === "Pemasukan" ? "text-emerald-700" : "text-rose-700"}`;
    amountEl.textContent = (t.type === "Pemasukan" ? "+" : "-") + formatRupiah(t.amount);

    badgeRow.append(typeBadge, amountEl);
    info.append(titleEl, metaEl, badgeRow);

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 shrink-0";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i> Ubah';
    editBtn.addEventListener("click", () => openExpEditModal(t.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i> Hapus';
    deleteBtn.addEventListener("click", () => openExpDeleteModal(t.id));

    actions.append(editBtn, deleteBtn);
    li.append(info, actions);
    expList.appendChild(li);
  });

  renderExpenseSummary();
}

function openExpEditModal(id) {
  const t = expenses.find((x) => x.id === id);
  if (!t) return;
  expEditingId = id;
  expEditTitle.value = t.title;
  expEditCategory.value = t.category;
  expEditAmount.value = t.amount;
  expEditType.value = t.type;
  expEditDate.value = t.date;
  openModal(expModalEdit);
}

function openExpDeleteModal(id) {
  const t = expenses.find((x) => x.id === id);
  if (!t) return;
  expDeletingId = id;
  expDeleteTitle.textContent = `"${t.title}"`;
  openModal(expModalDelete);
}

function closeExpEditModal() {
  expEditingId = null;
  expEditForm.reset();
  closeModal(expModalEdit);
}

function closeExpDeleteModal() {
  expDeletingId = null;
  closeModal(expModalDelete);
}

$all("[data-close-modal='exp-edit']").forEach((btn) => btn.addEventListener("click", closeExpEditModal));
$all("[data-close-modal='exp-delete']").forEach((btn) => btn.addEventListener("click", closeExpDeleteModal));
expModalEdit.querySelector(".modal-backdrop").addEventListener("click", closeExpEditModal);
expModalDelete.querySelector(".modal-backdrop").addEventListener("click", closeExpDeleteModal);

expEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const t = expenses.find((x) => x.id === expEditingId);
  const amount = Number(expEditAmount.value);
  if (!t || !expEditTitle.value.trim() || !expEditCategory.value.trim() || !amount || amount <= 0 || !expEditDate.value) return;

  t.title = expEditTitle.value.trim();
  t.category = expEditCategory.value.trim();
  t.amount = amount;
  t.type = expEditType.value;
  t.date = expEditDate.value;

  saveExpenses();
  renderExpenses();
  closeExpEditModal();
});

expDeleteConfirm.addEventListener("click", () => {
  if (!expDeletingId) return;
  expenses = expenses.filter((x) => x.id !== expDeletingId);
  saveExpenses();
  renderExpenses();
  closeExpDeleteModal();
});

expForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = expTitle.value.trim();
  const category = expCategory.value.trim();
  const amount = Number(expAmount.value);
  const type = expType.value;
  const date = expDate.value;

  if (!title || !category || !date) {
    showExpError("Semua field wajib diisi.");
    return;
  }
  if (!amount || isNaN(amount) || amount <= 0) {
    showExpError("Jumlah harus berupa angka valid dan lebih dari 0.");
    return;
  }

  showExpError("");
  expenses.push({
    id: crypto.randomUUID(),
    title,
    category,
    amount,
    type,
    date,
    createdAt: Date.now(),
  });

  saveExpenses();
  expForm.reset();
  expType.value = "Pengeluaran";
  renderExpenses();
});

expSearch.addEventListener("input", renderExpenses);
expFilterType.addEventListener("change", renderExpenses);
expSort.addEventListener("change", renderExpenses);

renderExpenses();

/* =====================================================================
   FITUR 2: BOOKMARK / LINK MANAGER
   Key localStorage: dompetku-bookmarks (berbeda dari expenses)
   ===================================================================== */

const BM_STORAGE_KEY = "dompetku-bookmarks";

let bookmarks = loadBookmarks();
let bmEditingId = null;
let bmDeletingId = null;

const bmForm = $("#bm-form");
const bmName = $("#bm-name");
const bmUrl = $("#bm-url");
const bmCategory = $("#bm-category");
const bmNote = $("#bm-note");
const bmFormError = $("#bm-form-error");

const bmSearch = $("#bm-search");
const bmSort = $("#bm-sort");
const bmList = $("#bm-list");
const bmEmpty = $("#bm-empty");

const bmModalEdit = $("#bm-modal-edit");
const bmModalDelete = $("#bm-modal-delete");
const bmEditForm = $("#bm-edit-form");
const bmEditName = $("#bm-edit-name");
const bmEditUrl = $("#bm-edit-url");
const bmEditCategory = $("#bm-edit-category");
const bmEditNote = $("#bm-edit-note");
const bmDeleteTitle = $("#bm-delete-title");
const bmDeleteConfirm = $("#bm-delete-confirm");

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks() {
  localStorage.setItem(BM_STORAGE_KEY, JSON.stringify(bookmarks));
}

/** Validasi URL sederhana: harus diawali http:// atau https:// dan berbentuk URL valid */
function isValidUrl(value) {
  if (!/^https?:\/\//i.test(value.trim())) return false;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

function showBmError(message) {
  bmFormError.textContent = message;
  bmFormError.classList.toggle("hidden", !message);
}

function renderBookmarks() {
  const query = bmSearch.value.trim().toLowerCase();
  const sort = bmSort.value;

  let items = bookmarks.filter(
    (b) =>
      b.name.toLowerCase().includes(query) ||
      b.url.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
  );

  items = [...items].sort((a, b) => {
    switch (sort) {
      case "title-asc":
        return a.name.localeCompare(b.name, "id");
      case "title-desc":
        return b.name.localeCompare(a.name, "id");
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const noBookmarks = bookmarks.length === 0;
  bmEmpty.classList.toggle("hidden", !noBookmarks);
  bmList.classList.toggle("hidden", noBookmarks);
  bmList.innerHTML = "";

  if (noBookmarks) return;

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600";
    li.textContent = "Tidak ada bookmark yang cocok dengan pencarian.";
    bmList.appendChild(li);
    return;
  }

  items.forEach((b) => {
    const li = document.createElement("li");
    li.className = "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 px-4 py-3";

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const titleRow = document.createElement("div");
    titleRow.className = "flex items-center gap-2 flex-wrap";

    const link = document.createElement("a");
    link.href = b.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "font-medium text-sky-700 hover:underline truncate";
    link.textContent = b.name;

    const catBadge = document.createElement("span");
    catBadge.className = "inline-flex text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800";
    catBadge.textContent = b.category;

    titleRow.append(link, catBadge);

    const urlEl = document.createElement("p");
    urlEl.className = "text-xs text-slate-500 truncate mt-0.5";
    urlEl.textContent = b.url;

    info.append(titleRow, urlEl);

    if (b.note) {
      const noteEl = document.createElement("p");
      noteEl.className = "text-xs text-slate-500 italic mt-1";
      noteEl.textContent = b.note;
      info.appendChild(noteEl);
    }

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 shrink-0";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i> Ubah';
    editBtn.addEventListener("click", () => openBmEditModal(b.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i> Hapus';
    deleteBtn.addEventListener("click", () => openBmDeleteModal(b.id));

    actions.append(editBtn, deleteBtn);
    li.append(info, actions);
    bmList.appendChild(li);
  });
}

function openBmEditModal(id) {
  const b = bookmarks.find((x) => x.id === id);
  if (!b) return;
  bmEditingId = id;
  bmEditName.value = b.name;
  bmEditUrl.value = b.url;
  bmEditCategory.value = b.category;
  bmEditNote.value = b.note || "";
  openModal(bmModalEdit);
}

function openBmDeleteModal(id) {
  const b = bookmarks.find((x) => x.id === id);
  if (!b) return;
  bmDeletingId = id;
  bmDeleteTitle.textContent = `"${b.name}"`;
  openModal(bmModalDelete);
}

function closeBmEditModal() {
  bmEditingId = null;
  bmEditForm.reset();
  closeModal(bmModalEdit);
}

function closeBmDeleteModal() {
  bmDeletingId = null;
  closeModal(bmModalDelete);
}

$all("[data-close-modal='bm-edit']").forEach((btn) => btn.addEventListener("click", closeBmEditModal));
$all("[data-close-modal='bm-delete']").forEach((btn) => btn.addEventListener("click", closeBmDeleteModal));
bmModalEdit.querySelector(".modal-backdrop").addEventListener("click", closeBmEditModal);
bmModalDelete.querySelector(".modal-backdrop").addEventListener("click", closeBmDeleteModal);

bmEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const b = bookmarks.find((x) => x.id === bmEditingId);
  if (!b) return;
  if (!bmEditName.value.trim() || !bmEditCategory.value.trim() || !isValidUrl(bmEditUrl.value)) return;

  b.name = bmEditName.value.trim();
  b.url = bmEditUrl.value.trim();
  b.category = bmEditCategory.value.trim();
  b.note = bmEditNote.value.trim();

  saveBookmarks();
  renderBookmarks();
  closeBmEditModal();
});

bmDeleteConfirm.addEventListener("click", () => {
  if (!bmDeletingId) return;
  bookmarks = bookmarks.filter((x) => x.id !== bmDeletingId);
  saveBookmarks();
  renderBookmarks();
  closeBmDeleteModal();
});

bmForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = bmName.value.trim();
  const url = bmUrl.value.trim();
  const category = bmCategory.value.trim();
  const note = bmNote.value.trim();

  if (!name || !category) {
    showBmError("Nama dan kategori wajib diisi.");
    return;
  }
  if (!isValidUrl(url)) {
    showBmError("URL tidak valid. Pastikan diawali http:// atau https://");
    return;
  }

  showBmError("");
  bookmarks.push({
    id: crypto.randomUUID(),
    name,
    url,
    category,
    note,
    createdAt: Date.now(),
  });

  saveBookmarks();
  bmForm.reset();
  renderBookmarks();
});

bmSearch.addEventListener("input", renderBookmarks);
bmSort.addEventListener("change", renderBookmarks);

renderBookmarks();

/* =====================================================================
   FITUR 3: QUIZ APP (Kuis Interaktif)
   Key localStorage: dompetku-quiz-highscore
   ===================================================================== */

const QUIZ_HIGHSCORE_KEY = "dompetku-quiz-highscore";

// Soal disimpan sebagai array of object, bukan hardcode HTML per soal
const QUIZ_QUESTIONS = [
  {
    question: "Kepanjangan dari HTML adalah?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Hyperlink Text Management Language",
      "Home Tool Markup Language",
    ],
    answer: 0,
  },
  {
    question: "Properti CSS untuk mengubah warna teks adalah?",
    options: ["text-color", "font-color", "color", "background-color"],
    answer: 2,
  },
  {
    question: "Cara yang benar untuk mendeklarasikan variabel di JavaScript modern adalah?",
    options: ["variable x;", "let x;", "v x;", "int x;"],
    answer: 1,
  },
  {
    question: "Method array JavaScript untuk menambah elemen di akhir array adalah?",
    options: ["push()", "add()", "append()", "insert()"],
    answer: 0,
  },
  {
    question: "Fungsi untuk mengambil elemen DOM berdasarkan CSS selector adalah?",
    options: ["getElement()", "querySelector()", "findElement()", "selectElement()"],
    answer: 1,
  },
  {
    question: "Objek browser yang digunakan untuk menyimpan data secara persisten adalah?",
    options: ["sessionStorage", "cookieStorage", "localStorage", "browserStorage"],
    answer: 2,
  },
  {
    question: "Operator perbandingan yang memeriksa nilai DAN tipe data di JavaScript adalah?",
    options: ["==", "=", "===", "!="],
    answer: 2,
  },
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

const quizStartScreen = $("#quiz-start-screen");
const quizQuestionScreen = $("#quiz-question-screen");
const quizResultScreen = $("#quiz-result-screen");

const quizStartBtn = $("#quiz-start-btn");
const quizNextBtn = $("#quiz-next-btn");
const quizRestartBtn = $("#quiz-restart-btn");

const quizQuestionText = $("#quiz-question-text");
const quizOptionsEl = $("#quiz-options");
const quizProgressEl = $("#quiz-progress");
const quizScoreEl = $("#quiz-score");
const quizHighscoreEl = $("#quiz-highscore");
const quizFinalScoreEl = $("#quiz-final-score");
const quizHighscoreMsgEl = $("#quiz-highscore-msg");

function getQuizHighscore() {
  const v = localStorage.getItem(QUIZ_HIGHSCORE_KEY);
  return v ? Number(v) : null;
}

function showQuizHighscore() {
  const top = getQuizHighscore();
  quizHighscoreEl.textContent = top === null ? "—" : `${top} / ${QUIZ_QUESTIONS.length}`;
}

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;
  quizScoreEl.textContent = "0";
  quizStartScreen.classList.add("hidden");
  quizResultScreen.classList.add("hidden");
  quizQuestionScreen.classList.remove("hidden");
  showQuizHighscore();
  renderQuizQuestion();
}

function renderQuizQuestion() {
  quizAnswered = false;
  quizNextBtn.disabled = true;
  quizNextBtn.classList.add("bg-slate-300");
  quizNextBtn.classList.remove("bg-amber-500", "hover:bg-amber-600");

  const q = QUIZ_QUESTIONS[quizIndex];
  quizQuestionText.textContent = q.question;
  quizProgressEl.textContent = `${quizIndex + 1} / ${QUIZ_QUESTIONS.length}`;
  quizOptionsEl.innerHTML = "";

  q.options.forEach((optionText, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "w-full text-left rounded-lg border border-slate-300 px-4 py-2.5 text-sm hover:bg-slate-50 transition";
    btn.textContent = optionText;
    btn.addEventListener("click", () => selectQuizAnswer(i, btn));
    quizOptionsEl.appendChild(btn);
  });
}

function selectQuizAnswer(selectedIndex, btnEl) {
  if (quizAnswered) return;
  quizAnswered = true;

  const q = QUIZ_QUESTIONS[quizIndex];
  const optionButtons = $all("#quiz-options button");

  optionButtons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) {
      btn.classList.add("border-emerald-500", "bg-emerald-50", "text-emerald-800");
    } else if (i === selectedIndex) {
      btn.classList.add("border-rose-500", "bg-rose-50", "text-rose-800");
    }
  });

  if (selectedIndex === q.answer) {
    quizScore += 1;
    quizScoreEl.textContent = String(quizScore);
  }

  quizNextBtn.disabled = false;
  quizNextBtn.classList.remove("bg-slate-300");
  quizNextBtn.classList.add("bg-amber-500", "hover:bg-amber-600");
}

quizNextBtn.addEventListener("click", () => {
  if (!quizAnswered) return;
  quizIndex += 1;
  if (quizIndex < QUIZ_QUESTIONS.length) {
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  quizQuestionScreen.classList.add("hidden");
  quizResultScreen.classList.remove("hidden");
  quizFinalScoreEl.textContent = `Skor kamu: ${quizScore} / ${QUIZ_QUESTIONS.length}`;

  const top = getQuizHighscore();
  if (top === null || quizScore > top) {
    localStorage.setItem(QUIZ_HIGHSCORE_KEY, String(quizScore));
    quizHighscoreMsgEl.textContent = "Selamat, ini rekor baru!";
  } else {
    quizHighscoreMsgEl.textContent = "";
  }
  showQuizHighscore();
}

quizStartBtn.addEventListener("click", startQuiz);
quizRestartBtn.addEventListener("click", () => {
  quizResultScreen.classList.add("hidden");
  quizStartScreen.classList.remove("hidden");
});

showQuizHighscore();