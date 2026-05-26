const defaults = [
  "Glute bridge",
  "Lunges",
  "Dung tan",
  "Rowing",
  "Nang cao dui",
  "Dap xe"
];

const state = {
  exercises: [...defaults],
  workSeconds: 30,
  restSeconds: 15,
  totalMinutes: 15,
  steps: [],
  stepIndex: 0,
  remaining: 30,
  running: false,
  timerId: null,
  stepStartedAt: null
};

const els = {
  workSeconds: document.querySelector("#workSeconds"),
  restSeconds: document.querySelector("#restSeconds"),
  totalMinutes: document.querySelector("#totalMinutes"),
  exerciseList: document.querySelector("#exerciseList"),
  addExerciseBtn: document.querySelector("#addExerciseBtn"),
  restoreBtn: document.querySelector("#restoreBtn"),
  applyBtn: document.querySelector("#applyBtn"),
  startPauseBtn: document.querySelector("#startPauseBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  phaseLabel: document.querySelector("#phaseLabel"),
  roundLabel: document.querySelector("#roundLabel"),
  timeLeft: document.querySelector("#timeLeft"),
  currentExercise: document.querySelector("#currentExercise"),
  nextExercise: document.querySelector("#nextExercise"),
  progressCircle: document.querySelector("#progressCircle"),
  timelineFill: document.querySelector("#timelineFill"),
  totalTimeLabel: document.querySelector("#totalTimeLabel"),
  sessionSummary: document.querySelector("#sessionSummary")
};

const radius = 98;
const circumference = 2 * Math.PI * radius;
els.progressCircle.style.strokeDasharray = `${circumference}`;

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildSteps() {
  const exerciseNames = state.exercises.map((name) => name.trim()).filter(Boolean);
  state.exercises = exerciseNames.length ? exerciseNames : [...defaults];

  const targetSeconds = state.totalMinutes * 60;
  const steps = [];
  let elapsed = 0;
  let round = 1;
  let exerciseIndex = 0;

  while (elapsed < targetSeconds) {
    const exercise = state.exercises[exerciseIndex];
    const pair = [
      { type: "work", duration: state.workSeconds },
      { type: "rest", duration: state.restSeconds }
    ];

    for (const segment of pair) {
      if (segment.duration <= 0 || elapsed >= targetSeconds) continue;

      const duration = Math.min(segment.duration, targetSeconds - elapsed);
      steps.push({
        type: segment.type,
        exercise,
        duration,
        round,
        exerciseIndex
      });
      elapsed += duration;
    }

    exerciseIndex += 1;
    if (exerciseIndex >= state.exercises.length) {
      exerciseIndex = 0;
      round += 1;
    }
  }

  state.steps = steps;
  state.stepIndex = 0;
  state.remaining = state.steps[0]?.duration ?? state.workSeconds;
}

function renderExerciseList() {
  els.exerciseList.innerHTML = "";
  state.exercises.forEach((exercise, index) => {
    const item = document.createElement("div");
    item.className = "exercise-item";

    const order = document.createElement("span");
    order.textContent = index + 1;

    const input = document.createElement("input");
    input.type = "text";
    input.value = exercise;
    input.setAttribute("aria-label", `Bai tap ${index + 1}`);
    input.addEventListener("input", () => {
      state.exercises[index] = input.value;
    });

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.type = "button";
    remove.title = "Xoa bai tap";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      state.exercises.splice(index, 1);
      if (!state.exercises.length) state.exercises = [...defaults];
      renderExerciseList();
      applySettings();
    });

    item.append(order, input, remove);
    els.exerciseList.append(item);
  });
}

function currentStep() {
  return state.steps[state.stepIndex] ?? state.steps[0];
}

function totalSessionSeconds() {
  return state.steps.reduce((sum, step) => sum + step.duration, 0);
}

function elapsedSessionSeconds() {
  const completed = state.steps
    .slice(0, state.stepIndex)
    .reduce((sum, step) => sum + step.duration, 0);
  const step = currentStep();
  return completed + Math.max(0, (step?.duration ?? 0) - state.remaining);
}

function updateDisplay() {
  const step = currentStep();
  if (!step) return;

  const next = state.steps[state.stepIndex + 1] ?? state.steps[0];
  const isRest = step.type === "rest";
  const totalRounds = Math.max(...state.steps.map((item) => item.round));
  const stepProgress = 1 - state.remaining / step.duration;
  const sessionProgress = elapsedSessionSeconds() / totalSessionSeconds();

  els.phaseLabel.textContent = isRest ? "Nghi" : "Tap";
  els.phaseLabel.classList.toggle("rest", isRest);
  els.phaseLabel.classList.toggle("work", !isRest);
  els.roundLabel.textContent = `Vong ${step.round} / ${totalRounds}`;
  els.timeLeft.textContent = formatTime(state.remaining);
  els.currentExercise.textContent = isRest ? "Nghi ngan" : step.exercise;
  els.nextExercise.textContent = `Tiep theo: ${next.type === "rest" ? "Nghi" : next.exercise}`;
  els.progressCircle.classList.toggle("rest", isRest);
  els.progressCircle.style.strokeDashoffset = `${circumference * (1 - stepProgress)}`;
  els.timelineFill.style.width = `${Math.min(100, Math.max(0, sessionProgress * 100))}%`;
  els.totalTimeLabel.textContent = formatTime(totalSessionSeconds());
  els.sessionSummary.textContent = `${state.exercises.length} bai tap, ${totalRounds} vong, tong ${formatTime(totalSessionSeconds())}.`;
  els.startPauseBtn.textContent = state.running ? "Tam dung" : "Bat dau";
}

function beep() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Some browsers block audio until interaction; the timer still works.
  }
}

function stopTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
  state.running = false;
  state.stepStartedAt = null;
}

function moveStep(direction) {
  stopTimer();
  state.stepIndex = (state.stepIndex + direction + state.steps.length) % state.steps.length;
  state.remaining = currentStep().duration;
  updateDisplay();
}

function tick() {
  state.remaining -= 1;

  if (state.remaining <= 0) {
    state.stepIndex += 1;
    beep();

    if (state.stepIndex >= state.steps.length) {
      stopTimer();
      state.stepIndex = 0;
      state.remaining = currentStep().duration;
      updateDisplay();
      return;
    }

    state.remaining = currentStep().duration;
  }

  updateDisplay();
}

function startPause() {
  if (state.running) {
    stopTimer();
    updateDisplay();
    return;
  }

  state.running = true;
  state.timerId = window.setInterval(tick, 1000);
  updateDisplay();
}

function resetWorkout() {
  stopTimer();
  state.stepIndex = 0;
  state.remaining = currentStep().duration;
  updateDisplay();
}

function applySettings() {
  stopTimer();
  state.workSeconds = clampNumber(els.workSeconds.value, 5, 300, 30);
  state.restSeconds = clampNumber(els.restSeconds.value, 0, 180, 15);
  state.totalMinutes = clampNumber(els.totalMinutes.value, 1, 120, 15);
  state.exercises = [...els.exerciseList.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter(Boolean);

  els.workSeconds.value = state.workSeconds;
  els.restSeconds.value = state.restSeconds;
  els.totalMinutes.value = state.totalMinutes;

  buildSteps();
  renderExerciseList();
  updateDisplay();
}

els.addExerciseBtn.addEventListener("click", () => {
  state.exercises.push("Bai tap moi");
  renderExerciseList();
});

els.restoreBtn.addEventListener("click", () => {
  state.exercises = [...defaults];
  renderExerciseList();
  applySettings();
});

els.applyBtn.addEventListener("click", applySettings);
els.startPauseBtn.addEventListener("click", startPause);
els.resetBtn.addEventListener("click", resetWorkout);
els.prevBtn.addEventListener("click", () => moveStep(-1));
els.nextBtn.addEventListener("click", () => moveStep(1));

[els.workSeconds, els.restSeconds, els.totalMinutes].forEach((input) => {
  input.addEventListener("change", applySettings);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    startPause();
  }
  if (event.key === "ArrowRight") moveStep(1);
  if (event.key === "ArrowLeft") moveStep(-1);
});

buildSteps();
renderExerciseList();
updateDisplay();
