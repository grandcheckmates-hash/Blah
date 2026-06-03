const code = [19, 15, 16, 8, 9, 5];
const directions = ["cw", "ccw", "cw", "ccw", "cw", "ccw"];

const safe = document.querySelector("[data-safe]");
const zoom = document.querySelector("[data-zoom]");
const dateZoom = document.querySelector("[data-date-zoom]");
const closeButton = document.querySelector("[data-close]");
const dateCloseButton = document.querySelector("[data-date-close]");
const dial = document.querySelector("[data-dial]");
const numbers = document.querySelector("[data-numbers]");
const progress = [...document.querySelectorAll("[data-progress] span")];
const direction = document.querySelector("[data-direction]");
const feedback = document.querySelector("[data-feedback]");
const unlocked = document.querySelector("[data-unlocked]");
const note = document.querySelector("[data-note]");
const paper = document.querySelector("[data-paper]");
const clockSecret = document.querySelector("[data-clock-secret]");
const dateClock = document.querySelector("[data-date-clock]");
const datePreview = {
  year: document.querySelector('[data-date-preview="year"]'),
  month: document.querySelector('[data-date-preview="month"]'),
  day: document.querySelector('[data-date-preview="day"]')
};
const dateValues = {
  year: document.querySelector('[data-date-value="year"]'),
  month: document.querySelector('[data-date-value="month"]'),
  day: document.querySelector('[data-date-value="day"]')
};

let rotation = 0;
let active = false;
let previousAngle = 0;
let turnDirection = null;
let step = 0;
let suppressDialClickUntil = 0;
let attempts = [];
let audioContext = null;
let lastDialValue = 0;
let dateState = currentDateState();
let safeOpened = false;
let clockOpened = false;

function pad(value) {
  return String(value).padStart(2, "0");
}

function currentDateState() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function getDialValue() {
  const segment = 360 / 27;
  return Math.round(normalizeDegrees(-rotation) / segment) % 27;
}

function setRotation(value) {
  rotation = value;
  dial.style.setProperty("--dial-rotation", `${rotation}deg`);
  const nextValue = getDialValue();
  if (nextValue !== lastDialValue) {
    playTick();
    lastDialValue = nextValue;
  }
}

function angleFromEvent(event) {
  const rect = dial.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  return Math.atan2(y, x) * 180 / Math.PI;
}

function shortestDelta(next, previous) {
  return ((next - previous + 540) % 360) - 180;
}

function updateDirectionLabel() {
  direction.textContent = `value ${Math.min(step + 1, code.length)} of ${code.length}`;
}

function nudge(text) {
  feedback.textContent = text;
  feedback.classList.remove("shake");
  requestAnimationFrame(() => feedback.classList.add("shake"));
}

function openZoom() {
  unlockAudio();
  playSound("open");
  document.body.classList.add("inspecting-safe");
  zoom.classList.add("is-open");
  zoom.setAttribute("aria-hidden", "false");
  resetAttempt();
  suppressDialClickUntil = Date.now() + 450;
  feedback.textContent = "Enter all six values.";
}

function closeZoom(silent = false) {
  if (!silent) {
    playSound("close");
  }
  document.body.classList.remove("inspecting-safe");
  zoom.classList.remove("is-open");
  zoom.setAttribute("aria-hidden", "true");
}

function openDateZoom() {
  unlockAudio();
  playSound("open");
  document.body.classList.add("inspecting-clock");
  dateZoom.classList.add("is-open");
  dateZoom.setAttribute("aria-hidden", "false");
}

function closeDateZoom(silent = false) {
  if (!silent) {
    playSound("close");
  }
  document.body.classList.remove("inspecting-clock");
  dateZoom.classList.remove("is-open");
  dateZoom.setAttribute("aria-hidden", "true");
}

function submitValue() {
  if (step >= code.length) {
    return;
  }

  const value = getDialValue();
  attempts.push({ value, direction: turnDirection });

  playSound("commit");
  progress[step].textContent = "";
  progress[step].classList.add("is-filled");
  step += 1;
  turnDirection = null;

  if (step === code.length) {
    evaluateAttempt();
    return;
  }

  updateDirectionLabel();
  feedback.textContent = `Value ${step} recorded.`;
}

function resetAttempt() {
  attempts = [];
  step = 0;
  turnDirection = null;
  setRotation(0);
  progress.forEach((slot) => {
    slot.textContent = "";
    slot.classList.remove("is-filled", "is-wrong");
  });
  updateDirectionLabel();
}

function evaluateAttempt() {
  const valuesOk = attempts.every((attempt, index) => attempt.value === code[index]);

  if (valuesOk) {
    feedback.textContent = "The lock releases.";
    setTimeout(() => openSafe(), 650);
    return;
  }

  progress.forEach((slot) => slot.classList.add("is-wrong"));
  playSound("fail");
  nudge("The mechanism stays locked.");
  setTimeout(() => {
    resetAttempt();
    feedback.textContent = "Try the six values again.";
  }, 1250);
}

function updateDateDisplay() {
  dateValues.year.textContent = String(dateState.year);
  dateValues.month.textContent = pad(dateState.month);
  dateValues.day.textContent = pad(dateState.day);
  datePreview.year.textContent = String(dateState.year);
  datePreview.month.textContent = pad(dateState.month);
  datePreview.day.textContent = pad(dateState.day);
}

function stepDate(unit, delta) {
  playSound("date");

  if (unit === "year") {
    dateState.year = clamp(dateState.year + delta, 1800, 2099);
  }

  if (unit === "month") {
    dateState.month += delta;
    if (dateState.month > 12) {
      dateState.month = 1;
    }
    if (dateState.month < 1) {
      dateState.month = 12;
    }
  }

  if (unit === "day") {
    dateState.day += delta;
    if (dateState.day > 31) {
      dateState.day = 1;
    }
    if (dateState.day < 1) {
      dateState.day = 31;
    }
  }

  updateDateDisplay();
  flashDateUnit(unit);
  if (isCorrectDate()) {
    openClock();
  }
}

function flashDateUnit(unit) {
  const display = dateValues[unit];
  display.classList.remove("is-changing");
  requestAnimationFrame(() => display.classList.add("is-changing"));
  setTimeout(() => display.classList.remove("is-changing"), 220);
}

function isCorrectDate() {
  return dateState.year === 1945 && dateState.month === 1 && dateState.day === 27;
}

function openSafe() {
  if (safeOpened) {
    return;
  }

  safeOpened = true;
  playSound("unlock");
  closeZoom(true);
  document.body.classList.add("safe-is-open");
  unlocked.classList.add("is-open");
  unlocked.setAttribute("aria-hidden", "false");
}

function openClock() {
  if (clockOpened) {
    return;
  }

  clockOpened = true;
  playSound("unlock");
  dateZoom.classList.add("clock-is-open");
  clockSecret.classList.add("is-open");
  clockSecret.setAttribute("aria-hidden", "false");
}

function unlockAudio() {
  if (!audioContext) {
    const BrowserAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!BrowserAudioContext) {
      return;
    }
    audioContext = new BrowserAudioContext();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function tone(frequency, start, duration, gain = 0.08, type = "sine") {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now + start);
  envelope.gain.setValueAtTime(0.0001, now + start);
  envelope.gain.exponentialRampToValueAtTime(gain, now + start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
  oscillator.connect(envelope);
  envelope.connect(audioContext.destination);
  oscillator.start(now + start);
  oscillator.stop(now + start + duration + 0.02);
}

function playTick() {
  if (!audioContext || !active) {
    return;
  }

  clickNoise(0, 0.022, 0.055);
  tone(1350, 0, 0.018, 0.018, "square");
}

function playSound(name) {
  unlockAudio();

  if (name === "open") {
    clickNoise(0, 0.04, 0.05);
    tone(104, 0, 0.2, 0.052, "sawtooth");
    tone(58, 0.08, 0.24, 0.04, "sine");
  }

  if (name === "close") {
    clickNoise(0, 0.025, 0.04);
    tone(84, 0, 0.12, 0.04, "sine");
  }

  if (name === "commit") {
    clickNoise(0, 0.028, 0.1);
    clickNoise(0.045, 0.018, 0.055);
    tone(210, 0.025, 0.05, 0.04, "square");
  }

  if (name === "fail") {
    clickNoise(0, 0.04, 0.08);
    tone(150, 0, 0.18, 0.062, "sawtooth");
    tone(92, 0.12, 0.3, 0.048, "sawtooth");
  }

  if (name === "unlock") {
    clickNoise(0, 0.04, 0.08);
    clickNoise(0.11, 0.035, 0.07);
    tone(220, 0, 0.12, 0.058, "triangle");
    tone(330, 0.1, 0.14, 0.058, "triangle");
    tone(494, 0.22, 0.34, 0.066, "sine");
  }

  if (name === "date") {
    clickNoise(0, 0.018, 0.045);
    tone(700, 0, 0.018, 0.018, "square");
  }
}

function clickNoise(start, duration, gain = 0.06) {
  if (!audioContext) {
    return;
  }

  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = audioContext.createBufferSource();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;

  source.buffer = buffer;
  envelope.gain.setValueAtTime(gain, now + start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
  source.connect(envelope);
  envelope.connect(audioContext.destination);
  source.start(now + start);
}

function createNumbers() {
  for (let i = 0; i <= 26; i += 1) {
    const number = document.createElement("span");
    number.className = "num";
    number.textContent = pad(i);
    number.style.setProperty("--angle", `${i * (360 / 27)}deg`);
    numbers.appendChild(number);
  }
}

function createSparkles() {
  const layer = document.querySelector(".sparkles");
  for (let i = 0; i < 24; i += 1) {
    const bit = document.createElement("b");
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.top = `${Math.random() * 100}%`;
    bit.style.animationDelay = `${Math.random() * -4}s`;
    layer.appendChild(bit);
  }
}

safe.addEventListener("click", openZoom);
closeButton.addEventListener("click", closeZoom);
dateClock.addEventListener("click", openDateZoom);
dateCloseButton.addEventListener("click", closeDateZoom);
paper.addEventListener("click", () => {
  playSound("open");
  note.classList.add("is-open");
  note.setAttribute("aria-hidden", "false");
});

document.querySelectorAll("[data-date-step]").forEach((button) => {
  button.addEventListener("click", () => {
    unlockAudio();
    stepDate(button.dataset.dateStep, Number(button.dataset.dateDelta));
  });
});

dial.addEventListener("pointerdown", (event) => {
  active = true;
  previousAngle = angleFromEvent(event);
  dial.setPointerCapture(event.pointerId);
});

dial.addEventListener("pointermove", (event) => {
  if (!active) {
    return;
  }

  const nextAngle = angleFromEvent(event);
  const delta = shortestDelta(nextAngle, previousAngle);
  previousAngle = nextAngle;

  if (Math.abs(delta) > 0.2) {
    turnDirection = delta > 0 ? "cw" : "ccw";
  }

  setRotation(rotation + delta);
});

dial.addEventListener("pointerup", (event) => {
  active = false;
  dial.releasePointerCapture(event.pointerId);
});

dial.addEventListener("pointercancel", () => {
  active = false;
});

dial.addEventListener("click", (event) => {
  if (Date.now() < suppressDialClickUntil) {
    return;
  }

  const rect = dial.getBoundingClientRect();
  const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
  if (distance < rect.width * 0.18) {
    submitValue();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && zoom.classList.contains("is-open")) {
    closeZoom();
  }
  if (event.key === "Escape" && dateZoom.classList.contains("is-open")) {
    closeDateZoom();
  }
});

createNumbers();
createSparkles();
setRotation(0);
updateDateDisplay();
