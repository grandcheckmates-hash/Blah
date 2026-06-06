const PASSWORD = "WMza@314%f";
const WIN_TIME = "40:01";
const DEFAULT_TIME = "00:00";

const app = document.querySelector(".app");
const lockButton = document.querySelector("[data-lock]");
const lockZoom = document.querySelector("[data-lock-zoom]");
const lockClose = document.querySelector("[data-lock-close]");
const passwordForm = document.querySelector("[data-password-form]");
const passwordInput = document.querySelector("[data-password-input]");
const passwordFeedback = document.querySelector("[data-password-feedback]");
const lockStatus = document.querySelector("[data-lock-status]");
const entryButton = document.querySelector("[data-entry]");
const clueScreen = document.querySelector("[data-clue-screen]");
const screenZoom = document.querySelector("[data-screen-zoom]");
const screenClose = document.querySelector("[data-screen-close]");
const timeInput = document.querySelector("[data-time-input]");
const timeSubmit = document.querySelector("[data-time-submit]");

let doorOpen = false;

timeInput.value = DEFAULT_TIME;

function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function unlockDoor() {
  doorOpen = true;
  app.classList.add("door-open");
  lockStatus.textContent = "OPEN";
  closeModal(lockZoom);
}

function enterRoom() {
  if (!doorOpen) {
    lockButton.classList.add("pulse");
    setTimeout(() => lockButton.classList.remove("pulse"), 420);
    return;
  }

  app.dataset.view = "room";
}

function normalizeTime(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function checkTime() {
  if (timeInput.value.trim() !== WIN_TIME) {
    timeInput.classList.add("is-wrong");
    setTimeout(() => timeInput.classList.remove("is-wrong"), 420);
    return;
  }

  app.classList.add("won");
}

lockButton.addEventListener("click", () => {
  openModal(lockZoom);
  setTimeout(() => passwordInput.focus(), 120);
});

lockClose.addEventListener("click", () => closeModal(lockZoom));

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (passwordInput.value === PASSWORD) {
    passwordFeedback.textContent = "Credentials accepted.";
    unlockDoor();
    return;
  }

  passwordFeedback.textContent = "Access denied.";
  passwordForm.classList.add("shake");
  passwordInput.select();
  setTimeout(() => passwordForm.classList.remove("shake"), 360);
});

entryButton.addEventListener("click", enterRoom);
clueScreen.addEventListener("click", () => openModal(screenZoom));
screenClose.addEventListener("click", () => closeModal(screenZoom));

timeInput.addEventListener("input", () => {
  timeInput.value = normalizeTime(timeInput.value);
  if (timeInput.value === WIN_TIME) {
    checkTime();
  }
});

function primeTimeInput() {
  if (timeInput.value === DEFAULT_TIME) {
    timeInput.value = "";
    return;
  }

  timeInput.select();
}

timeInput.addEventListener("focus", primeTimeInput);
timeInput.addEventListener("click", () => setTimeout(primeTimeInput, 0));

timeInput.addEventListener("blur", () => {
  if (!timeInput.value) {
    timeInput.value = DEFAULT_TIME;
  }
});

timeSubmit.addEventListener("click", checkTime);

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeModal(lockZoom);
  closeModal(screenZoom);
});
