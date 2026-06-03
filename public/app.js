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

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas() {

    const rect =
      canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;
      drawWheel();
  
}
function drawWheel() {

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 20;

    const segmentAngle =
        (Math.PI * 2) / SEGMENTS.length;

    ctx.clearRect(0,0,size,size);

    SEGMENTS.forEach((segment,index)=>{

        const start =
            index * segmentAngle;

        const end =
            start + segmentAngle;

        ctx.beginPath();
        ctx.moveTo(center,center);

        ctx.arc(
            center,
            center,
            radius,
            start,
            end
        );

        ctx.closePath();

        ctx.fillStyle =
            SEGMENT_COLORS[
                index % SEGMENT_COLORS.length
            ];

        ctx.fill();

        ctx.strokeStyle =
            "#ffd36b";

        ctx.lineWidth = 4;

        ctx.stroke();

        drawLabel(
            segment.label,
            start,
            end,
            center,
            radius
        );

    });

}
function drawLabel(label, start, end, center, radius) {

    const angle = (start + end) / 2;

    ctx.save();

    ctx.translate(center, center);

    ctx.rotate(angle + Math.PI / 2);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#ffffff";

    ctx.font =
        `bold ${Math.max(18, radius * 0.08)}px Montserrat`;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;

    ctx.strokeText(
        label,
        radius * 0.72,
        0
    );

    ctx.fillText(
        label,
        radius * 0.72,
        0
    );

    ctx.restore();
}
  // ==================== APPLICATION STATE ====================
  const STATE = {
    isSpinning: false,
    currentRotation: 0,
    employeeId: null,
  };
  // ==================== UTILITIES ====================

  /**
   * validates employee ID format
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
   * Calculates which segment is under the pointer after rotation
   * Pointer is at top (0 degrees)
   * @param {number} rotation - Total rotation in degrees
   * @returns {number} Segment index under pointer
   */
  function getSegmentAtPointer(rotation) {
    const segmentAngle = 360 / CONFIG.SEGMENT_COUNT;
    // normalize with center offset: compute which segment center is at pointer
    const normalized = normalizeAngle(-rotation - segmentAngle / 2);
    const segmentIndex = Math.round(normalized / segmentAngle) % CONFIG.SEGMENT_COUNT;
    return segmentIndex;
  }

  /**
   * Selects a random segment based on weighted probabilities
   * @returns {number} Segment index (0 to SEGMENT_COUNT-1)
   */

  /**
   * Rotates wheel to land on specified segment
   * The segment will be directly under the pointer when spin completes
   *param {number} targetSegmentIndex - Target segment (0 to SEGMENT_COUNT-1)
   *returns {Promise}
   */
  async function rotateWheelToSegment(targetSegmentIndex) {
  return new Promise((resolve) => {

    if (STATE.isSpinning) {
      resolve();
      return;
    }

    STATE.isSpinning = true;

    const segmentAngle =
      360 / CONFIG.SEGMENT_COUNT;

    const fullRotations =
      5 + Math.floor(Math.random() * 2);

    const centerAngle =
      targetSegmentIndex * segmentAngle +
      segmentAngle / 2;

    const targetRotation =
      fullRotations * 360 +
      (360 - centerAngle);

    STATE.currentRotation += targetRotation;

    canvas.style.transition =
      `transform ${CONFIG.SPIN_DURATION}ms ${CONFIG.SPIN_EASING}`;

    canvas.style.transform =
      `rotate(${STATE.currentRotation}deg)`;

    setTimeout(() => {

      STATE.isSpinning = false;

      setButtonLoading(false);

      resolve(targetSegmentIndex);

    }, CONFIG.SPIN_DURATION);

  }); }
      

   

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
   * Builds wheel segments from SEGMENTS array
   * Each segment shows its label directly
   */
  

  /**
   * Selects a random segment based on weighted probabilities
   returns {number} Segment index (0 to SEGMENT_COUNT-1)
   */
  function selectRandomSegment() {
    // Calculate total weight
    const totalWeight = SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);

    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Find segment based on weights
    for (let i = 0; i < SEGMENTS.length; i++) {
      random -= SEGMENTS[i].weight;
      if (random <= 0) {
        return i;
      }
    }

    // Fallback to last segment (shouldn't happen)
    return SEGMENTS.length - 1;
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

  /**
   * Highlights the winning segment visually
   * @param {number} index
   */



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
      // First, select a random segment locally based on weights
      const targetSegmentIndex = selectRandomSegment();
      const selectedSegment = SEGMENTS[targetSegmentIndex];

      // Call API to record the spin (server can verify/log if needed)
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, segmentIndex: targetSegmentIndex }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Spin failed");
      }

      // Rotate wheel to the selected segment
      await rotateWheelToSegment(targetSegmentIndex);

      // Show win effects
      launchConfetti();
      DOM.result.textContent = `🎉 YOU WON ${selectedSegment.label}`;

      // Show winner modal with the segment label as reward
      showWinnerModal(selectedSegment.label, employeeId);
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
   **/
  async function init() {
    console.log("Initializing COSMO Golden Spin...");

    createStarField();
    createParticleField();
    createLightRing();
    resizeCanvas();

    window.addEventListener(
     "resize",
      resizeCanvas
      );
    

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