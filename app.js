const seedImages = [
  "assets/exercises/nang-hong.jpg",
  "assets/exercises/chung-chan.jpg",
  "assets/exercises/dung-tan.jpg",
  "assets/exercises/rowing.jpg",
  "assets/exercises/nang-cao-dui.jpg",
  "assets/exercises/dap-xe.jpg"
];

const defaultNames = [
  "Nâng hông",
  "Chùng chân",
  "Đứng tấn",
  "Rowing xoay chân",
  "Nâng cao đùi",
  "Đạp xe",
  "Squat",
  "Lunge ngược",
  "Donkey kick",
  "Fire hydrant",
  "Wall sit",
  "Calf raise"
];

function createExerciseImage(name, index = 0) {
  const colors = [
    ["#1f8f68", "#e9f6f1"],
    ["#124f7a", "#eaf3f8"],
    ["#d9812b", "#fff3e6"],
    ["#7b4bb3", "#f3eef9"],
    ["#b64040", "#fff0f0"],
    ["#4f6f52", "#edf5ee"]
  ];
  const [accent, bg] = colors[index % colors.length];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="18" fill="${bg}"/>
      <circle cx="120" cy="82" r="26" fill="${accent}" opacity="0.88"/>
      <path d="M76 184c10-38 28-58 52-58 22 0 40 20 52 58" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      <path d="M72 132h96M88 104l-28 34M152 104l28 34" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      <text x="120" y="218" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="${accent}">${initials || "BT"}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const defaults = defaultNames.map((name, index) => ({
  name,
  image: seedImages[index] || createExerciseImage(name, index)
}));

const pelvicDefaults = [
  {
    name: "Kegel",
    squeezeSeconds: 1,
    releaseSeconds: 1,
    workBlockSeconds: 30,
    restSeconds: 10,
    totalMinutes: 3
  }
];

const state = {
  mode: "workout",
  exercises: defaults.map((exercise) => ({ ...exercise })),
  pelvicExercises: pelvicDefaults.map((exercise) => ({ ...exercise })),
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
  modeEyebrow: document.querySelector("#modeEyebrow"),
  modeTitle: document.querySelector("#modeTitle"),
  settingsTitle: document.querySelector("#settingsTitle"),
  workoutModeBtn: document.querySelector("#workoutModeBtn"),
  pelvicModeBtn: document.querySelector("#pelvicModeBtn"),
  workoutSettings: document.querySelector("#workoutSettings"),
  pelvicSettings: document.querySelector("#pelvicSettings"),
  pelvicList: document.querySelector("#pelvicList"),
  pelvicTemplate: document.querySelector("#pelvicTemplate"),
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
  exerciseImage: document.querySelector("#exerciseImage"),
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
  if (state.mode === "pelvic") {
    buildPelvicSteps();
    return;
  }

  const exercises = state.exercises
    .map((exercise, index) => ({
      name: exercise.name.trim(),
      image: exercise.image || defaults[index % defaults.length].image
    }))
    .filter((exercise) => exercise.name);
  state.exercises = exercises.length ? exercises : defaults.map((exercise) => ({ ...exercise }));

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
        exercise: exercise.name,
        image: exercise.image,
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

function fallbackImage(index, name = "Bài tập mới") {
  return defaults[index % defaults.length]?.image || createExerciseImage(name, index);
}

function swapExercises(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= state.exercises.length) return;
  stopTimer();
  const [exercise] = state.exercises.splice(fromIndex, 1);
  state.exercises.splice(toIndex, 0, exercise);
  renderExerciseList();
  buildSteps();
  updateDisplay();
}

function updateExerciseImage(index, image, thumb, imageInput) {
  state.exercises[index].image = image || fallbackImage(index, state.exercises[index].name);
  thumb.src = state.exercises[index].image;
  imageInput.value = state.exercises[index].image.startsWith("data:") ? "" : state.exercises[index].image;
  applySettings();
}

function buildPelvicSteps() {
  const routines = state.pelvicExercises
    .map((routine) => ({
      name: routine.name.trim(),
      squeezeSeconds: clampNumber(routine.squeezeSeconds, 1, 30, 1),
      releaseSeconds: clampNumber(routine.releaseSeconds, 1, 30, 1),
      workBlockSeconds: clampNumber(routine.workBlockSeconds, 2, 300, 30),
      restSeconds: clampNumber(routine.restSeconds, 0, 300, 10),
      totalMinutes: clampNumber(routine.totalMinutes, 1, 60, 3)
    }))
    .filter((routine) => routine.name);
  state.pelvicExercises = routines.length ? routines : pelvicDefaults.map((routine) => ({ ...routine }));

  const steps = [];
  state.pelvicExercises.forEach((routine, routineIndex) => {
    const targetSeconds = routine.totalMinutes * 60;
    let elapsed = 0;
    let block = 1;

    while (elapsed < targetSeconds) {
      let blockElapsed = 0;

      while (blockElapsed < routine.workBlockSeconds && elapsed < targetSeconds) {
        const squeezeDuration = Math.min(routine.squeezeSeconds, routine.workBlockSeconds - blockElapsed, targetSeconds - elapsed);
        if (squeezeDuration > 0) {
          steps.push({
            type: "squeeze",
            exercise: routine.name,
            duration: squeezeDuration,
            round: block,
            routineIndex
          });
          elapsed += squeezeDuration;
          blockElapsed += squeezeDuration;
        }

        const releaseDuration = Math.min(routine.releaseSeconds, routine.workBlockSeconds - blockElapsed, targetSeconds - elapsed);
        if (releaseDuration > 0) {
          steps.push({
            type: "release",
            exercise: routine.name,
            duration: releaseDuration,
            round: block,
            routineIndex
          });
          elapsed += releaseDuration;
          blockElapsed += releaseDuration;
        }
      }

      if (routine.restSeconds > 0 && elapsed < targetSeconds) {
        const restDuration = Math.min(routine.restSeconds, targetSeconds - elapsed);
        steps.push({
          type: "block-rest",
          exercise: routine.name,
          duration: restDuration,
          round: block,
          routineIndex
        });
        elapsed += restDuration;
      }

      block += 1;
    }
  });

  state.steps = steps;
  state.stepIndex = 0;
  state.remaining = state.steps[0]?.duration ?? 1;
}

function renderExerciseList() {
  els.exerciseList.innerHTML = "";
  state.exercises.forEach((exercise, index) => {
    const item = document.createElement("div");
    item.className = "exercise-item";

    const order = document.createElement("span");
    order.textContent = index + 1;

    const thumb = document.createElement("img");
    thumb.className = "exercise-thumb";
    thumb.src = exercise.image || fallbackImage(index, exercise.name);
    thumb.alt = `Minh họa ${exercise.name}`;

    const fields = document.createElement("div");
    fields.className = "exercise-fields";

    const nameInput = document.createElement("input");
    nameInput.className = "exercise-name";
    nameInput.type = "text";
    nameInput.value = exercise.name;
    nameInput.setAttribute("aria-label", `Bài tập ${index + 1}`);
    nameInput.addEventListener("input", () => {
      state.exercises[index].name = nameInput.value;
      thumb.alt = `Minh họa ${nameInput.value}`;
      if (!state.exercises[index].image || state.exercises[index].image.startsWith("data:")) {
        state.exercises[index].image = createExerciseImage(nameInput.value, index);
        thumb.src = state.exercises[index].image;
      }
    });

    const imageInput = document.createElement("input");
    imageInput.className = "exercise-image-input";
    imageInput.type = "url";
    imageInput.placeholder = "Dán link ảnh hoặc chọn file";
    imageInput.value = exercise.image?.startsWith("data:") ? "" : exercise.image || "";
    imageInput.setAttribute("aria-label", `Ảnh cho bài ${index + 1}`);
    imageInput.addEventListener("change", () => {
      updateExerciseImage(index, imageInput.value.trim(), thumb, imageInput);
    });

    const fileLabel = document.createElement("label");
    fileLabel.className = "file-btn";
    fileLabel.textContent = "Ảnh";
    fileLabel.title = "Chọn ảnh từ máy";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        updateExerciseImage(index, String(reader.result), thumb, imageInput);
      });
      reader.readAsDataURL(file);
    });
    fileLabel.append(fileInput);

    const imageRow = document.createElement("div");
    imageRow.className = "exercise-image-row";
    imageRow.append(imageInput, fileLabel);
    fields.append(nameInput, imageRow);

    const moveUp = document.createElement("button");
    moveUp.className = "move-btn";
    moveUp.type = "button";
    moveUp.title = "Đưa bài lên trên";
    moveUp.textContent = "↑";
    moveUp.disabled = index === 0;
    moveUp.addEventListener("click", () => swapExercises(index, index - 1));

    const moveDown = document.createElement("button");
    moveDown.className = "move-btn";
    moveDown.type = "button";
    moveDown.title = "Đưa bài xuống dưới";
    moveDown.textContent = "↓";
    moveDown.disabled = index === state.exercises.length - 1;
    moveDown.addEventListener("click", () => swapExercises(index, index + 1));

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.type = "button";
    remove.title = "Xóa bài tập";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      state.exercises.splice(index, 1);
      if (!state.exercises.length) state.exercises = defaults.map((item) => ({ ...item }));
      renderExerciseList();
      applySettings();
    });

    item.append(order, thumb, fields, moveUp, moveDown, remove);
    els.exerciseList.append(item);
  });
}

function renderPelvicList() {
  els.pelvicList.innerHTML = "";
  state.pelvicExercises.forEach((routine, index) => {
    const item = els.pelvicTemplate.content.firstElementChild.cloneNode(true);
    const name = item.querySelector(".pelvic-name");
    const squeeze = item.querySelector(".pelvic-squeeze");
    const release = item.querySelector(".pelvic-release");
    const workBlock = item.querySelector(".pelvic-work-block");
    const rest = item.querySelector(".pelvic-rest");
    const total = item.querySelector(".pelvic-total");
    const reps = item.querySelector(".pelvic-reps");

    name.value = routine.name;
    squeeze.value = routine.squeezeSeconds;
    release.value = routine.releaseSeconds;
    workBlock.value = routine.workBlockSeconds;
    rest.value = routine.restSeconds;
    total.value = routine.totalMinutes;
    reps.value = Math.ceil((routine.totalMinutes * 60) / (routine.workBlockSeconds + routine.restSeconds));

    name.addEventListener("input", () => {
      state.pelvicExercises[index].name = name.value;
    });
    squeeze.addEventListener("input", () => {
      state.pelvicExercises[index].squeezeSeconds = squeeze.value;
    });
    release.addEventListener("input", () => {
      state.pelvicExercises[index].releaseSeconds = release.value;
    });
    workBlock.addEventListener("input", () => {
      state.pelvicExercises[index].workBlockSeconds = workBlock.value;
      reps.value = Math.ceil((Number(total.value) * 60) / (Number(workBlock.value) + Number(rest.value)));
    });
    rest.addEventListener("input", () => {
      state.pelvicExercises[index].restSeconds = rest.value;
      reps.value = Math.ceil((Number(total.value) * 60) / (Number(workBlock.value) + Number(rest.value)));
    });
    total.addEventListener("input", () => {
      state.pelvicExercises[index].totalMinutes = total.value;
      reps.value = Math.ceil((Number(total.value) * 60) / (Number(workBlock.value) + Number(rest.value)));
    });

    els.pelvicList.append(item);
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
  const isRest = step.type === "rest" || step.type === "release" || step.type === "block-rest";
  const isPelvic = state.mode === "pelvic";
  const totalRounds = Math.max(...state.steps.map((item) => item.round));
  const stepProgress = 1 - state.remaining / step.duration;
  const sessionProgress = elapsedSessionSeconds() / totalSessionSeconds();

  els.modeEyebrow.textContent = isPelvic ? "Siết và thả" : "Tập tại nhà";
  els.modeTitle.textContent = isPelvic ? "Cơ sàn chậu" : "Mông & Chân";
  els.phaseLabel.textContent = isPelvic
    ? (step.type === "block-rest" ? "Nghỉ" : (isRest ? "Thả" : "Siết"))
    : (isRest ? "Nghỉ" : "Tập");
  els.phaseLabel.classList.toggle("rest", isRest);
  els.phaseLabel.classList.toggle("work", !isRest);
  els.roundLabel.textContent = isPelvic
    ? `Block ${step.round} - ${formatTime(elapsedSessionSeconds())} / ${formatTime(totalSessionSeconds())}`
    : `Vòng ${step.round} / ${totalRounds}`;
  els.timeLeft.textContent = formatTime(state.remaining);
  els.currentExercise.textContent = isPelvic
    ? (step.type === "block-rest" ? "Nghỉ giữa block" : (isRest ? "Thả lỏng cơ" : "Siết cơ sàn chậu"))
    : (isRest ? "Nghỉ ngắn" : step.exercise);
  els.exerciseImage.hidden = isPelvic;
  if (!isPelvic) {
    els.exerciseImage.src = step.image;
    els.exerciseImage.alt = `Minh họa bài ${step.exercise}`;
    els.exerciseImage.classList.toggle("resting", isRest);
  }
  els.nextExercise.textContent = isPelvic
    ? `${step.exercise} - tiếp theo: ${next.type === "block-rest" ? "Nghỉ" : (next.type === "release" ? "Thả" : "Siết")}`
    : `Tiếp theo: ${next.type === "rest" ? "Nghỉ" : next.exercise}`;
  els.progressCircle.classList.toggle("rest", isRest);
  els.progressCircle.style.strokeDashoffset = `${circumference * (1 - stepProgress)}`;
  els.timelineFill.style.width = `${Math.min(100, Math.max(0, sessionProgress * 100))}%`;
  els.totalTimeLabel.textContent = formatTime(totalSessionSeconds());
  els.sessionSummary.textContent = isPelvic
    ? `${state.pelvicExercises.length} bài, tổng ${formatTime(totalSessionSeconds())}.`
    : `${state.exercises.length} bài tập, ${totalRounds} vòng, tổng ${formatTime(totalSessionSeconds())}.`;
  els.startPauseBtn.textContent = state.running ? "Tạm dừng" : "Bắt đầu";
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
  if (state.mode === "pelvic") {
    state.pelvicExercises = [...els.pelvicList.querySelectorAll(".pelvic-item")]
      .map((item) => ({
        name: item.querySelector(".pelvic-name").value.trim(),
        squeezeSeconds: item.querySelector(".pelvic-squeeze").value,
        releaseSeconds: item.querySelector(".pelvic-release").value,
        workBlockSeconds: item.querySelector(".pelvic-work-block").value,
        restSeconds: item.querySelector(".pelvic-rest").value,
        totalMinutes: item.querySelector(".pelvic-total").value
      }))
      .filter((routine) => routine.name);
    buildSteps();
    renderPelvicList();
    updateDisplay();
    return;
  }

  state.workSeconds = clampNumber(els.workSeconds.value, 5, 300, 30);
  state.restSeconds = clampNumber(els.restSeconds.value, 0, 180, 15);
  state.totalMinutes = clampNumber(els.totalMinutes.value, 1, 120, 15);
  state.exercises = [...els.exerciseList.querySelectorAll(".exercise-item")]
    .map((item, index) => {
      const name = item.querySelector(".exercise-name").value.trim();
      const typedImage = item.querySelector(".exercise-image-input").value.trim();
      return {
        name,
        image: typedImage || state.exercises[index]?.image || fallbackImage(index, name)
      };
    })
    .filter((exercise) => exercise.name);

  els.workSeconds.value = state.workSeconds;
  els.restSeconds.value = state.restSeconds;
  els.totalMinutes.value = state.totalMinutes;

  buildSteps();
  renderExerciseList();
  updateDisplay();
}

function setMode(mode) {
  stopTimer();
  state.mode = mode;
  els.workoutModeBtn.classList.toggle("active", mode === "workout");
  els.pelvicModeBtn.classList.toggle("active", mode === "pelvic");
  els.workoutSettings.classList.toggle("hidden", mode !== "workout");
  els.pelvicSettings.classList.toggle("hidden", mode !== "pelvic");
  els.addExerciseBtn.hidden = mode === "pelvic";
  els.settingsTitle.textContent = mode === "pelvic" ? "Cơ sàn chậu" : "Tùy chỉnh";
  els.restoreBtn.textContent = mode === "pelvic" ? "Khôi phục bài sàn chậu" : "Khôi phục bài mặc định";
  buildSteps();
  updateDisplay();
}

els.addExerciseBtn.addEventListener("click", () => {
  const nextDefault = defaults[state.exercises.length % defaults.length];
  const exists = new Set(state.exercises.map((exercise) => exercise.name));
  const unusedDefault = defaults.find((exercise) => !exists.has(exercise.name));
  const nextExercise = unusedDefault || {
    name: `Bài tập mới ${state.exercises.length + 1}`,
    image: createExerciseImage(`Bài tập mới ${state.exercises.length + 1}`, state.exercises.length)
  };
  state.exercises.push({ ...(nextExercise || nextDefault) });
  renderExerciseList();
  applySettings();
});

els.restoreBtn.addEventListener("click", () => {
  if (state.mode === "pelvic") {
    state.pelvicExercises = pelvicDefaults.map((routine) => ({ ...routine }));
    renderPelvicList();
  } else {
    state.exercises = defaults.map((exercise) => ({ ...exercise }));
    renderExerciseList();
  }
  applySettings();
});

els.workoutModeBtn.addEventListener("click", () => setMode("workout"));
els.pelvicModeBtn.addEventListener("click", () => setMode("pelvic"));
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
renderPelvicList();
updateDisplay();
