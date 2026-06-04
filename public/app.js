(function initGoldenSpin() {
  "use strict";

  const SEGMENTS = [
    { label: "100 FP" },
    { label: "200 FP" },
    { label: "300 FP" },
    { label: "500 FP" },
    { label: "1000 FP" },
    { label: "2000 FP" },
  ];

  const SEGMENT_COLORS = [
    ["#7b0017", "#d1113f", "#ff6b88"],
    ["#061a3a", "#1454b8", "#5fa6ff"],
    ["#2d1200", "#a45d08", "#ffd36a"],
    ["#061f18", "#0c7a51", "#60ffc0"],
    ["#240046", "#7b2cbf", "#d7a8ff"],
    ["#3b0900", "#cc3b11", "#ffb15e"],
  ];

  const CONFIG = {
    spinDuration: 6800,
    spinEasing: "cubic-bezier(0.12, 0.74, 0.08, 1)",
    minEmployeeLength: 1,
    maxEmployeeLength: 24,
    confettiCount: 130,
    coinCount: 46,
  };

  const state = {
    employeeId: "",
    currentRotation: 0,
    isSpinning: false,
  };

  const dom = {
    stars: document.getElementById("stars"),
    particles: document.getElementById("particles"),
    lightRing: document.getElementById("lightRing"),
    confetti: document.getElementById("confettiContainer"),
    coins: document.getElementById("coinContainer"),
    canvas: document.getElementById("wheelCanvas"),
    spinBtn: document.getElementById("spinBtn"),
    result: document.getElementById("resultEl"),
    idModal: document.getElementById("idModal"),
    idDisplay: document.getElementById("idDisplay"),
    idError: document.getElementById("idError"),
    idConfirm: document.getElementById("idConfirm"),
    idCancel: document.getElementById("idCancel"),
    winnerModal: document.getElementById("winnerModal"),
    winnerPrize: document.getElementById("winnerPrize"),
    winnerEmployee: document.getElementById("winnerEmployee"),
    closeWinner: document.getElementById("closeWinner"),
  };

  const ctx = dom.canvas.getContext("2d");

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function setLoading(isLoading) {
    state.isSpinning = isLoading;
    dom.spinBtn.disabled = isLoading;
    dom.spinBtn.dataset.loading = String(isLoading);
  }

  function showModal(modal) {
    modal.classList.remove("modal--hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function hideModal(modal) {
    modal.classList.add("modal--hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function resetIdEntry() {
    state.employeeId = "";
    dom.idError.textContent = "";
    updateIdDisplay();
  }

  function updateIdDisplay() {
    dom.idDisplay.textContent = state.employeeId || "Tap ID";
  }

  function appendDigit(digit) {
    if (state.employeeId.length >= CONFIG.maxEmployeeLength || state.isSpinning) return;
    state.employeeId += digit;
    dom.idError.textContent = "";
    updateIdDisplay();
  }

  function backspaceId() {
    if (state.isSpinning) return;
    state.employeeId = state.employeeId.slice(0, -1);
    updateIdDisplay();
  }

  function clearId() {
    if (state.isSpinning) return;
    state.employeeId = "";
    updateIdDisplay();
  }

  function isEnteredIdValid() {
    return state.employeeId.trim().length >= CONFIG.minEmployeeLength;
  }

  function resizeCanvas() {
    const rect = dom.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    if (dom.canvas.width !== width || dom.canvas.height !== height) {
      dom.canvas.width = width;
      dom.canvas.height = height;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel();
  }

  function drawWheel() {
    const rect = dom.canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const center = size / 2;
    const radius = center - size * 0.035;
    const segmentAngle = (Math.PI * 2) / SEGMENTS.length;

    ctx.clearRect(0, 0, rect.width, rect.height);

    SEGMENTS.forEach((segment, index) => {
      const start = index * segmentAngle;
      const end = start + segmentAngle;
      drawSegment(index, start, end, center, radius);
      drawLabel(segment.label, start, end, center, radius);
    });

    drawRim(center, radius);
  }

  function drawSegment(index, start, end, center, radius) {
    const colors = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
    const gradient = ctx.createRadialGradient(center, center, radius * 0.1, center, center, radius);
    gradient.addColorStop(0, colors[2]);
    gradient.addColorStop(0.46, colors[1]);
    gradient.addColorStop(1, colors[0]);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = Math.max(3, radius * 0.012);
    ctx.strokeStyle = "rgba(255, 235, 169, 0.92)";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fill();
    ctx.restore();
  }

  function drawLabel(label, start, end, center, radius) {
    const angle = (start + end) / 2;
    const fontSize = Math.max(18, Math.min(54, radius * 0.09));
    const labelRadius = radius * 0.66;
    const maxWidth = radius * 0.42;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${fontSize}px Montserrat, Arial, sans-serif`;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
    ctx.lineWidth = Math.max(5, fontSize * 0.2);
    ctx.fillStyle = "#fff7d6";
    ctx.shadowColor = "rgba(255, 220, 116, 0.9)";
    ctx.shadowBlur = fontSize * 0.24;
    ctx.strokeText(label, labelRadius, 0, maxWidth);
    ctx.fillText(label, labelRadius, 0, maxWidth);
    ctx.restore();
  }

  function drawRim(center, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.985, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(8, radius * 0.035);
    ctx.strokeStyle = "#ffe9a3";
    ctx.shadowColor = "rgba(255, 218, 102, 0.88)";
    ctx.shadowBlur = radius * 0.04;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.25, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(4, radius * 0.012);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.stroke();
    ctx.restore();
  }

  function getWinningSegment(rotation) {
    const segmentAngle = 360 / SEGMENTS.length;
    const pointerAngle = 270;
    const wheelAngleAtPointer = normalizeAngle(pointerAngle - rotation);
    return Math.floor(wheelAngleAtPointer / segmentAngle) % SEGMENTS.length;
  }

  function rotateWheelToSegment(targetSegmentIndex) {
    return new Promise((resolve) => {
      const segmentAngle = 360 / SEGMENTS.length;
      const pointerAngle = 270;
      const segmentCenter = targetSegmentIndex * segmentAngle + segmentAngle / 2;
      const desiredRotation = normalizeAngle(pointerAngle - segmentCenter);
      const currentBase = normalizeAngle(state.currentRotation);
      const delta = normalizeAngle(desiredRotation - currentBase);
      const fullRotations = 6 + Math.floor(Math.random() * 2);

      state.currentRotation += fullRotations * 360 + delta;
      dom.canvas.style.transition = `transform ${CONFIG.spinDuration}ms ${CONFIG.spinEasing}`;
      dom.canvas.style.transform = `rotate(${state.currentRotation}deg)`;

      window.setTimeout(() => {
        resolve(getWinningSegment(state.currentRotation));
      }, CONFIG.spinDuration);
    });
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  async function confirmEmployeeId() {
    const employeeId = state.employeeId.trim();

    if (!isEnteredIdValid()) {
      dom.idError.textContent = "Enter Player ID";
      return;
    }

    dom.idError.textContent = "Validating";
    dom.idConfirm.disabled = true;

    try {
      await requestJson("/api/check-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });

      hideModal(dom.idModal);
      await performSpin(employeeId);
    } catch (error) {
      dom.idError.textContent = error.message;
      setLoading(false);
    } finally {
      dom.idConfirm.disabled = false;
    }
  }

  async function performSpin(employeeId) {
    setLoading(true);
    dom.result.textContent = "";

    try {
      const data = await requestJson("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });

      const targetSegmentIndex = Number(data.segment);
      const awardedPrize = String(data.reward || "");
      const targetSegment = SEGMENTS[targetSegmentIndex];

      if (!targetSegment || targetSegment.label !== awardedPrize) {
        throw new Error("Prize mapping failed");
      }

      const winningIndex = await rotateWheelToSegment(targetSegmentIndex);

      if (winningIndex !== targetSegmentIndex || SEGMENTS[winningIndex].label !== awardedPrize) {
        throw new Error("Pointer result mismatch");
      }

      dom.result.textContent = `YOU WON ${awardedPrize}`;
      launchCelebration();
      showWinnerModal(awardedPrize, employeeId);
    } catch (error) {
      dom.result.textContent = error.message || "Spin failed";
      setLoading(false);
    }
  }

  function showWinnerModal(reward, employeeId) {
    dom.winnerPrize.textContent = reward;
    dom.winnerEmployee.textContent = employeeId;
    showModal(dom.winnerModal);
  }

  function finishWinner() {
    hideModal(dom.winnerModal);
    resetIdEntry();
    setLoading(false);
    dom.result.textContent = "";
  }

  function launchCelebration() {
    launchConfetti();
    launchCoins();
  }

  function launchConfetti() {
    const colors = ["#fff7bd", "#ffd45e", "#d6a432", "#ffffff", "#f2c14e"];

    for (let i = 0; i < CONFIG.confettiCount; i += 1) {
      const piece = document.createElement("div");
      const width = 8 + Math.random() * 18;
      const height = 14 + Math.random() * 30;
      const startX = 8 + Math.random() * 84;
      const delay = Math.random() * 280;
      const duration = 1300 + Math.random() * 1900;
      const drift = -36 + Math.random() * 72;

      piece.className = "confetti-piece";
      piece.style.left = `${startX}%`;
      piece.style.top = "-5vh";
      piece.style.width = `${width}px`;
      piece.style.height = `${height}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      dom.confetti.appendChild(piece);

      piece.animate(
        [
          { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate3d(${drift}vw, 112vh, 0) rotate(${720 + Math.random() * 900}deg)`, opacity: 0 },
        ],
        { duration, delay, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)", fill: "forwards" }
      ).onfinish = () => piece.remove();
    }
  }

  function launchCoins() {
    for (let i = 0; i < CONFIG.coinCount; i += 1) {
      const coin = document.createElement("div");
      const direction = (Math.PI * 2 * i) / CONFIG.coinCount;
      const distance = 22 + Math.random() * 44;
      const x = Math.cos(direction) * distance;
      const y = Math.sin(direction) * distance - 12;
      const duration = 1050 + Math.random() * 1100;

      coin.className = "coin";
      coin.style.left = `${48 + Math.random() * 4}%`;
      coin.style.top = `${45 + Math.random() * 8}%`;
      dom.coins.appendChild(coin);

      coin.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.45) rotateY(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh)) scale(1) rotateY(900deg)`, opacity: 0 },
        ],
        { duration, easing: "cubic-bezier(0.16, 0.9, 0.22, 1)", fill: "forwards" }
      ).onfinish = () => coin.remove();
    }
  }

  function createStars() {
    const count = Math.min(180, Math.round((window.innerWidth * window.innerHeight) / 18000));
    dom.stars.textContent = "";

    for (let i = 0; i < count; i += 1) {
      const star = document.createElement("span");
      star.className = "star";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      dom.stars.appendChild(star);
    }
  }

  function createParticles() {
    const count = 70;
    dom.particles.textContent = "";

    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("span");
      particle.className = "particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${7 + Math.random() * 8}s`;
      particle.style.animationDelay = `${Math.random() * 8}s`;
      dom.particles.appendChild(particle);
    }
  }

  function createLightRing() {
    const count = 72;
    dom.lightRing.textContent = "";

    for (let i = 0; i < count; i += 1) {
      const angle = ((Math.PI * 2) / count) * i - Math.PI / 2;
      const light = document.createElement("span");
      light.className = "light";
      light.style.left = `${50 + Math.cos(angle) * 50}%`;
      light.style.top = `${50 + Math.sin(angle) * 50}%`;
      light.style.animationDelay = `${(i % 12) * 0.08}s`;
      dom.lightRing.appendChild(light);
    }
  }

  function handleKeypadClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const digit = button.dataset.key;
    const action = button.dataset.action;

    if (digit) appendDigit(digit);
    if (action === "clear") clearId();
    if (action === "backspace") backspaceId();
  }

  function setupBrandingFallbacks() {
    document.querySelectorAll(".brand-slot__logo").forEach((logo) => {
      const slot = logo.closest(".brand-slot");
      logo.addEventListener("error", () => {
        logo.style.display = "none";
        if (slot) slot.classList.add("brand-slot--fallback");
      });
      logo.addEventListener("load", () => {
        if (slot) slot.classList.remove("brand-slot--fallback");
      });
    });

    document.querySelectorAll(".anniversary-badge__logo").forEach((logo) => {
      logo.addEventListener("error", () => {
        logo.style.display = "none";
      });
    });
  }

  function setupEvents() {
    dom.spinBtn.addEventListener("click", () => {
      if (state.isSpinning) return;
      resetIdEntry();
      showModal(dom.idModal);
    });

    dom.idModal.addEventListener("click", handleKeypadClick);
    dom.idConfirm.addEventListener("click", confirmEmployeeId);
    dom.idCancel.addEventListener("click", () => hideModal(dom.idModal));
    dom.closeWinner.addEventListener("click", finishWinner);

    window.addEventListener("resize", () => {
      createLightRing();
      resizeCanvas();
    });
  }

  function init() {
    setupBrandingFallbacks();
    createStars();
    createParticles();
    createLightRing();
    resizeCanvas();
    setupEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
