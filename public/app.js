/**
 * COSMO GOLDEN SPIN - Production-Ready Frontend (WheelOfNames Style)
 * ================================================
 * Features:
 * - Fixed segment structure with labels and weights
 * - Weighted random selection
 * - Pointer-based result determination
 * - Responsive design (mobile to 4K)
 * - Complete state management
 * - Accessibility compliant
 * - Performance optimized
 */

(function initApp() {
  "use strict";

  // ==================== WHEEL SEGMENTS (FIXED) ====================
  const SEGMENTS = [
    { label: "100 FP", weight: 40 },
    { label: "200 FP", weight: 25 },
    { label: "300 FP", weight: 15 },
    { label: "500 FP", weight: 10 },
    { label: "1000 FP", weight: 7 },
    { label: "2000 FP", weight: 3 },
  ];

  const CONFIG = {
    // Wheel settings
    SEGMENT_COUNT: SEGMENTS.length,
    SPIN_DURATION: 6500, // milliseconds
    SPIN_EASING: "cubic-bezier(0.17, 0.67, 0.12, 0.99)",
    CONFETTI_COUNT: 35,
    CONFETTI_DURATION_MIN: 1200,
    CONFETTI_DURATION_MAX: 1800,

    // Animation settings
    MODAL_ANIMATION_DURATION: 300,
    LIGHTS_PULSE_DURATION: 2400,
    LIGHTS_ROTATION_DURATION: 10000,

    // Timing constants
    DEBOUNCE_DELAY: 300,
    ANIMATION_FRAME_RATE: 60,
  };

  // Color palette - used for segments
  const SEGMENT_COLORS = [
    "#ff006e",
    "#2dc653",
    "#8338ec",
    "#fb5607",
    "#3a86ff",
    "#38b000",
    "#ffbe0b",
    "#fb5607",
  ];

  const CONFETTI_COLORS = ["#ffd36b", "#e6c07a", "#fff7d3"];

  // ==================== DOM ELEMENTS ====================
  const DOM = {
    // Containers
    stars: document.getElementById("stars"),
    particles: document.getElementById("particles"),
    lightRing: document.getElementById("lightRing"),
    confettiContainer: document.getElementById("confettiContainer"),

    // Wheel
    wheel: document.getElementById("wheelEl"),
    segments: document.getElementById("segmentsEl"),
    wheelCenter: document.querySelector(".wheel__center"),

    // Controls
    spinBtn: document.getElementById("spinBtn"),
    result: document.getElementById("resultEl"),

    // Modals
    idModal: document.getElementById("idModal"),
    idInput: document.getElementById("idInput"),
    idValidate: document.getElementById("idValidate"),
    idCancel: document.getElementById("idCancel"),
    idError: document.getElementById("idError"),

    winnerModal: document.getElementById("winnerModal"),
    winnerPrize: document.getElementById("winnerPrize"),
    claimEmployee: document.getElementById("claimEmployee"),
    claimBtn: document.getElementById("claimBtn"),
    closeWinner: document.getElementById("closeWinner"),
    claimError: document.getElementById("claimError"),

    successModal: document.getElementById("successModal"),
    sEmp: document.getElementById("sEmp"),
    sReward: document.getElementById("sReward"),
    sTime: document.getElementById("sTime"),
    closeSuccess: document.getElementById("closeSuccess"),
  };

  // ==================== APPLICATION STATE ====================
  const STATE = {
    isSpinning: false,
    currentRotation: 0,
    employeeId: null,
    rewards: [],
    segmentMap: [], // Maps segment index to reward
    lastSpinTime: 0,
    animationFrameId: null,
  };

  // ==================== UTILITIES ====================

  /**
   * Validates employee ID format
   * @param {string} id - Employee ID
   * @returns {boolean}
   */
  function isValidEmployeeId(id) {
    return /^emp\d{3}$/i.test((id || "").trim());
  }

  /**
   * Creates debounced function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timeoutId = null;
    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Normalizes angle to 0-360 range
   * @param {number} angle - Angle in degrees
   * @returns {number}
   */
  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  /**
   * Calculates winning segment based on current wheel rotation
   * Pointer is at top (0 degrees), so we calculate which segment is there
   * @returns {number} Segment index (0-SEGMENT_COUNT)
   */
  function getWinningSegmentFromRotation(totalRotation) {
    const normalizedRotation = normalizeAngle(totalRotation);
    const segmentAngle = 360 / CONFIG.SEGMENT_COUNT;
    // Calculate which segment is at the pointer position
    const segmentIndex = Math.round(normalizedRotation / segmentAngle) % CONFIG.SEGMENT_COUNT;
    return segmentIndex;
  }

  /**
   * Formats timestamp for display
   * @param {string} isoString - ISO timestamp
   * @returns {string}
   */
  function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // ==================== BACKGROUND ANIMATION ====================

  /**
   * Creates background star field
   */
  function createStarField() {
    const starCount = Math.min(300, window.innerWidth > 1024 ? 300 : 150);
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div");
      star.className = "star";
      star.style.left = Math.random() * 100 + "%";
      star.style.top = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 3 + "s";
      DOM.stars.appendChild(star);
    }
  }

  /**
   * Creates background particle effects
   */
  function createParticleField() {
    const particleCount = Math.min(180, window.innerWidth > 1024 ? 180 : 100);
    const particleColors = ["#ffd700", "#ff006e", "#00d4ff", "#7bff00"];
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDelay = Math.random() * 5 + "s";
      p.style.background = particleColors[Math.floor(Math.random() * particleColors.length)];
      DOM.particles.appendChild(p);
    }
  }

  /**
   * Creates rotating lights ring
   */
  function createLightRing() {
    const lightCount = window.innerWidth > 768 ? 64 : 32;
    const radius = window.innerWidth > 768 ? 430 : 250;

    for (let i = 0; i < lightCount; i++) {
      const light = document.createElement("div");
      light.className = "light";
      const angle = (360 / lightCount) * i;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const y = Math.sin((angle * Math.PI) / 180) * radius;
      light.style.left = `calc(50% + ${x}px)`;
      light.style.top = `calc(50% + ${y}px)`;
      DOM.lightRing.appendChild(light);
    }
  }

  // ==================== WHEEL BUILDING ====================

  /**
   * Builds wheel segments based on rewards from server
   * @param {Array} rewardsList - List of rewards from server
   */
  function buildSegments(rewardsList) {
    STATE.segmentMap = [];
    DOM.segments.innerHTML = "";

    if (!rewardsList || rewardsList.length === 0) {
      console.error("No rewards available");
      return;
    }

    // Create segment cycle: map rewards to segment indices
    let rewardIndex = 0;
    for (let i = 0; i < CONFIG.SEGMENT_COUNT; i++) {
      const reward = rewardsList[rewardIndex % rewardsList.length];
      STATE.segmentMap.push(reward);
      rewardIndex++;
    }

    // Build segment DOM elements
    const segmentAngle = 360 / CONFIG.SEGMENT_COUNT;

    for (let i = 0; i < CONFIG.SEGMENT_COUNT; i++) {
      const segment = document.createElement("div");
      segment.className = "segment";
      segment.style.background = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      segment.style.transform = `rotate(${i * segmentAngle}deg) skewY(${90 - segmentAngle}deg)`;

      const text = document.createElement("span");
      text.className = "segment__text";
      const reward = STATE.segmentMap[i];
      text.textContent = reward;
      text.style.transform = `skewY(-${90 - segmentAngle}deg) rotate(${segmentAngle / 2}deg)`;

      segment.appendChild(text);
      DOM.segments.appendChild(segment);
    }

    console.log("Segments built:", STATE.segmentMap);
  }

  /**
   * Fetches rewards from server and builds segments
   */
  async function loadRewards() {
    try {
      const response = await fetch("/api/dashboard");
      const data = await response.json();

      if (!Array.isArray(data.remaining)) {
        throw new Error("Invalid rewards format");
      }

      // Extract reward names from remaining list
      const rewardNames = data.remaining.map((r) => r.reward);
      buildSegments(rewardNames);

      return rewardNames;
    } catch (error) {
      console.error("Failed to load rewards:", error);
      // Fallback to default rewards
      const defaultRewards = ["100 FP", "200 FP", "300 FP", "500 FP", "1000 FP", "2000 FP"];
      buildSegments(defaultRewards);
      return defaultRewards;
    }
  }

  // ==================== MODAL MANAGEMENT ====================

  /**
   * Shows modal with proper visibility management
   * @param {HTMLElement} modal - Modal element
   */
  function showModal(modal) {
    modal.classList.remove("modal--hidden");
    modal.setAttribute("aria-hidden", "false");
    // Focus first input if available
    const input = modal.querySelector("input");
    if (input) {
      setTimeout(() => input.focus(), CONFIG.MODAL_ANIMATION_DURATION);
    }
  }

  /**
   * Hides modal with proper visibility management
   * @param {HTMLElement} modal - Modal element
   */
  function hideModal(modal) {
    modal.classList.add("modal--hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  /**
   * Shows ID validation modal
   */
  function showIdModal() {
    DOM.idInput.value = "";
    DOM.idError.textContent = "";
    showModal(DOM.idModal);
  }

  /**
   * Shows winner display modal
   * @param {string} reward - Winning reward
   * @param {string} employeeId - Employee ID
   */
  function showWinnerModal(reward, employeeId) {
    DOM.winnerPrize.textContent = reward;
    DOM.claimEmployee.value = employeeId;
    DOM.claimError.textContent = "";
    showModal(DOM.winnerModal);
  }

  /**
   * Shows success/claim confirmation modal
   * @param {string} employeeId - Employee ID
   * @param {string} reward - Reward claimed
   * @param {string} timestamp - Claim timestamp
   */
  function showSuccessModal(employeeId, reward, timestamp) {
    DOM.sEmp.textContent = employeeId;
    DOM.sReward.textContent = reward;
    DOM.sTime.textContent = formatTimestamp(timestamp);
    showModal(DOM.successModal);
  }

  // ==================== CONFETTI EFFECTS ====================

  /**
   * Launches confetti animation on win
   */
  function launchConfetti() {
    for (let i = 0; i < CONFIG.CONFETTI_COUNT; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";

      // Random position across top 30% of screen
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.top = Math.random() * 30 + "%";

      // Random size
      const size = 6 + Math.random() * 10;
      confetti.style.width = size + "px";
      confetti.style.height = size + "px";

      // Random color
      confetti.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

      DOM.confettiContainer.appendChild(confetti);

      // Animate confetti
      const duration = CONFIG.CONFETTI_DURATION_MIN + Math.random() * CONFIG.CONFETTI_DURATION_MAX;
      const rotations = 720 + Math.random() * 720;
      const yDistance = 300 + Math.random() * 300;

      confetti.animate(
        [
          {
            transform: "translateY(0) rotate(0deg)",
            opacity: 1,
          },
          {
            transform: `translateY(${yDistance}px) rotate(${rotations}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: duration,
          easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
          fill: "forwards",
        }
      ).onfinish = () => confetti.remove();
    }
  }

  // ==================== WHEEL SPINNING LOGIC ====================

  /**
   * Rotates wheel to specific segment with animation
   * This is the core wheel algorithm
   *
   * Algorithm explanation:
   * 1. Add 4-8 full rotations for dramatic effect
   * 2. Calculate additional rotation to land on target segment
   * 3. Ensure precise pointer-segment alignment
   *
   * Pointer position: top (0 degrees)
   * Segment 0: starts at 0 degrees, ends at segmentAngle
   * Final rotation must place target segment's CENTER at pointer
   *
   * @param {number} segmentIndex - Target segment index (0-13)
   * @returns {Promise}
   */
  async function rotateWheelToSegment(segmentIndex) {
    return new Promise((resolve) => {
      if (STATE.isSpinning) {
        console.warn("Spin already in progress");
        resolve();
        return;
      }

      STATE.isSpinning = true;

      const segmentAngle = 360 / CONFIG.SEGMENT_COUNT;
      const segmentCenter = segmentAngle / 2;

      // Calculate target rotation
      // Each segment is rotated by its index * segmentAngle
      // We want the segment center to be at pointer (top = 0 degrees in the wheel's frame)
      // So we need to rotate the wheel to move segment center to top

      // Number of full rotations for visual effect (4-8 rotations)
      const fullRotations = 4 + Math.floor(Math.random() * 5);
      const fullRotationDegrees = fullRotations * 360;

      // Additional rotation to land on segment
      // Since pointer is at top and we rotate the wheel:
      // - Wheel rotates clockwise
      // - To bring segment at angle X to top, rotate by 360 - X
      const additionalRotation = 360 - segmentIndex * segmentAngle;

      const totalRotation = fullRotationDegrees + additionalRotation;
      STATE.currentRotation += totalRotation;

      // Apply animation
      DOM.segments.style.transition = `transform ${CONFIG.SPIN_DURATION}ms ${CONFIG.SPIN_EASING}`;
      DOM.segments.style.transform = `rotate(${STATE.currentRotation}deg)`;

      // Handle animation end
      const handleTransitionEnd = () => {
        DOM.segments.style.transition = "";
        DOM.segments.removeEventListener("transitionend", handleTransitionEnd);

        STATE.isSpinning = false;

        // Verify winning segment
        const winningSegment = getWinningSegmentFromRotation(STATE.currentRotation);
        console.log(`Winning segment verified: ${winningSegment}, expected: ${segmentIndex}`);

        resolve(winningSegment);
      };

      DOM.segments.addEventListener("transitionend", handleTransitionEnd, { once: true });

      // Timeout fallback (in case transitionend doesn't fire)
      setTimeout(() => {
        if (STATE.isSpinning) {
          console.warn("Transition timeout - forcing resolution");
          DOM.segments.removeEventListener("transitionend", handleTransitionEnd);
          STATE.isSpinning = false;
          resolve(segmentIndex);
        }
      }, CONFIG.SPIN_DURATION + 100);
    });
  }

  /**
   * Finds segments with specific reward
   * @param {string} reward - Reward to find
   * @returns {Array} Array of segment indices
   */
  function findSegmentsWithReward(reward) {
    const indices = [];
    for (let i = 0; i < STATE.segmentMap.length; i++) {
      if (STATE.segmentMap[i] === reward) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * Randomly selects a segment with the given reward
   * @param {string} reward - Reward to match
   * @returns {number} Segment index
   */
  function selectRandomSegmentForReward(reward) {
    const candidates = findSegmentsWithReward(reward);
    if (candidates.length === 0) {
      console.error(`No segments found for reward: ${reward}`);
      return Math.floor(Math.random() * CONFIG.SEGMENT_COUNT);
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ==================== BUTTON STATE MANAGEMENT ====================

  /**
   * Sets button loading state
   * @param {boolean} isLoading
   */
  function setButtonLoading(isLoading) {
    DOM.spinBtn.setAttribute("data-loading", isLoading);
    DOM.spinBtn.disabled = isLoading;
  }

  /**
   * Resets button to initial state
   */
  function resetButton() {
    setButtonLoading(false);
    DOM.result.textContent = "";
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handles spin button click
   */
  async function handleSpinClick() {
    if (STATE.isSpinning) {
      console.warn("Already spinning");
      return;
    }

    // Show ID validation modal
    showIdModal();
  }

  /**
   * Validates employee ID and initiates spin
   */
  async function handleIdValidate() {
    const emp = DOM.idInput.value.trim().toUpperCase();

    if (!isValidEmployeeId(emp)) {
      DOM.idError.textContent = "Invalid format. Use EMP001";
      return;
    }

    DOM.idError.textContent = "Validating...";

    try {
      const response = await fetch("/api/check-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Validation failed");
      }

      STATE.employeeId = emp;
      hideModal(DOM.idModal);

      // Perform spin
      await performSpin(emp);
    } catch (error) {
      DOM.idError.textContent = error.message || "Validation error";
      console.error("ID Validation error:", error);
    }
  }

  /**
   * Performs the actual spin operation
   * @param {string} employeeId
   */
  async function performSpin(employeeId) {
    setButtonLoading(true);
    DOM.result.textContent = "";

    try {
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Spin failed");
      }

      const { reward, segment } = data;

      // Validate segment is in range
      const targetSegment =
        typeof segment === "number" && segment >= 0 && segment < CONFIG.SEGMENT_COUNT
          ? segment
          : selectRandomSegmentForReward(reward);

      // Rotate wheel
      await rotateWheelToSegment(targetSegment);

      // Show win effects
      launchConfetti();
      DOM.result.textContent = `🎉 YOU WON ${reward}`;

      // Show winner modal
      showWinnerModal(reward, employeeId);
    } catch (error) {
      console.error("Spin error:", error);
      DOM.result.textContent = "❌ Spin failed. Please try again.";
      setButtonLoading(false);
    }
  }

  /**
   * Handles reward claim
   */
  async function handleClaimReward() {
    const emp = (DOM.claimEmployee.value || "").trim().toUpperCase();

    if (!isValidEmployeeId(emp)) {
      DOM.claimError.textContent = "Invalid Employee ID (EMP###)";
      return;
    }

    DOM.claimError.textContent = "";

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Claim failed");
      }

      hideModal(DOM.winnerModal);
      showSuccessModal(data.employee_id || emp, data.reward || DOM.winnerPrize.textContent, data.created_at);

      // Reset for next spin
      setTimeout(() => {
        hideModal(DOM.successModal);
        resetButton();
      }, 3000);
    } catch (error) {
      console.error("Claim error:", error);
      DOM.claimError.textContent = error.message || "Claim failed";
    }
  }

  // ==================== EVENT LISTENERS ===== ====================

  /**
   * Sets up all event listeners
   */
  function setupEventListeners() {
    // Spin button
    DOM.spinBtn.addEventListener("click", handleSpinClick);

    // ID validation
    DOM.idValidate.addEventListener("click", handleIdValidate);
    DOM.idCancel.addEventListener("click", () => hideModal(DOM.idModal));

    // Enter key on ID input
    DOM.idInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleIdValidate();
      }
    });

    // Claim
    DOM.claimBtn.addEventListener("click", handleClaimReward);
    DOM.closeWinner.addEventListener("click", () => {
      hideModal(DOM.winnerModal);
      resetButton();
    });

    // Success modal
    DOM.closeSuccess.addEventListener("click", () => {
      hideModal(DOM.successModal);
    });

    // Handle window resize for responsive updates
    window.addEventListener("resize", () => {
      // Could implement responsive segment rebuild here if needed
      console.log("Window resized");
    });

    // Prevent multiple clicks during animation
    DOM.spinBtn.addEventListener("dblclick", (e) => {
      e.preventDefault();
    });
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initializes the entire application
   */
  async function init() {
    console.log("Initializing COSMO Golden Spin...");

    // Create background effects
    createStarField();
    createParticleField();
    createLightRing();

    // Load rewards and build wheel
    await loadRewards();

    // Setup event listeners
    setupEventListeners();

    console.log("Application initialized successfully");
  }

  // Start application when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
