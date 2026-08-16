/**
 * ALPHA SEVEN | ARDUINO FLOW IDE
 * Kinetic Grid Engine, AST Compiler, Web Serial & Simulator
 * Zero Emojis, Dark Minimalist Technical Styling
 */

// ==========================================================================
// 1. KINETIC GRID INTERACTIVE BACKGROUND CANVAS ENGINE
// ==========================================================================
(function initKineticGrid() {
  const canvas = document.getElementById("kinetic-canvas");
  if (!canvas || typeof canvas.getContext !== "function") return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const CELL_SIZE = 55;
  const INFLUENCE_RADIUS = 260;
  const MAX_WARP = 24;
  const DOT_SPACING = 28;
  const LERP_SPEED = 0.08;
  const LINE_BASE = { r: 255, g: 255, b: 255, a: 0.12 };
  const NODE_BASE_RADIUS = 1.8;
  const NODE_ACTIVE_RADIUS = 3.2;

  const mouse = { x: -9999, y: -9999 };
  const targetMouse = { x: -9999, y: -9999 };
  const ripples = [];
  let size = { w: 0, h: 0 };

  function lerpN(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(base, active, t) {
    const r = Math.round(lerpN(base.r, active.r, t));
    const g = Math.round(lerpN(base.g, active.g, t));
    const b = Math.round(lerpN(base.b, active.b, t));
    const a = lerpN(base.a, active.a, t);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  function setSize() {
    size.w = window.innerWidth;
    size.h = window.innerHeight;
    canvas.width = size.w;
    canvas.height = size.h;
  }

  function getWarpedPoint(gx, gy, col, row, cols, rows) {
    const edgeMargin = 1.5;
    const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
    const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
    const pinFactor = colPin * colPin * rowPin * rowPin;

    const dx = gx - mouse.x;
    const dy = gy - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

    let rx = 0, ry = 0;
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      const rdx = gx - r.x;
      const rdy = gy - r.y;
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
      const waveWidth = 55;
      const diff = rdist - r.radius;
      if (Math.abs(diff) < waveWidth) {
        const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
        const angle = Math.atan2(rdy, rdx);
        const sign = diff < 0 ? -1 : 1;
        rx += Math.cos(angle) * strength * sign * -1;
        ry += Math.sin(angle) * strength * sign * -1;
      }
    }

    if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
      const t = dist / INFLUENCE_RADIUS;
      const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
      const warpAmt = eased * MAX_WARP * pinFactor;
      const angle = Math.atan2(dy, dx);
      return {
        pt: { x: gx - Math.cos(angle) * warpAmt + rx, y: gy - Math.sin(angle) * warpAmt + ry },
        proximity,
      };
    }

    return { pt: { x: gx + rx, y: gy + ry }, proximity };
  }

  function draw(now) {
    const W = size.w;
    const H = size.h;

    const theme = {
      bg: "#161618",
      lineActive: { r: 161, g: 161, b: 170, a: 0.8 },
      nodeActive: { r: 244, g: 244, b: 245, a: 1.0 },
      glow: "244,244,245",
      ripple: "244,244,245",
    };

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // Static dot grid
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
      for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ripples update
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const age = (now - r.born) / 1000;
      r.radius = Math.max(0, age * 400);
      r.opacity = Math.max(0, 1 - age * 1.2);
      if (r.opacity <= 0) ripples.splice(i, 1);
    }

    const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
    const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
    const cellW = W / (cols - 1);
    const cellH = H / (rows - 1);

    const pts = [];
    const prox = [];

    for (let row = 0; row < rows; row++) {
      pts[row] = [];
      prox[row] = [];
      for (let col = 0; col < cols; col++) {
        const { pt, proximity } = getWarpedPoint(col * cellW, row * cellH, col, row, cols, rows);
        pts[row][col] = pt;
        prox[row][col] = proximity;
      }
    }

    // Grid lines
    const drawSeg = (p1, p2, pr1, pr2) => {
      const avg = (pr1 + pr2) / 2;
      const t = avg * avg * (3 - 2 * avg);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = lerpColor(LINE_BASE, theme.lineActive, t);
      ctx.lineWidth = lerpN(0.8, 1.4, t);
      ctx.stroke();
    };

    ctx.lineCap = "butt";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1; col++) {
        drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);
      }
    }

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows - 1; row++) {
        drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);
      }
    }

    // Nodes
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const p = pts[row][col];
        const pr = prox[row][col];
        const t = pr * pr * (3 - 2 * pr);
        const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

        if (t > 0.3) {
          const glowR = r + lerpN(0, 5, (t - 0.3) / 0.7);
          const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
          grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.25).toFixed(3)})`);
          grd.addColorStop(1, `rgba(${theme.glow},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor({ r: 255, g: 255, b: 255, a: 0.18 }, theme.nodeActive, t);
        ctx.fill();
      }
    }

    // Ripple arcs
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      const safeRadius = Math.max(0, r.radius);
      ctx.beginPath();
      ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.22).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function loop(now) {
    mouse.x = lerpN(mouse.x, targetMouse.x, LERP_SPEED);
    mouse.y = lerpN(mouse.y, targetMouse.y, LERP_SPEED);
    draw(now);
    requestAnimationFrame(loop);
  }

  setSize();
  window.addEventListener("resize", setSize);

  window.addEventListener("mousemove", (e) => {
    targetMouse.x = e.clientX;
    targetMouse.y = e.clientY;
  });

  window.addEventListener("click", (e) => {
    ripples.push({
      x: e.clientX,
      y: e.clientY,
      radius: 0,
      opacity: 1,
      born: performance.now(),
    });
  });

  requestAnimationFrame(loop);
})();

// ==========================================================================
// 2. BLOCK REGISTRY DEFINITIONS (Dark Technical Layout)
// ==========================================================================
const blockDefinitions = {
  start: {
    title: "Program Baslangici",
    tag: "Setup",
    hasInput: false,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Baud Rate", name: "baud", type: "select", value: "9600", options: ["9600", "115200", "57600"] },
    ],
  },
  print: {
    title: "Print (Serial)",
    tag: "Serial",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Metin", name: "text", type: "text", value: "Hello world" },
    ],
  },
  delay: {
    title: "Delay",
    tag: "Delay",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [{ label: "Sure (ms)", name: "ms", type: "number", value: 1000 }],
  },
  if: {
    title: "If-Else",
    tag: "Logic",
    hasInput: true,
    outputs: [
      { id: "true", label: "true", type: "true" },
      { id: "false", label: "false", type: "false" },
      { id: "next", label: "next", type: "next" },
    ],
    fields: [
      { label: "Sol", name: "left", type: "text", value: "mesafe" },
      { label: "Kosul", name: "operator", type: "select", value: "<=", options: ["<=", ">=", "==", "!=", "<", ">"] },
      { label: "Sag", name: "right", type: "text", value: "20" },
    ],
  },
  repeat: {
    title: "Repeat",
    tag: "Loop",
    hasInput: true,
    outputs: [
      { id: "body", label: "body", type: "body" },
      { id: "next", label: "next", type: "next" },
    ],
    fields: [{ label: "Times", name: "times", type: "number", value: 5 }],
  },
  for: {
    title: "For Loop",
    tag: "Loop",
    hasInput: true,
    outputs: [
      { id: "body", label: "body", type: "body" },
      { id: "next", label: "next", type: "next" },
    ],
    fields: [
      { label: "Degisken", name: "var", type: "text", value: "i" },
      { label: "Baslangic", name: "start", type: "number", value: 0 },
      { label: "Bitis", name: "end", type: "number", value: 10 },
      { label: "Artis", name: "step", type: "number", value: 1 },
    ],
  },
  while: {
    title: "While Loop",
    tag: "Loop",
    hasInput: true,
    outputs: [
      { id: "body", label: "body", type: "body" },
      { id: "next", label: "next", type: "next" },
    ],
    fields: [{ label: "Condition", name: "condition", type: "text", value: "true" }],
  },
  "pin-write": {
    title: "Pin Write",
    tag: "GPIO",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 13 },
      { label: "Value", name: "value", type: "select", value: "HIGH", options: ["HIGH", "LOW"] },
    ],
  },
  "pin-read": {
    title: "Pin Read",
    tag: "GPIO",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 2 },
      { label: "Store", name: "store", type: "text", value: "value" },
    ],
  },
  "analog-read": {
    title: "Analog Read",
    tag: "Analog",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Pin", name: "pin", type: "select", value: "A0", options: ["A0", "A1", "A2", "A3", "A4", "A5"] },
      { label: "Store", name: "store", type: "text", value: "pot" },
    ],
  },
  pwm: {
    title: "PWM",
    tag: "PWM",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 9 },
      { label: "Duty", name: "duty", type: "number", value: 128 },
    ],
  },
  buzzer: {
    title: "Buzzer Tone",
    tag: "Audio",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Buzzer pin", name: "pin", type: "number", value: 8 },
      { label: "Tone (Hz)", name: "freq", type: "number", value: 800 },
      { label: "Duration", name: "duration", type: "number", value: 200 },
    ],
  },
  map: {
    title: "Map Transform",
    tag: "Math",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Val", name: "val", type: "text", value: "pot" },
      { label: "In Range", name: "inRange", type: "text", value: "0, 1023" },
      { label: "Out Range", name: "outRange", type: "text", value: "0, 255" },
      { label: "Store", name: "store", type: "text", value: "pwmVal" },
    ],
  },
  ultrasonic: {
    title: "Ultrasonic Sensor",
    tag: "Sensor",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Trigger", name: "trigger", type: "number", value: 2 },
      { label: "Echo", name: "echo", type: "number", value: 3 },
      { label: "Store", name: "store", type: "text", value: "mesafe" },
    ],
  },
  dht: {
    title: "DHT11 Sensor",
    tag: "Sensor",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Data", name: "pin", type: "number", value: 4 },
      { label: "Temp", name: "temp", type: "text", value: "temperature" },
      { label: "Humidity", name: "humidity", type: "text", value: "humidity" },
    ],
  },
  rfid: {
    title: "RFID Sensor",
    tag: "Sensor",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "SS Pin", name: "ss", type: "number", value: 10 },
      { label: "RST Pin", name: "rst", type: "number", value: 9 },
      { label: "UID Store", name: "store", type: "text", value: "uid" },
    ],
  },
  servo: {
    title: "Servo Motor",
    tag: "Servo",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 6 },
      { label: "Angle", name: "angle", type: "number", value: 90 },
    ],
  },
  oled: {
    title: "1.3in OLED",
    tag: "Display",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "Text", name: "text", type: "text", value: "Hello world" },
    ],
  },
  motor: {
    title: "L298N Motor Driver",
    tag: "Motor",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "IN1 Pin", name: "in1", type: "number", value: 12 },
      { label: "IN2 Pin", name: "in2", type: "number", value: 11 },
      { label: "IN3 Pin", name: "in3", type: "number", value: 10 },
      { label: "IN4 Pin", name: "in4", type: "number", value: 9 },
      { label: "Direction", name: "direction", type: "select", value: "Forward", options: ["Forward", "Backward", "Stop"] },
    ],
  },
  wifi: {
    title: "WiFi Connect",
    tag: "WiFi",
    hasInput: true,
    outputs: [{ id: "next", label: "next", type: "next" }],
    fields: [
      { label: "SSID", name: "ssid", type: "text", value: "MyWiFi" },
      { label: "Password", name: "password", type: "text", value: "password" },
    ],
  },
};

// ==========================================================================
// 3. 100% FUNCTIONAL PROJECT DEMOS
// ==========================================================================
const examples = {
  blink: {
    blocks: [
      { id: "b1", type: "pin-write", values: { pin: 13, value: "HIGH" }, position: { x: 60, y: 100 } },
      { id: "b2", type: "delay", values: { ms: 1000 }, position: { x: 340, y: 100 } },
      { id: "b3", type: "pin-write", values: { pin: 13, value: "LOW" }, position: { x: 620, y: 100 } },
      { id: "b4", type: "delay", values: { ms: 1000 }, position: { x: 900, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
      { fromId: "b3", fromPort: "next", toId: "b4", toPort: "in" },
    ],
  },
  fade: {
    blocks: [
      { id: "b1", type: "pwm", values: { pin: 9, duty: 255 }, position: { x: 60, y: 100 } },
      { id: "b2", type: "delay", values: { ms: 500 }, position: { x: 340, y: 100 } },
      { id: "b3", type: "pwm", values: { pin: 9, duty: 50 }, position: { x: 620, y: 100 } },
      { id: "b4", type: "delay", values: { ms: 500 }, position: { x: 900, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
      { fromId: "b3", fromPort: "next", toId: "b4", toPort: "in" },
    ],
  },
  distance: {
    blocks: [
      { id: "b1", type: "ultrasonic", values: { trigger: 2, echo: 3, store: "mesafe" }, position: { x: 50, y: 120 } },
      { id: "b2", type: "if", values: { left: "mesafe", operator: "<=", right: "20" }, position: { x: 340, y: 120 } },
      { id: "b3", type: "buzzer", values: { pin: 8, freq: 800, duration: 150 }, position: { x: 640, y: 60 } },
      { id: "b4", type: "print", values: { text: "Guvenli Mesafe" }, position: { x: 640, y: 220 } },
      { id: "b5", type: "delay", values: { ms: 100 }, position: { x: 920, y: 140 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "true", toId: "b3", toPort: "in" },
      { fromId: "b2", fromPort: "false", toId: "b4", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b5", toPort: "in" },
    ],
  },
  climate: {
    blocks: [
      { id: "b1", type: "dht", values: { pin: 4, temp: "sicaklik", humidity: "nem" }, position: { x: 60, y: 100 } },
      { id: "b2", type: "print", values: { text: "Sicaklik ve Nem Olculdu" }, position: { x: 340, y: 100 } },
      { id: "b3", type: "delay", values: { ms: 2000 }, position: { x: 620, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
    ],
  },
  servo: {
    blocks: [
      { id: "b1", type: "servo", values: { pin: 6, angle: 0 }, position: { x: 60, y: 100 } },
      { id: "b2", type: "delay", values: { ms: 800 }, position: { x: 340, y: 100 } },
      { id: "b3", type: "servo", values: { pin: 6, angle: 180 }, position: { x: 620, y: 100 } },
      { id: "b4", type: "delay", values: { ms: 800 }, position: { x: 900, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
      { fromId: "b3", fromPort: "next", toId: "b4", toPort: "in" },
    ],
  },
  rfid: {
    blocks: [
      { id: "b1", type: "rfid", values: { ss: 10, rst: 9, store: "uid" }, position: { x: 50, y: 120 } },
      { id: "b2", type: "if", values: { left: "uid", operator: "==", right: "1234ABCD" }, position: { x: 340, y: 120 } },
      { id: "b3", type: "pin-write", values: { pin: 13, value: "HIGH" }, position: { x: 640, y: 60 } },
      { id: "b4", type: "buzzer", values: { pin: 8, freq: 400, duration: 300 }, position: { x: 640, y: 220 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "true", toId: "b3", toPort: "in" },
      { fromId: "b2", fromPort: "false", toId: "b4", toPort: "in" },
    ],
  },
  oled: {
    blocks: [
      { id: "b1", type: "oled", values: { text: "Alpha Seven" }, position: { x: 60, y: 100 } },
      { id: "b2", type: "delay", values: { ms: 1000 }, position: { x: 340, y: 100 } },
      { id: "b3", type: "print", values: { text: "OLED Guncellendi" }, position: { x: 620, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
    ],
  },
  motor: {
    blocks: [
      { id: "b1", type: "motor", values: { in1: 12, in2: 11, in3: 10, in4: 9, direction: "Forward" }, position: { x: 60, y: 100 } },
      { id: "b2", type: "delay", values: { ms: 2000 }, position: { x: 340, y: 100 } },
      { id: "b3", type: "motor", values: { in1: 12, in2: 11, in3: 10, in4: 9, direction: "Stop" }, position: { x: 620, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
    ],
  },
  iot: {
    blocks: [
      { id: "b1", type: "wifi", values: { ssid: "MyWiFi", password: "password" }, position: { x: 60, y: 100 } },
      { id: "b2", type: "print", values: { text: "WiFi Baglandi" }, position: { x: 340, y: 100 } },
      { id: "b3", type: "delay", values: { ms: 5000 }, position: { x: 620, y: 100 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "next", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
    ],
  },
  loop: {
    blocks: [
      { id: "b1", type: "repeat", values: { times: 5 }, position: { x: 60, y: 120 } },
      { id: "b2", type: "pin-write", values: { pin: 13, value: "HIGH" }, position: { x: 340, y: 60 } },
      { id: "b3", type: "delay", values: { ms: 100 }, position: { x: 600, y: 60 } },
      { id: "b4", type: "pin-write", values: { pin: 13, value: "LOW" }, position: { x: 860, y: 60 } },
      { id: "b5", type: "delay", values: { ms: 100 }, position: { x: 1120, y: 60 } },
      { id: "b6", type: "print", values: { text: "Dongu Tamamlandi" }, position: { x: 340, y: 240 } },
    ],
    connections: [
      { fromId: "b1", fromPort: "body", toId: "b2", toPort: "in" },
      { fromId: "b2", fromPort: "next", toId: "b3", toPort: "in" },
      { fromId: "b3", fromPort: "next", toId: "b4", toPort: "in" },
      { fromId: "b4", fromPort: "next", toId: "b5", toPort: "in" },
      { fromId: "b1", fromPort: "next", toId: "b6", toPort: "in" },
    ],
  },
};
examples["nested-loop"] = examples["loop"];

// ==========================================================================
// 4. APPLICATION STATE & DOM REFERENCES
// ==========================================================================
let flow = [];
let connections = [];
let selectedBlockId = null;
let pendingConnector = null;

let zoom = 1.0;
let pan = { x: 40, y: 40 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
let isSpacePressed = false;
let activeDrag = null;

const historyStack = [];
const redoStack = [];
const MAX_HISTORY = 40;

let isSimulating = false;
let simInterval = null;
let simStepIndex = 0;
let simExecutionPath = [];
let simVariables = {};
let simPins = {};

let serialPort = null;
let serialReader = null;
let isSerialConnected = false;

const viewport = document.getElementById("canvas-viewport");
const stage = document.getElementById("canvas-stage");
const blocksLayer = document.getElementById("blocks-layer");
const connectionsSvg = document.getElementById("connections");
const codeOutput = document.getElementById("code-output");
const flowSummary = document.getElementById("flow-summary");
const blockCountEl = document.getElementById("block-count");
const zoomLevelEl = document.getElementById("zoom-level");
const serialBody = document.getElementById("serial-body");
const simHud = document.getElementById("sim-hud");
const hudPins = document.getElementById("hud-pins");

// ==========================================================================
// 5. CANVAS PAN & ZOOM TRANSFORM
// ==========================================================================
function updateStageTransform() {
  if (stage) stage.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
  drawConnections();
}

function zoomAt(factor, clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;

  const newZoom = Math.min(2.5, Math.max(0.3, zoom * factor));
  if (newZoom === zoom) return;

  pan.x = mouseX - ((mouseX - pan.x) * newZoom) / zoom;
  pan.y = mouseY - ((mouseY - pan.y) * newZoom) / zoom;
  zoom = newZoom;

  updateStageTransform();
}

function fitView() {
  if (flow.length === 0) {
    pan = { x: 40, y: 40 };
    zoom = 1.0;
    updateStageTransform();
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  flow.forEach((b) => {
    minX = Math.min(minX, b.position.x);
    minY = Math.min(minY, b.position.y);
    maxX = Math.max(maxX, b.position.x + 230);
    maxY = Math.max(maxY, b.position.y + 160);
  });

  const rect = viewport.getBoundingClientRect();
  const width = maxX - minX + 100;
  const height = maxY - minY + 100;

  const scaleX = rect.width / width;
  const scaleY = rect.height / height;
  zoom = Math.min(1.1, Math.max(0.4, Math.min(scaleX, scaleY)));

  pan.x = (rect.width - width * zoom) / 2 - minX * zoom + 50 * zoom;
  pan.y = (rect.height - height * zoom) / 2 - minY * zoom + 50 * zoom;
  updateStageTransform();
}

// ==========================================================================
// 6. SNAPSHOT & HISTORY
// ==========================================================================
function recordSnapshot() {
  const state = JSON.stringify({ flow, connections });
  if (historyStack.length > 0 && historyStack[historyStack.length - 1] === state) return;
  historyStack.push(state);
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  redoStack.length = 0;
  persistToLocalStorage();
}

function undo() {
  if (historyStack.length <= 1) return;
  const currentState = historyStack.pop();
  redoStack.push(currentState);
  const prevState = historyStack[historyStack.length - 1];
  restoreFromJSON(JSON.parse(prevState), false);
}

function redo() {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  historyStack.push(nextState);
  restoreFromJSON(JSON.parse(nextState), false);
}

function persistToLocalStorage() {
  try {
    localStorage.setItem("ide_flow_arduino_save", JSON.stringify({ flow, connections }));
  } catch (err) {}
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem("ide_flow_arduino_save");
    if (saved) {
      const data = JSON.parse(saved);
      if (data.flow && data.flow.length > 0) {
        restoreFromJSON(data, false);
        return true;
      }
    }
  } catch (err) {}
  return false;
}

// ==========================================================================
// 7. BLOCK DOM CREATION
// ==========================================================================
function buildBlockElement(block) {
  const definition = blockDefinitions[block.type];
  if (!definition) return null;

  const node = document.createElement("article");
  node.className = `flow-node ${block.id === selectedBlockId ? "selected" : ""}`;
  node.dataset.id = block.id;
  node.dataset.type = block.type;
  node.style.left = `${block.position.x}px`;
  node.style.top = `${block.position.y}px`;

  const header = document.createElement("div");
  header.className = "node-header";
  header.innerHTML = `
    <div class="node-header-title">
      <span>${definition.title}</span>
    </div>
    <div class="node-header-actions">
      <button type="button" class="btn-delete-node" title="Sil">X</button>
    </div>
  `;

  header.querySelector(".btn-delete-node")?.addEventListener("click", (e) => {
    e.stopPropagation();
    removeBlock(block.id);
  });

  const body = document.createElement("div");
  body.className = "node-body";

  definition.fields.forEach((field) => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.innerHTML = `<label>${field.label}</label>`;

    if (field.type === "select") {
      const select = document.createElement("select");
      field.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (String(opt) === String(block.values[field.name])) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener("change", (e) => {
        block.values[field.name] = e.target.value;
        recordSnapshot();
        updateUI();
      });
      row.appendChild(select);
    } else {
      const input = document.createElement("input");
      input.type = field.type;
      input.value = block.values[field.name] !== undefined ? block.values[field.name] : field.value;
      input.addEventListener("input", (e) => {
        block.values[field.name] = field.type === "number" ? Number(e.target.value) : e.target.value;
        recordSnapshot();
        updateUI();
      });
      row.appendChild(input);
    }
    body.appendChild(row);
  });

  node.appendChild(header);
  node.appendChild(body);

  if (definition.hasInput) {
    const inPort = document.createElement("div");
    inPort.className = "connector-port port-in";
    inPort.dataset.port = "in";
    inPort.title = "Giriş (IN)";
    inPort.addEventListener("pointerdown", (e) => {
      handlePortPointerDown(e, block.id, "in", inPort);
    });
    inPort.addEventListener("click", (e) => {
      handlePortClick(e, block.id, "in", inPort);
    });
    node.appendChild(inPort);
  }

  definition.outputs.forEach((out) => {
    const outPort = document.createElement("div");
    outPort.className = `connector-port port-${out.type}`;
    outPort.dataset.port = out.id;
    outPort.title = `Çıkış: ${out.label}`;

    outPort.addEventListener("pointerdown", (e) => {
      handlePortPointerDown(e, block.id, out.id, outPort);
    });
    outPort.addEventListener("click", (e) => {
      handlePortClick(e, block.id, out.id, outPort);
    });
    node.appendChild(outPort);
  });

  node.addEventListener("pointerdown", (e) => {
    if (e.target.closest("input, select, button, .connector-port")) return;
    startDragBlock(e, block, node);
  });

  node.addEventListener("click", (e) => {
    e.stopPropagation();
    setSelectedBlock(block.id);
  });

  return node;
}

function createFlowBlock(type, position = null, overrideValues = null) {
  const definition = blockDefinitions[type];
  if (!definition) return;

  const defaultValues = {};
  definition.fields.forEach((f) => {
    defaultValues[f.name] = f.value;
  });

  const newBlock = {
    id: `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    title: definition.title,
    values: { ...defaultValues, ...overrideValues },
    position: position || { x: 80 + flow.length * 40, y: 80 + flow.length * 30 },
  };

  flow.push(newBlock);
  const el = buildBlockElement(newBlock);
  blocksLayer.appendChild(el);
  setSelectedBlock(newBlock.id);

  recordSnapshot();
  updateUI();
  return newBlock;
}

function removeBlock(blockId) {
  flow = flow.filter((b) => b.id !== blockId);
  connections = connections.filter((c) => c.fromId !== blockId && c.toId !== blockId);
  const el = blocksLayer.querySelector(`[data-id="${blockId}"]`);
  if (el) el.remove();
  if (selectedBlockId === blockId) selectedBlockId = null;

  drawConnections();
  recordSnapshot();
  updateUI();
}

function setSelectedBlock(blockId) {
  selectedBlockId = blockId;
  blocksLayer.querySelectorAll(".flow-node").forEach((node) => {
    node.classList.toggle("selected", node.dataset.id === blockId);
  });
}

// ==========================================================================
// 8. FOOLPROOF DRAG & CLICK CONNECTION ENGINE (TOP-BOTTOM VERTICAL FLOW)
// ==========================================================================
let activeWireDrag = null;

function getPortCoordinates(blockId, portId, portEl) {
  const block = flow.find((b) => b.id === blockId);
  if (!block) return null;

  const nodeWidth = 236;
  const nodeEl = blocksLayer.querySelector(`[data-id="${blockId}"]`);
  const nodeHeight = nodeEl ? nodeEl.offsetHeight : (["if", "repeat", "for", "while"].includes(block.type) ? 120 : (block.type === "pin-write" ? 110 : 90));

  let relX = nodeWidth / 2;
  let relY = (portId === "in") ? 0 : nodeHeight;

  if (portEl && nodeEl) {
    const nodeRect = nodeEl.getBoundingClientRect();
    const portRect = portEl.getBoundingClientRect();
    if (nodeRect.width > 0 && portRect.width > 0) {
      relX = (portRect.left + portRect.width / 2 - nodeRect.left) / zoom;
      relY = (portRect.top + portRect.height / 2 - nodeRect.top) / zoom;
      return { x: block.position.x + relX, y: block.position.y + relY };
    }
  }

  if (portId === "in") {
    relX = nodeWidth / 2;
    relY = 0;
  } else if (portId === "true" || (portId === "next" && ["repeat", "for", "while"].includes(block.type))) {
    relX = nodeWidth * 0.32;
    relY = nodeHeight;
  } else if (portId === "false" || portId === "body") {
    relX = nodeWidth * 0.68;
    relY = nodeHeight;
  } else {
    relX = nodeWidth / 2;
    relY = nodeHeight;
  }

  return { x: block.position.x + relX, y: block.position.y + relY };
}

function calculateCablePathD(x1, y1, x2, y2) {
  if (y2 >= y1 - 10) {
    const ctrlY = Math.max(20, (y2 - y1) * 0.5);
    return `M ${x1} ${y1} C ${x1} ${y1 + ctrlY}, ${x2} ${y2 - ctrlY}, ${x2} ${y2}`;
  } else {
    const loopDx = Math.max(70, Math.abs(x2 - x1) + 60);
    const loopDy = Math.max(35, (y1 - y2) * 0.25);
    return `M ${x1} ${y1} C ${x1 + loopDx} ${y1 + loopDy}, ${x2 + loopDx} ${y2 - loopDy}, ${x2} ${y2}`;
  }
}

function handlePortPointerDown(e, blockId, portId, portEl) {
  e.stopPropagation();

  const coords = getPortCoordinates(blockId, portId, portEl);
  if (!coords) return;

  activeWireDrag = {
    fromId: blockId,
    fromPort: portId,
    startX: coords.x,
    startY: coords.y,
    startClientX: e.clientX,
    startClientY: e.clientY,
    isInput: portId === "in",
    portEl,
    moved: false,
  };

  portEl.classList.add("active");
  try {
    if (portEl && portEl.setPointerCapture && e.pointerId !== undefined) {
      portEl.setPointerCapture(e.pointerId);
    }
  } catch (err) {}
}

function establishConnection(fromId, fromPort, toId, toPort = "in") {
  if (!fromId || !toId || fromId === toId) return false;

  const fromExists = flow.some((b) => b.id === fromId);
  const toExists = flow.some((b) => b.id === toId);
  if (!fromExists || !toExists) return false;

  // Replace any existing connection from this exact output port
  connections = connections.filter((c) => !(c.fromId === fromId && c.fromPort === fromPort));
  connections.push({ fromId, fromPort, toId, toPort: "in" });

  recordSnapshot();
  updateUI();
  return true;
}

function handlePortClick(e, blockId, portId, portEl) {
  e.stopPropagation();

  if (!pendingConnector) {
    pendingConnector = { blockId, portId, element: portEl };
    portEl.classList.add("active");
    return;
  }

  // Same port clicked -> cancel
  if (pendingConnector.blockId === blockId && pendingConnector.portId === portId) {
    pendingConnector.element.classList.remove("active");
    pendingConnector = null;
    return;
  }

  // Same block clicked -> switch pending
  if (pendingConnector.blockId === blockId) {
    pendingConnector.element.classList.remove("active");
    pendingConnector = { blockId, portId, element: portEl };
    portEl.classList.add("active");
    return;
  }

  let fromId, fromPort, toId;
  if (pendingConnector.portId === "in" && portId !== "in") {
    fromId = blockId;
    fromPort = portId;
    toId = pendingConnector.blockId;
  } else if (pendingConnector.portId !== "in" && portId === "in") {
    fromId = pendingConnector.blockId;
    fromPort = pendingConnector.portId;
    toId = blockId;
  } else {
    pendingConnector.element.classList.remove("active");
    pendingConnector = { blockId, portId, element: portEl };
    portEl.classList.add("active");
    return;
  }

  if (fromId && toId) {
    establishConnection(fromId, fromPort, toId, "in");
  }

  if (pendingConnector && pendingConnector.element) {
    pendingConnector.element.classList.remove("active");
  }
  pendingConnector = null;
}

function deleteConnection(fromId, fromPort, toId) {
  connections = connections.filter(
    (c) => !(c.fromId === fromId && c.fromPort === fromPort && c.toId === toId)
  );
  recordSnapshot();
  updateUI();
}

function drawConnections() {
  if (!connectionsSvg) return;
  connectionsSvg.innerHTML = "";

  // Sanitize connections: drop any connection referencing non-existent blocks
  connections = connections.filter((conn) => {
    return flow.some((b) => b.id === conn.fromId) && flow.some((b) => b.id === conn.toId);
  });

  connections.forEach((conn) => {
    const fromEl = blocksLayer.querySelector(`[data-id="${conn.fromId}"] .connector-port[data-port="${conn.fromPort}"]`);
    const toEl = blocksLayer.querySelector(`[data-id="${conn.toId}"] .connector-port[data-port="in"]`);

    const p1 = getPortCoordinates(conn.fromId, conn.fromPort, fromEl);
    const p2 = getPortCoordinates(conn.toId, "in", toEl);

    if (!p1 || !p2) return;

    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;

    const pathD = calculateCablePathD(x1, y1, x2, y2);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "cable-group");
    group.dataset.fromId = conn.fromId;
    group.dataset.fromPort = conn.fromPort;
    group.dataset.toId = conn.toId;

    // Invisible wide hit area (18px) for effortless clicking
    const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitbox.setAttribute("d", pathD);
    hitbox.setAttribute("class", "cable-hitbox");

    // Visible cable path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("class", "cable-path");

    // Delete badge on hover (Red circle with X)
    const deleteCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    deleteCircle.setAttribute("cx", midX);
    deleteCircle.setAttribute("cy", midY);
    deleteCircle.setAttribute("r", "10");
    deleteCircle.setAttribute("fill", "#ef4444");
    deleteCircle.setAttribute("stroke", "#ffffff");
    deleteCircle.setAttribute("stroke-width", "1.5");
    deleteCircle.setAttribute("class", "cable-delete-badge");

    const deleteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    deleteText.setAttribute("x", midX);
    deleteText.setAttribute("y", midY + 3.5);
    deleteText.setAttribute("text-anchor", "middle");
    deleteText.setAttribute("fill", "#ffffff");
    deleteText.setAttribute("font-size", "11");
    deleteText.setAttribute("font-weight", "bold");
    deleteText.setAttribute("class", "cable-delete-badge");
    deleteText.textContent = "✕";

    function onDelete(e) {
      e.stopPropagation();
      e.preventDefault();
      deleteConnection(conn.fromId, conn.fromPort, conn.toId);
    }

    group.addEventListener("click", onDelete);
    group.addEventListener("contextmenu", onDelete);

    group.appendChild(hitbox);
    group.appendChild(path);
    group.appendChild(deleteCircle);
    group.appendChild(deleteText);

    connectionsSvg.appendChild(group);
  });
}

// ==========================================================================
// 9. DRAG & DROP AND PANNING
// ==========================================================================
// 9. DRAG & DROP AND PANNING
// ==========================================================================
function startDragBlock(e, block, el) {
  const startMouseX = e.clientX;
  const startMouseY = e.clientY;
  const startBlockX = block.position.x;
  const startBlockY = block.position.y;

  activeDrag = { block, el, startMouseX, startMouseY, startBlockX, startBlockY };
  try {
    if (el && el.setPointerCapture && e.pointerId !== undefined) {
      el.setPointerCapture(e.pointerId);
    }
  } catch (err) {}
  setSelectedBlock(block.id);
}

function handlePointerMove(e) {
  if (activeWireDrag) {
    activeWireDrag.moved = true;
    const rect = viewport ? viewport.getBoundingClientRect() : { left: 0, top: 0 };
    const currentStageX = (e.clientX - rect.left - pan.x) / zoom;
    const currentStageY = (e.clientY - rect.top - pan.y) / zoom;

    let x1, y1, x2, y2;
    if (activeWireDrag.isInput) {
      x1 = currentStageX;
      y1 = currentStageY;
      x2 = activeWireDrag.startX;
      y2 = activeWireDrag.startY;
    } else {
      x1 = activeWireDrag.startX;
      y1 = activeWireDrag.startY;
      x2 = currentStageX;
      y2 = currentStageY;
    }

    const pathD = calculateCablePathD(x1, y1, x2, y2);

    if (connectionsSvg) {
      let tempCable = connectionsSvg.querySelector("#temp-cable");
      if (!tempCable) {
        tempCable = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tempCable.setAttribute("id", "temp-cable");
        tempCable.setAttribute("class", "cable-path temp-cable");
        connectionsSvg.appendChild(tempCable);
      }
      tempCable.setAttribute("d", pathD);
    }

    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    const nodeUnder = elUnder?.closest(".flow-node");
    document.querySelectorAll(".flow-node.snap-target").forEach((n) => {
      if (n !== nodeUnder) n.classList.remove("snap-target");
    });
    if (nodeUnder && nodeUnder.dataset.id !== activeWireDrag.fromId) {
      nodeUnder.classList.add("snap-target");
    }
    return;
  }

  if (activeDrag) {
    const deltaX = (e.clientX - activeDrag.startMouseX) / zoom;
    const deltaY = (e.clientY - activeDrag.startMouseY) / zoom;

    activeDrag.block.position.x = Math.round(activeDrag.startBlockX + deltaX);
    activeDrag.block.position.y = Math.round(activeDrag.startBlockY + deltaY);

    activeDrag.el.style.left = `${activeDrag.block.position.x}px`;
    activeDrag.el.style.top = `${activeDrag.block.position.y}px`;

    drawConnections();
    return;
  }

  if (isPanning) {
    pan.x = e.clientX - startPan.x;
    pan.y = e.clientY - startPan.y;
    updateStageTransform();
  }
}

function handlePointerUp(e) {
  if (activeWireDrag) {
    if (connectionsSvg) {
      const tempCable = connectionsSvg.querySelector("#temp-cable");
      if (tempCable) tempCable.remove();
    }

    document.querySelectorAll(".flow-node.snap-target").forEach((n) => n.classList.remove("snap-target"));

    const dragDist = Math.hypot(
      e.clientX - (activeWireDrag.startClientX || e.clientX),
      e.clientY - (activeWireDrag.startClientY || e.clientY)
    );

    if (dragDist > 10 || activeWireDrag.moved) {
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      const portUnder = elUnder?.closest(".connector-port");
      const nodeUnder = elUnder?.closest(".flow-node") || portUnder?.closest(".flow-node");

      let targetBlockId = nodeUnder?.dataset.id;
      let targetPortId = portUnder?.dataset.port;

      if (targetBlockId && targetBlockId !== activeWireDrag.fromId) {
        let fromId, fromPort, toId, toPort;
        if (activeWireDrag.isInput) {
          fromId = targetBlockId;
          fromPort = targetPortId && targetPortId !== "in" ? targetPortId : "next";
          toId = activeWireDrag.fromId;
          toPort = "in";
        } else {
          fromId = activeWireDrag.fromId;
          fromPort = activeWireDrag.fromPort;
          toId = targetBlockId;
          toPort = targetPortId === "in" ? "in" : "in";
        }
        establishConnection(fromId, fromPort, toId, toPort);
      }
      if (activeWireDrag.portEl) activeWireDrag.portEl.classList.remove("active");
      activeWireDrag = null;
      return;
    } else {
      if (activeWireDrag.portEl) {
        handlePortClick(e, activeWireDrag.fromId, activeWireDrag.fromPort, activeWireDrag.portEl);
      }
      activeWireDrag = null;
      return;
    }
  }

  if (activeDrag) {
    try {
      if (activeDrag.el && activeDrag.el.releasePointerCapture && e.pointerId !== undefined) {
        activeDrag.el.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    activeDrag = null;
    recordSnapshot();
    return;
  }

  if (isPanning) {
    isPanning = false;
    if (viewport) viewport.classList.remove("panning-active");
  }
}

// ==========================================================================
// 10. GRAPH-BASED C++ CODE GENERATION
// ==========================================================================
function generateArduinoCode() {
  if (flow.length === 0) {
    return "// Blok ekleyerek Arduino C++ kodunu burada gorebilirsiniz.\n";
  }

  const headers = new Set(["#include <Arduino.h>"]);
  const globals = new Set();
  const setupLines = new Set();
  const declaredVars = new Set();

  let baudRate = "9600";
  let hasSerial = false;

  flow.forEach((b) => {
    if (b.type === "start") {
      baudRate = b.values.baud || "9600";
      hasSerial = true;
    }
    if (b.type === "print") {
      hasSerial = true;
    }
    if (b.type === "servo") {
      headers.add("#include <Servo.h>");
      globals.add(`Servo servo_${b.values.pin};`);
      setupLines.add(`  servo_${b.values.pin}.attach(${b.values.pin});`);
    }
    if (b.type === "dht") {
      headers.add("#include <DHT.h>");
      globals.add(`#define DHTPIN ${b.values.pin}\n#define DHTTYPE DHT11\nDHT dht(DHTPIN, DHTTYPE);`);
      setupLines.add("  dht.begin();");
    }
    if (b.type === "rfid") {
      headers.add("#include <SPI.h>");
      headers.add("#include <MFRC522.h>");
      globals.add(`MFRC522 rfid(${b.values.ss}, ${b.values.rst});`);
      setupLines.add("  SPI.begin();\n  rfid.PCD_Init();");
    }
    if (b.type === "oled") {
      headers.add("#include <Wire.h>");
      headers.add("#include <Adafruit_GFX.h>");
      headers.add("#include <Adafruit_SSD1306.h>");
      globals.add("Adafruit_SSD1306 display(128, 64, &Wire, -1);");
      setupLines.add("  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { for(;;); }");
    }
    if (b.type === "wifi") {
      headers.add("#include <WiFi.h>");
      setupLines.add(`  WiFi.begin("${b.values.ssid}", "${b.values.password}");`);
    }
    if (b.type === "pin-write" || b.type === "pwm") {
      setupLines.add(`  pinMode(${b.values.pin}, OUTPUT);`);
    }
    if (b.type === "pin-read") {
      setupLines.add(`  pinMode(${b.values.pin}, INPUT);`);
    }
    if (b.type === "motor") {
      setupLines.add(`  pinMode(${b.values.in1}, OUTPUT);`);
      setupLines.add(`  pinMode(${b.values.in2}, OUTPUT);`);
      setupLines.add(`  pinMode(${b.values.in3}, OUTPUT);`);
      setupLines.add(`  pinMode(${b.values.in4}, OUTPUT);`);
    }
  });

  if (hasSerial) {
    setupLines.add(`  Serial.begin(${baudRate});`);
  }

  const targetBlockIds = new Set(connections.map((c) => c.toId));
  let rootBlocks = flow.filter((b) => !targetBlockIds.has(b.id));
  if (rootBlocks.length === 0 && flow.length > 0) {
    rootBlocks = [flow[0]];
  }

  const visited = new Set();

  function renderBranch(blockId, indent) {
    if (!blockId || visited.has(blockId)) return [];
    visited.add(blockId);

    const b = flow.find((item) => item.id === blockId);
    if (!b) return [];

    const lines = [];
    const spaces = " ".repeat(indent);
    const v = b.values;

    switch (b.type) {
      case "start":
        break;

      case "print":
        lines.push(`${spaces}Serial.println("${v.text}");`);
        break;

      case "delay":
        lines.push(`${spaces}delay(${v.ms});`);
        break;

      case "pin-write":
        lines.push(`${spaces}digitalWrite(${v.pin}, ${v.value});`);
        break;

      case "pin-read":
        if (!declaredVars.has(v.store)) {
          declaredVars.add(v.store);
          lines.push(`${spaces}int ${v.store} = digitalRead(${v.pin});`);
        } else {
          lines.push(`${spaces}${v.store} = digitalRead(${v.pin});`);
        }
        break;

      case "analog-read":
        if (!declaredVars.has(v.store)) {
          declaredVars.add(v.store);
          lines.push(`${spaces}int ${v.store} = analogRead(${v.pin});`);
        } else {
          lines.push(`${spaces}${v.store} = analogRead(${v.pin});`);
        }
        break;

      case "pwm":
        lines.push(`${spaces}analogWrite(${v.pin}, ${v.duty});`);
        break;

      case "buzzer":
        lines.push(`${spaces}tone(${v.pin}, ${v.freq}, ${v.duration});`);
        break;

      case "map":
        const inVals = v.inRange ? v.inRange.split(",").map(s => s.trim()) : ["0", "1023"];
        const outVals = v.outRange ? v.outRange.split(",").map(s => s.trim()) : ["0", "255"];
        if (!declaredVars.has(v.store)) {
          declaredVars.add(v.store);
          lines.push(`${spaces}int ${v.store} = map(${v.val}, ${inVals[0]}, ${inVals[1]}, ${outVals[0]}, ${outVals[1]});`);
        } else {
          lines.push(`${spaces}${v.store} = map(${v.val}, ${inVals[0]}, ${inVals[1]}, ${outVals[0]}, ${outVals[1]});`);
        }
        break;

      case "ultrasonic":
        if (!declaredVars.has(v.store)) {
          declaredVars.add(v.store);
          lines.push(`${spaces}// HC-SR04`);
          lines.push(`${spaces}digitalWrite(${v.trigger}, LOW); delayMicroseconds(2);`);
          lines.push(`${spaces}digitalWrite(${v.trigger}, HIGH); delayMicroseconds(10);`);
          lines.push(`${spaces}digitalWrite(${v.trigger}, LOW);`);
          lines.push(`${spaces}long ${v.store} = pulseIn(${v.echo}, HIGH) * 0.034 / 2;`);
        }
        break;

      case "dht":
        if (!declaredVars.has(v.temp)) {
          declaredVars.add(v.temp);
          declaredVars.add(v.humidity);
          lines.push(`${spaces}float ${v.temp} = dht.readTemperature();`);
          lines.push(`${spaces}float ${v.humidity} = dht.readHumidity();`);
        }
        break;

      case "rfid":
        lines.push(`${spaces}if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {`);
        lines.push(`${spaces}  // Kart Algilandi`);
        lines.push(`${spaces}}`);
        break;

      case "servo":
        lines.push(`${spaces}servo_${v.pin}.write(${v.angle});`);
        break;

      case "oled":
        lines.push(`${spaces}display.clearDisplay();`);
        lines.push(`${spaces}display.setTextSize(1); display.setTextColor(SSD1306_WHITE);`);
        lines.push(`${spaces}display.setCursor(0,0); display.println("${v.text}");`);
        lines.push(`${spaces}display.display();`);
        break;

      case "motor":
        if (v.direction === "Forward") {
          lines.push(`${spaces}digitalWrite(${v.in1}, HIGH); digitalWrite(${v.in2}, LOW);`);
          lines.push(`${spaces}digitalWrite(${v.in3}, HIGH); digitalWrite(${v.in4}, LOW);`);
        } else if (v.direction === "Backward") {
          lines.push(`${spaces}digitalWrite(${v.in1}, LOW); digitalWrite(${v.in2}, HIGH);`);
          lines.push(`${spaces}digitalWrite(${v.in3}, LOW); digitalWrite(${v.in4}, HIGH);`);
        } else {
          lines.push(`${spaces}digitalWrite(${v.in1}, LOW); digitalWrite(${v.in2}, LOW);`);
          lines.push(`${spaces}digitalWrite(${v.in3}, LOW); digitalWrite(${v.in4}, LOW);`);
        }
        break;

      case "if":
        const trueTarget = connections.find((c) => c.fromId === b.id && c.fromPort === "true")?.toId;
        const falseTarget = connections.find((c) => c.fromId === b.id && c.fromPort === "false")?.toId;

        lines.push(`${spaces}if (${v.left} ${v.operator} ${v.right}) {`);
        if (trueTarget) {
          lines.push(...renderBranch(trueTarget, indent + 2));
        }
        if (falseTarget) {
          lines.push(`${spaces}} else {`);
          lines.push(...renderBranch(falseTarget, indent + 2));
        }
        lines.push(`${spaces}}`);
        break;

      case "repeat":
        const repeatBody = connections.find((c) => c.fromId === b.id && c.fromPort === "body")?.toId;
        lines.push(`${spaces}for (int r = 0; r < ${v.times}; r++) {`);
        if (repeatBody) lines.push(...renderBranch(repeatBody, indent + 2));
        lines.push(`${spaces}}`);
        break;

      case "for":
        const forBody = connections.find((c) => c.fromId === b.id && c.fromPort === "body")?.toId;
        lines.push(`${spaces}for (int ${v.var} = ${v.start}; ${v.var} < ${v.end}; ${v.var} += ${v.step}) {`);
        if (forBody) lines.push(...renderBranch(forBody, indent + 2));
        lines.push(`${spaces}}`);
        break;

      case "while":
        const whileBody = connections.find((c) => c.fromId === b.id && c.fromPort === "body")?.toId;
        lines.push(`${spaces}while (${v.condition}) {`);
        if (whileBody) lines.push(...renderBranch(whileBody, indent + 2));
        lines.push(`${spaces}}`);
        break;
    }

    const nextTarget = connections.find((c) => c.fromId === b.id && c.fromPort === "next")?.toId;
    if (nextTarget) {
      lines.push(...renderBranch(nextTarget, indent));
    }

    return lines;
  }

  const loopBodyLines = [];
  rootBlocks.forEach((root) => {
    loopBodyLines.push(...renderBranch(root.id, 2));
  });

  // Also render any unvisited/unconnected blocks in loop
  flow.forEach((b) => {
    if (!visited.has(b.id) && b.type !== "start") {
      loopBodyLines.push(...renderBranch(b.id, 2));
    }
  });

  const fullCode = [
    "#include <Arduino.h>",
    Array.from(headers).filter(h => h !== "#include <Arduino.h>").join("\n"),
    "",
    globals.size > 0 ? Array.from(globals).join("\n") + "\n" : "",
    "void setup() {",
    setupLines.size > 0 ? Array.from(setupLines).join("\n") : "  // Baslangic ayarlari",
    "}",
    "",
    "void loop() {",
    loopBodyLines.length > 0 ? loopBodyLines.join("\n") : "  // Akis bloklari",
    "}",
    "",
  ].filter(Boolean).join("\n");

  return fullCode;
}

// ==========================================================================
// 10.5. REVERSE PARSER: ARDUINO C++ -> FLOW BLOCKS & CONNECTIONS
// ==========================================================================
function parseArduinoCodeToFlow(code) {
  const newFlow = [];
  const newConnections = [];

  let blockCounter = 1;
  function getNewId(prefix) {
    return `node_${Date.now()}_${blockCounter++}`;
  }

  // Extract Baud Rate from setup()
  let baudRate = "9600";
  const baudMatch = code.match(/Serial\.begin\(\s*(\d+)\s*\)/);
  if (baudMatch) {
    baudRate = baudMatch[1];
  }

  // Start block is always created
  const startBlock = {
    id: getNewId("start"),
    type: "start",
    title: "Program Baslangici",
    values: { baud: baudRate },
    position: { x: 80, y: 60 },
  };
  newFlow.push(startBlock);

  // Extract contents of void loop() or main code
  let loopBody = "";
  const loopMatch = code.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/);
  if (loopMatch) {
    loopBody = loopMatch[1];
  } else {
    loopBody = code;
  }

  function findMatchingBrace(str, openBraceIdx) {
    let depth = 0;
    for (let i = openBraceIdx; i < str.length; i++) {
      if (str[i] === "{") depth++;
      else if (str[i] === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
    return str.length;
  }

  function linkSequential(blockList) {
    for (let i = 0; i < blockList.length - 1; i++) {
      newConnections.push({
        fromId: blockList[i].id,
        fromPort: "next",
        toId: blockList[i + 1].id,
        toPort: "in",
      });
    }
  }

  function parseSingleStatement(stmt) {
    let m = stmt.match(/Serial\.print(?:ln)?\(\s*["']?([^"']*)["']?\s*\)/);
    if (m) {
      return { id: getNewId("print"), type: "print", title: "Print (Serial)", values: { text: m[1] }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/delay\(\s*(\d+)\s*\)/);
    if (m) {
      return { id: getNewId("delay"), type: "delay", title: "Delay", values: { ms: Number(m[1]) }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/digitalWrite\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
    if (m) {
      const val = (m[2] === "HIGH" || m[2] === "1") ? "HIGH" : "LOW";
      return { id: getNewId("pin-write"), type: "pin-write", title: "Pin Write", values: { pin: m[1], value: val }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/analogWrite\(\s*(\w+)\s*,\s*(\d+)\s*\)/);
    if (m) {
      return { id: getNewId("pwm"), type: "pwm", title: "PWM Output", values: { pin: m[1], duty: Number(m[2]) }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/(?:int\s+)?(\w+)\s*=\s*digitalRead\(\s*(\w+)\s*\)/);
    if (m) {
      return { id: getNewId("pin-read"), type: "pin-read", title: "Pin Read", values: { pin: m[2], store: m[1] }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/(?:int\s+)?(\w+)\s*=\s*analogRead\(\s*(\w+)\s*\)/);
    if (m) {
      return { id: getNewId("analog-read"), type: "analog-read", title: "Analog Read", values: { pin: m[2], store: m[1] }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/tone\(\s*(\w+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (m) {
      return { id: getNewId("buzzer"), type: "buzzer", title: "Buzzer Tone", values: { pin: m[1], freq: Number(m[2]), duration: Number(m[3]) }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/(?:int\s+)?(\w+)\s*=\s*map\(\s*(\w+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (m) {
      return {
        id: getNewId("map"),
        type: "map",
        title: "Map Transform",
        values: { store: m[1], val: m[2], inRange: `${m[3]}, ${m[4]}`, outRange: `${m[5]}, ${m[6]}` },
        position: { x: 0, y: 0 },
      };
    }

    m = stmt.match(/servo_?(\w*)\.write\(\s*(\d+)\s*\)/);
    if (m) {
      return { id: getNewId("servo"), type: "servo", title: "Servo Motor", values: { pin: m[1] || "9", angle: Number(m[2]) }, position: { x: 0, y: 0 } };
    }

    if (stmt.includes("dht.readTemperature")) {
      return { id: getNewId("dht"), type: "dht", title: "DHT11 Sensor", values: { pin: "2", temp: "sicaklik", humidity: "nem" }, position: { x: 0, y: 0 } };
    }

    m = stmt.match(/display\.println\(\s*["']?([^"']*)["']?\s*\)/);
    if (m) {
      return { id: getNewId("oled"), type: "oled", title: "1.3in OLED", values: { text: m[1] }, position: { x: 0, y: 0 } };
    }

    return null;
  }

  function parseStatements(str) {
    const parsedBlocks = [];
    let i = 0;
    const len = str.length;

    while (i < len) {
      while (i < len && /\s/.test(str[i])) i++;
      if (i >= len) break;

      if (str[i] === "/" && str[i + 1] === "/") {
        while (i < len && str[i] !== "\n") i++;
        continue;
      }

      const remaining = str.slice(i);

      // IF statement
      const ifMatch = remaining.match(/^if\s*\(([^)]+)\)\s*\{/);
      if (ifMatch) {
        const cond = ifMatch[1].trim();
        const startBodyIdx = i + ifMatch[0].length;
        const endBodyIdx = findMatchingBrace(str, startBodyIdx - 1);
        const ifBody = str.slice(startBodyIdx, endBodyIdx);
        i = endBodyIdx + 1;

        let elseBody = "";
        const afterIf = str.slice(i).trimStart();
        if (afterIf.startsWith("else")) {
          const elseMatch = afterIf.match(/^else\s*\{/);
          if (elseMatch) {
            const elseOffset = str.indexOf("else", i);
            const startElseIdx = elseOffset + elseMatch[0].length;
            const endElseIdx = findMatchingBrace(str, startElseIdx - 1);
            elseBody = str.slice(startElseIdx, endElseIdx);
            i = endElseIdx + 1;
          }
        }

        let left = "mesafe", op = "<=", right = "20";
        const condParts = cond.match(/^(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)$/);
        if (condParts) {
          left = condParts[1].trim();
          op = condParts[2].trim();
          right = condParts[3].trim();
        } else {
          left = cond;
          op = "==";
          right = "true";
        }

        const ifBlock = {
          id: getNewId("if"),
          type: "if",
          title: "If / Else",
          values: { left, operator: op, right },
          position: { x: 0, y: 0 },
        };
        newFlow.push(ifBlock);

        const trueBlocks = parseStatements(ifBody);
        if (trueBlocks.length > 0) {
          newConnections.push({ fromId: ifBlock.id, fromPort: "true", toId: trueBlocks[0].id, toPort: "in" });
          linkSequential(trueBlocks);
        }

        if (elseBody) {
          const falseBlocks = parseStatements(elseBody);
          if (falseBlocks.length > 0) {
            newConnections.push({ fromId: ifBlock.id, fromPort: "false", toId: falseBlocks[0].id, toPort: "in" });
            linkSequential(falseBlocks);
          }
        }

        parsedBlocks.push(ifBlock);
        continue;
      }

      // FOR / REPEAT statement
      const forMatch = remaining.match(/^for\s*\(([^)]+)\)\s*\{/);
      if (forMatch) {
        const header = forMatch[1].trim();
        const startBodyIdx = i + forMatch[0].length;
        const endBodyIdx = findMatchingBrace(str, startBodyIdx - 1);
        const bodyContent = str.slice(startBodyIdx, endBodyIdx);
        i = endBodyIdx + 1;

        const repeatMatch = header.match(/int\s+(\w+)\s*=\s*0\s*;\s*\1\s*<\s*(\d+)\s*;/);
        let loopBlock;
        if (repeatMatch) {
          loopBlock = {
            id: getNewId("repeat"),
            type: "repeat",
            title: "Repeat (Tekrarla)",
            values: { times: Number(repeatMatch[2]) || 5 },
            position: { x: 0, y: 0 },
          };
        } else {
          const forParts = header.match(/int\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\s*\+=\s*(\d+)/);
          loopBlock = {
            id: getNewId("for"),
            type: "for",
            title: "For Loop",
            values: {
              var: forParts ? forParts[1] : "i",
              start: forParts ? Number(forParts[2]) : 0,
              end: forParts ? Number(forParts[3]) : 10,
              step: forParts ? Number(forParts[4]) : 1,
            },
            position: { x: 0, y: 0 },
          };
        }
        newFlow.push(loopBlock);

        const bodyBlocks = parseStatements(bodyContent);
        if (bodyBlocks.length > 0) {
          newConnections.push({ fromId: loopBlock.id, fromPort: "body", toId: bodyBlocks[0].id, toPort: "in" });
          linkSequential(bodyBlocks);
        }

        parsedBlocks.push(loopBlock);
        continue;
      }

      // WHILE statement
      const whileMatch = remaining.match(/^while\s*\(([^)]+)\)\s*\{/);
      if (whileMatch) {
        const cond = whileMatch[1].trim();
        const startBodyIdx = i + whileMatch[0].length;
        const endBodyIdx = findMatchingBrace(str, startBodyIdx - 1);
        const bodyContent = str.slice(startBodyIdx, endBodyIdx);
        i = endBodyIdx + 1;

        const whileBlock = {
          id: getNewId("while"),
          type: "while",
          title: "While Loop",
          values: { condition: cond },
          position: { x: 0, y: 0 },
        };
        newFlow.push(whileBlock);

        const bodyBlocks = parseStatements(bodyContent);
        if (bodyBlocks.length > 0) {
          newConnections.push({ fromId: whileBlock.id, fromPort: "body", toId: bodyBlocks[0].id, toPort: "in" });
          linkSequential(bodyBlocks);
        }

        parsedBlocks.push(whileBlock);
        continue;
      }

      // Semicolon statement
      const semicolonIdx = str.indexOf(";", i);
      if (semicolonIdx === -1) break;

      const stmt = str.slice(i, semicolonIdx).trim();
      i = semicolonIdx + 1;

      const singleBlock = parseSingleStatement(stmt);
      if (singleBlock) {
        newFlow.push(singleBlock);
        parsedBlocks.push(singleBlock);
      }
    }

    return parsedBlocks;
  }

  const loopBlocks = parseStatements(loopBody);
  if (loopBlocks.length > 0) {
    newConnections.push({
      fromId: startBlock.id,
      fromPort: "next",
      toId: loopBlocks[0].id,
      toPort: "in",
    });
    linkSequential(loopBlocks);
  }

  return { flow: newFlow, connections: newConnections };
}

function applyCodeToFlow(code) {
  if (!code || !code.trim()) return;

  const result = parseArduinoCodeToFlow(code);
  if (!result || !result.flow || result.flow.length === 0) return;

  flow = result.flow;
  connections = result.connections;

  blocksLayer.innerHTML = "";
  flow.forEach((block) => {
    const el = buildBlockElement(block);
    if (el) blocksLayer.appendChild(el);
  });

  autoLayoutBlocks();
  recordSnapshot();

  const statusBadge = document.getElementById("ast-status-badge");
  if (statusBadge) {
    statusBadge.textContent = "C++ Kodu Blok Akışına Dönüştürüldü";
    setTimeout(() => {
      statusBadge.textContent = "Grafik Hazır • İki Yönlü Canlı Senkron";
    }, 2500);
  }
}

// ==========================================================================
// 11. WEB SERIAL API & SIMULATOR
// ==========================================================================
async function toggleWebSerial() {
  const btn = document.getElementById("btn-web-serial");
  const btnText = document.getElementById("serial-btn-text");
  const baudSelect = document.getElementById("serial-baud");

  if (isSerialConnected && serialPort) {
    try {
      if (serialReader) await serialReader.cancel();
      await serialPort.close();
    } catch (err) {}
    isSerialConnected = false;
    serialPort = null;
    btn.classList.remove("connected");
    btnText.textContent = "USB Baglan";
    logSerial("system", "[USB] Baglanti kapatildi.");
    return;
  }

  if (!("serial" in navigator)) {
    alert("Web Serial API bu tarayicida desteklenmiyor. Chrome veya Edge kullanin.");
    return;
  }

  try {
    const baud = Number(baudSelect.value) || 9600;
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: baud });

    isSerialConnected = true;
    btn.classList.add("connected");
    btnText.textContent = "Bagli";
    logSerial("system", `[USB] Baglanti basarili: ${baud} baud`);

    readSerialLoop();
  } catch (err) {
    logSerial("system", `[Hata] Baglanti kurulamadi: ${err.message}`);
  }
}

async function readSerialLoop() {
  while (serialPort && serialPort.readable && isSerialConnected) {
    const textDecoder = new TextDecoderStream();
    serialPort.readable.pipeTo(textDecoder.writable);
    serialReader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await serialReader.read();
        if (done) break;
        if (value) logSerial("rx", value.trim());
      }
    } catch (err) {
      break;
    } finally {
      serialReader.releaseLock();
    }
  }
}

async function sendSerialCommand(text) {
  if (!text) return;
  logSerial("tx", text);

  if (isSerialConnected && serialPort && serialPort.writable) {
    const textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(serialPort.writable);
    const writer = textEncoder.writable.getWriter();
    await writer.write(text + "\n");
    writer.releaseLock();
  } else {
    logSerial("info", `> Gonderildi: ${text}`);
  }
}

function logSerial(type, message) {
  const line = document.createElement("div");
  line.className = `console-line ${type}-line`;
  line.textContent = `> ${message}`;
  serialBody.appendChild(line);
  serialBody.scrollTop = serialBody.scrollHeight;
}

function toggleSimulation() {
  const btn = document.getElementById("btn-toggle-sim");
  const btnText = document.getElementById("sim-btn-text");

  if (isSimulating) {
    stopSimulation();
    btn.classList.remove("running");
    btnText.textContent = "Simule Et";
    return;
  }

  startSimulation();
  btn.classList.add("running");
  btnText.textContent = "Durdur";
}

function startSimulation() {
  if (flow.length === 0) {
    alert("Simulasyon icin calisma alanina blok ekleyin.");
    return;
  }

  isSimulating = true;
  simVariables = {};
  simPins = {};
  simHud.style.display = "block";

  logSerial("system", "[SIM] Simulasyon baslatildi.");

  const targetBlockIds = new Set(connections.map((c) => c.toId));
  let startBlocks = flow.filter((b) => !targetBlockIds.has(b.id));
  if (startBlocks.length === 0) startBlocks = [flow[0]];

  simExecutionPath = buildSimPath(startBlocks[0].id);
  simStepIndex = 0;

  runSimStep();
}

function buildSimPath(rootId) {
  const path = [];
  const visited = new Set();

  function traverse(id) {
    if (!id || visited.has(id)) return;
    visited.add(id);
    path.push(id);

    const b = flow.find((item) => item.id === id);
    if (!b) return;

    if (b.type === "if") {
      const trueConn = connections.find((c) => c.fromId === id && c.fromPort === "true");
      if (trueConn) traverse(trueConn.toId);
    } else if (b.type === "repeat" || b.type === "for" || b.type === "while") {
      const bodyConn = connections.find((c) => c.fromId === id && c.fromPort === "body");
      if (bodyConn) traverse(bodyConn.toId);
    }

    const nextConn = connections.find((c) => c.fromId === id && c.fromPort === "next");
    if (nextConn) traverse(nextConn.toId);
  }

  traverse(rootId);
  return path;
}

function runSimStep() {
  if (!isSimulating) return;

  if (simStepIndex >= simExecutionPath.length) {
    simStepIndex = 0;
  }

  const blockId = simExecutionPath[simStepIndex];
  const block = flow.find((b) => b.id === blockId);

  blocksLayer.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("simulating-active"));
  connectionsSvg.querySelectorAll(".cable-path").forEach((c) => c.classList.remove("cable-simulating"));

  if (block) {
    const nodeEl = blocksLayer.querySelector(`[data-id="${blockId}"]`);
    if (nodeEl) nodeEl.classList.add("simulating-active");

    executeSimBlockLogic(block);
  }

  simStepIndex++;
  const delay = block && block.type === "delay" ? Math.max(300, Number(block.values.ms) || 500) : 600;
  simInterval = setTimeout(runSimStep, delay);
}

function executeSimBlockLogic(block) {
  const v = block.values;
  switch (block.type) {
    case "print":
      logSerial("rx", `[Serial] ${v.text}`);
      break;
    case "pin-write":
      simPins[`D${v.pin}`] = v.value;
      logSerial("info", `[Pin ${v.pin}] -> ${v.value}`);
      break;
    case "pwm":
      simPins[`PWM ${v.pin}`] = `${v.duty}/255`;
      logSerial("info", `[PWM ${v.pin}] -> ${v.duty}`);
      break;
    case "servo":
      simPins[`Servo ${v.pin}`] = `${v.angle} deg`;
      logSerial("info", `[Servo ${v.pin}] Aci: ${v.angle}`);
      break;
    case "buzzer":
      logSerial("info", `[Buzzer ${v.pin}] ${v.freq} Hz`);
      break;
    case "ultrasonic":
      simVariables[v.store] = Math.floor(Math.random() * 50) + 5;
      logSerial("info", `[Ultrasonic] Mesafe: ${simVariables[v.store]} cm`);
      break;
    case "dht":
      simVariables[v.temp] = 24.0;
      simVariables[v.humidity] = 50;
      logSerial("info", `[DHT11] 24 C / %50`);
      break;
    case "oled":
      logSerial("info", `[OLED] "${v.text}"`);
      break;
  }
  updateSimHud();
}

function updateSimHud() {
  if (!hudPins) return;
  hudPins.innerHTML = "";
  
  const led13Hud = document.getElementById("hud-led-13");
  const led13Svg = document.getElementById("board-svg-led-13");
  const isPin13High = String(simPins["D13"]).toUpperCase() === "HIGH" || String(simPins["D13"]) === "1";

  if (led13Hud) led13Hud.classList.toggle("active-led-13", isPin13High);
  if (led13Svg) led13Svg.setAttribute("fill", isPin13High ? "#f59e0b" : "#27272a");

  for (const [pin, val] of Object.entries(simPins)) {
    const pill = document.createElement("span");
    pill.className = "hud-pin-pill";
    pill.textContent = `${pin}: ${val}`;
    hudPins.appendChild(pill);
  }
}

function flashTxRxLed(type = "tx") {
  const ledHud = document.getElementById(type === "tx" ? "hud-led-tx" : "hud-led-rx");
  const ledSvg = document.getElementById(type === "tx" ? "board-svg-led-tx" : "board-svg-led-rx");

  if (ledHud) ledHud.classList.add("active-led-txrx");
  if (ledSvg) ledSvg.setAttribute("fill", "#38bdf8");

  setTimeout(() => {
    if (ledHud) ledHud.classList.remove("active-led-txrx");
    if (ledSvg) ledSvg.setAttribute("fill", "#27272a");
  }, 120);
}

function stopSimulation() {
  isSimulating = false;
  clearTimeout(simInterval);
  if (simHud) simHud.style.display = "none";
  
  const led13Svg = document.getElementById("board-svg-led-13");
  if (led13Svg) led13Svg.setAttribute("fill", "#27272a");

  blocksLayer.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("simulating-active"));
  connectionsSvg.querySelectorAll(".cable-path").forEach((c) => c.classList.remove("cable-simulating"));
  logSerial("system", "[SIM] Simulasyon durduruldu.");
}

// ==========================================================================
// 12. PROJECT FILE OPERATIONS (JSON)
// ==========================================================================
function saveProjectFile() {
  const projectData = {
    appName: "Flowide",
    version: "1.0.7",
    timestamp: new Date().toISOString(),
    flow,
    connections,
  };

  const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "arduino_proje.flow.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadProjectFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.flow) {
        restoreFromJSON(data, true);
      } else {
        alert("Gecersiz proje dosyasi.");
      }
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };
  reader.readAsText(file);
}

function restoreFromJSON(data, fit = false) {
  flow = data.flow || [];
  connections = data.connections || [];

  blocksLayer.innerHTML = "";
  flow.forEach((block) => {
    const el = buildBlockElement(block);
    if (el) blocksLayer.appendChild(el);
  });

  if (fit) fitView();
  updateUI();
}

// ==========================================================================
// 13. UI & VERTICAL AUTO LAYOUT (ALT ALTA AKIŞ)
// ==========================================================================
function updateUI() {
  if (blockCountEl) {
    blockCountEl.textContent = flow.length;
  }

  if (flowSummary) {
    flowSummary.innerHTML = "";
    if (flow.length === 0) {
      flowSummary.innerHTML = "<li>Henuz blok yok</li>";
    } else {
      flow.forEach((item) => {
        const li = document.createElement("li");
        const valuesStr = Object.entries(item.values)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        li.textContent = `${item.title} - ${valuesStr}`;
        flowSummary.appendChild(li);
      });
    }
  }

  if (codeOutput && document.activeElement !== codeOutput) {
    codeOutput.value = generateArduinoCode();
  }

  drawConnections();
}

function autoLayoutBlocks() {
  if (flow.length === 0) return;

  const targetBlockIds = new Set(connections.map((c) => c.toId));
  let roots = flow.filter((b) => !targetBlockIds.has(b.id));
  if (roots.length === 0) roots = [flow[0]];

  const startX = 80;
  let currentY = 60;
  const visited = new Set();

  function getNodeHeight(b) {
    const el = blocksLayer.querySelector(`[data-id="${b.id}"]`);
    if (el && el.offsetHeight > 0) return el.offsetHeight;
    if (["if", "repeat", "for", "while"].includes(b.type)) return 120;
    if (b.type === "pin-write" || b.type === "pin-read" || b.type === "pwm") return 110;
    if (b.type === "buzzer" || b.type === "map" || b.type === "motor" || b.type === "ultrasonic" || b.type === "dht") return 145;
    return 95;
  }

  function layoutVertical(id, x, y) {
    if (visited.has(id)) return y;
    visited.add(id);

    const b = flow.find((item) => item.id === id);
    if (!b) return y;

    b.position = { x, y };
    const el = blocksLayer.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }

    const h = getNodeHeight(b);
    let maxY = y + h;

    // 1. Branch children (body or true/false) indent to the right
    const bodyConn = connections.find((c) => c.fromId === id && (c.fromPort === "body" || c.fromPort === "true"));
    const falseConn = connections.find((c) => c.fromId === id && c.fromPort === "false");

    if (bodyConn) {
      const branchMaxY = layoutVertical(bodyConn.toId, x + 260, y);
      maxY = Math.max(maxY, branchMaxY);
    }
    if (falseConn) {
      const branchMaxY = layoutVertical(falseConn.toId, x + 520, y);
      maxY = Math.max(maxY, branchMaxY);
    }

    // 2. Next sequential block goes directly below (alt alta)
    const nextConn = connections.find((c) => c.fromId === id && c.fromPort === "next");
    if (nextConn) {
      const nextY = Math.max(y + h + 28, maxY + 20);
      const subMaxY = layoutVertical(nextConn.toId, x, nextY);
      maxY = Math.max(maxY, subMaxY);
    }

    return maxY;
  }

  roots.forEach((r) => {
    currentY = layoutVertical(r.id, startX, currentY) + 40;
  });

  // Any remaining disconnected blocks are stacked vertically below
  flow.forEach((b) => {
    if (!visited.has(b.id)) {
      b.position = { x: startX, y: currentY };
      const el = blocksLayer.querySelector(`[data-id="${b.id}"]`);
      if (el) {
        el.style.left = `${b.position.x}px`;
        el.style.top = `${b.position.y}px`;
      }
      currentY += getNodeHeight(b) + 28;
    }
  });

  recordSnapshot();
  updateUI();
  fitView();
}

// ==========================================================================
// 14. VIEW & ROUTING CONTROLLERS (GLOBAL SCOPE)
// ==========================================================================
function enterIde() {
  document.body.classList.remove("view-docs");
  document.body.classList.add("started");

  const landing = document.getElementById("landing");
  const workspace = document.getElementById("app");
  const docsPage = document.getElementById("page-docs");

  if (landing) landing.style.display = "none";
  if (docsPage) docsPage.style.display = "none";
  if (workspace) workspace.style.display = "flex";

  const navHome = document.getElementById("nav-home");
  const navDocs = document.getElementById("nav-docs");
  const navIde = document.getElementById("nav-ide");

  if (navHome) navHome.classList.remove("active");
  if (navDocs) navDocs.classList.remove("active");
  if (navIde) navIde.classList.add("active");

  fitView();
}

function leaveIde() {
  document.body.classList.remove("started", "view-docs");

  const landing = document.getElementById("landing");
  const workspace = document.getElementById("app");
  const docsPage = document.getElementById("page-docs");

  if (docsPage) docsPage.style.display = "none";
  if (workspace) workspace.style.display = "none";
  if (landing) landing.style.display = "flex";

  const navHome = document.getElementById("nav-home");
  const navDocs = document.getElementById("nav-docs");
  const navIde = document.getElementById("nav-ide");

  if (navIde) navIde.classList.remove("active");
  if (navDocs) navDocs.classList.remove("active");
  if (navHome) navHome.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openDocsPage(tabName = null) {
  document.body.classList.remove("started");
  document.body.classList.add("view-docs");

  const landing = document.getElementById("landing");
  const workspace = document.getElementById("app");
  const docsPage = document.getElementById("page-docs");

  if (landing) landing.style.display = "none";
  if (workspace) workspace.style.display = "none";
  if (docsPage) docsPage.style.display = "block";

  const navHome = document.getElementById("nav-home");
  const navDocs = document.getElementById("nav-docs");
  const navIde = document.getElementById("nav-ide");

  if (navHome) navHome.classList.remove("active");
  if (navIde) navIde.classList.remove("active");
  if (navDocs) navDocs.classList.add("active");

  if (tabName) {
    switchDocsTab(tabName);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================================================
// 14.5. EVENT BINDINGS
// ==========================================================================
function initEvents() {
  if (viewport) {
    viewport.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".flow-node") || e.target.closest(".connector-port") || e.target.closest(".cable-path") || e.target.closest(".ide-bottom-bar") || e.target.closest(".sim-hud")) {
        return;
      }
      if (isSpacePressed || e.button === 1 || e.button === 0) {
        isPanning = true;
        startPan = {
          x: e.clientX - pan.x,
          y: e.clientY - pan.y,
        };
        viewport.classList.add("panning-active");
        if (e.button === 0 && !isSpacePressed) {
          setSelectedBlock(null);
        }
      }
    });

    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        zoomAt(zoomFactor, e.clientX, e.clientY);
      },
      { passive: false }
    );
  }

  // Global listeners for wire dragging, block dragging, and canvas panning
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("mouseup", handlePointerUp);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.target.closest("input, select, textarea") && !isSpacePressed) {
      isSpacePressed = true;
      viewport.classList.add("panning");
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) redo();
      else undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      redo();
    }
    if (e.key === "Delete" && selectedBlockId && !e.target.closest("input, select, textarea")) {
      removeBlock(selectedBlockId);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed = false;
      viewport.classList.remove("panning");
    }
  });

  const navHome = document.getElementById("nav-home");
  const navIde = document.getElementById("nav-ide");
  const navDocs = document.getElementById("nav-docs");
  const startIde = document.getElementById("start-ide");
  const scrollToDocsBtn = document.getElementById("scroll-to-docs");
  const footerLinkIde = document.getElementById("footer-link-ide");
  const footerLinkDocs = document.getElementById("footer-link-docs");

  function scrollToDocs() {
    leaveIde();
    setTimeout(() => {
      const el = document.getElementById("docs-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  }

  if (navHome) navHome.addEventListener("click", () => {
    leaveIde();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  if (navIde) navIde.addEventListener("click", enterIde);
  if (startIde) startIde.addEventListener("click", enterIde);
  if (footerLinkIde) {
    footerLinkIde.addEventListener("click", (e) => {
      e.preventDefault();
      enterIde();
    });
  }

  if (navDocs) navDocs.addEventListener("click", scrollToDocs);
  if (scrollToDocsBtn) scrollToDocsBtn.addEventListener("click", scrollToDocs);
  if (footerLinkDocs) {
    footerLinkDocs.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToDocs();
    });
  }

  // Dynamic Word Rotator on Landing Page
  const dynamicWordEl = document.getElementById("dynamic-word");
  if (dynamicWordEl) {
    const dynamicWords = [
      "Tasarlayın.",
      "Kodlayın.",
      "Hissedin.",
      "Üretin.",
      "Geliştirin.",
      "Özgürleştirin.",
      "Basitleştirin.",
    ];
    let wordIndex = 0;
    setInterval(() => {
      wordIndex = (wordIndex + 1) % dynamicWords.length;
      dynamicWordEl.classList.add("fade-out");
      setTimeout(() => {
        dynamicWordEl.textContent = dynamicWords[wordIndex];
        dynamicWordEl.classList.remove("fade-out");
      }, 250);
    }, 2400);
  }

  document.getElementById("btn-undo")?.addEventListener("click", undo);
  document.getElementById("btn-redo")?.addEventListener("click", redo);
  document.getElementById("auto-layout")?.addEventListener("click", autoLayoutBlocks);
  document.getElementById("clear-canvas")?.addEventListener("click", () => {
    flow = [];
    connections = [];
    blocksLayer.innerHTML = "";
    recordSnapshot();
    updateUI();
  });

  document.getElementById("btn-zoom-in")?.addEventListener("click", () => zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2));
  document.getElementById("btn-zoom-out")?.addEventListener("click", () => zoomAt(0.8, window.innerWidth / 2, window.innerHeight / 2));
  document.getElementById("btn-zoom-reset")?.addEventListener("click", () => {
    zoom = 1.0;
    pan = { x: 40, y: 40 };
    updateStageTransform();
  });
  document.getElementById("btn-zoom-fit")?.addEventListener("click", fitView);

  document.getElementById("btn-save-project")?.addEventListener("click", saveProjectFile);
  document.getElementById("load-project-input")?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) loadProjectFile(e.target.files[0]);
  });

  document.getElementById("btn-toggle-sim")?.addEventListener("click", toggleSimulation);
  document.getElementById("btn-web-serial")?.addEventListener("click", toggleWebSerial);
  document.getElementById("clear-serial")?.addEventListener("click", () => {
    if (serialBody) serialBody.innerHTML = '<div class="console-line system-line">&gt; Konsol temizlendi.</div>';
  });

  const sendInput = document.getElementById("serial-send-input");
  const sendBtn = document.getElementById("serial-send-btn");
  if (sendBtn && sendInput) {
    sendBtn.addEventListener("click", () => {
      sendSerialCommand(sendInput.value.trim());
      sendInput.value = "";
    });
    sendInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendSerialCommand(sendInput.value.trim());
        sendInput.value = "";
      }
    });
  }

  // Right Panel Tab Switcher
  const tabCode = document.getElementById("tab-code");
  const tabSerial = document.getElementById("tab-serial");
  const paneCode = document.getElementById("pane-code");
  const paneSerial = document.getElementById("pane-serial");
  const codeActions = document.getElementById("code-actions");
  const serialActions = document.getElementById("serial-actions");

  if (tabCode && tabSerial) {
    tabCode.addEventListener("click", () => {
      tabCode.classList.add("active");
      tabSerial.classList.remove("active");
      if (paneCode) { paneCode.style.display = "flex"; paneCode.classList.add("active"); }
      if (paneSerial) { paneSerial.style.display = "none"; paneSerial.classList.remove("active"); }
      if (codeActions) codeActions.style.display = "flex";
      if (serialActions) serialActions.style.display = "none";
    });

    tabSerial.addEventListener("click", () => {
      tabSerial.classList.add("active");
      tabCode.classList.remove("active");
      if (paneSerial) { paneSerial.style.display = "flex"; paneSerial.classList.add("active"); }
      if (paneCode) { paneCode.style.display = "none"; paneCode.classList.remove("active"); }
      if (serialActions) serialActions.style.display = "flex";
      if (codeActions) codeActions.style.display = "none";
    });
  }

  // Live Code Editor Input & Reverse Parsing
  let codeInputTimer = null;
  if (codeOutput) {
    codeOutput.addEventListener("input", () => {
      clearTimeout(codeInputTimer);
      codeInputTimer = setTimeout(() => {
        applyCodeToFlow(codeOutput.value);
      }, 450);
    });

    codeOutput.addEventListener("paste", () => {
      setTimeout(() => {
        applyCodeToFlow(codeOutput.value);
      }, 50);
    });

    codeOutput.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = codeOutput.selectionStart;
        const end = codeOutput.selectionEnd;
        codeOutput.value = codeOutput.value.substring(0, start) + "  " + codeOutput.value.substring(end);
        codeOutput.selectionStart = codeOutput.selectionEnd = start + 2;
      }
    });
  }

  document.getElementById("btn-sync-code")?.addEventListener("click", () => {
    applyCodeToFlow(codeOutput.value);
  });

  document.getElementById("copy-code")?.addEventListener("click", async (e) => {
    try {
      const codeText = codeOutput.value || codeOutput.textContent || "";
      await navigator.clipboard.writeText(codeText);
      const btn = e.currentTarget;
      const original = btn.innerHTML;
      btn.innerHTML = "<span>Kopyalandı</span>";
      setTimeout(() => (btn.innerHTML = original), 1500);
    } catch (err) {}
  });

  document.getElementById("download-ino")?.addEventListener("click", () => {
    const codeText = codeOutput.value || codeOutput.textContent || "";
    const blob = new Blob([codeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "arduino_flowide_proje.ino";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("toggle-examples")?.addEventListener("click", () => {
    const panel = document.getElementById("examples-panel");
    panel?.classList.toggle("collapsed");
  });

  // Sidebar Block Palette Drag & Drop & Click To Add
  document.querySelectorAll(".block-item").forEach((item) => {
    item.setAttribute("draggable", "true");

    item.addEventListener("dragstart", (e) => {
      const type = item.dataset.type;
      if (type) {
        e.dataTransfer.setData("text/plain", type);
        e.dataTransfer.setData("application/x-flow-type", type);
        e.dataTransfer.effectAllowed = "copy";
      }
    });

    // Click or double click to immediately insert into center of workspace
    item.addEventListener("click", () => {
      const type = item.dataset.type;
      if (!type || !blockDefinitions[type]) return;
      const rect = viewport ? viewport.getBoundingClientRect() : { width: 800, height: 600 };
      const targetX = Math.round(((rect.width / 2) - pan.x) / zoom) - 75 + ((flow.length * 20) % 120);
      const targetY = Math.round(((rect.height / 2) - pan.y) / zoom) - 25 + ((flow.length * 20) % 120);
      createFlowBlock(type, { x: targetX, y: targetY });
    });
  });

  if (viewport) {
    viewport.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    viewport.addEventListener("dragenter", (e) => {
      e.preventDefault();
    });

    viewport.addEventListener("drop", (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/x-flow-type") || e.dataTransfer.getData("text/plain");
      if (!type || !blockDefinitions[type]) return;

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const stageX = Math.round((mouseX - pan.x) / zoom) - 75;
      const stageY = Math.round((mouseY - pan.y) / zoom) - 25;

      createFlowBlock(type, { x: stageX, y: stageY });
    });
  }

  const blockSearchInput = document.getElementById("block-search");
  if (blockSearchInput) {
    blockSearchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll(".block-item").forEach((item) => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? "flex" : "none";
      });
    });
  }

  // Resizers
  document.querySelectorAll(".resizer").forEach((resizer) => {
    resizer.addEventListener("pointerdown", (e) => {
      const type = resizer.dataset.resize;
      const startX = e.clientX;
      const startExamples = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--examples-width")) || 240;
      const startSidebar = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width")) || 280;
      const startPanel = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--panel-width")) || 380;

      function onPointerMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        if (type === "examples") {
          const w = Math.min(340, Math.max(160, startExamples + delta));
          document.documentElement.style.setProperty("--examples-width", `${w}px`);
        } else if (type === "sidebar") {
          const w = Math.min(400, Math.max(200, startSidebar + delta));
          document.documentElement.style.setProperty("--sidebar-width", `${w}px`);
        } else if (type === "panel") {
          const w = Math.min(520, Math.max(240, startPanel - delta));
          document.documentElement.style.setProperty("--panel-width", `${w}px`);
        }
      }

      function onPointerUp() {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });
  });
}

// ==========================================================================
// 14.5. ARDUINO KNOWLEDGE BASE & OFFLINE CHAT ASSISTANT (3-BOOK COMPILATION)
// ==========================================================================
const ARDUINO_KNOWLEDGE_BASE = [
  {
    keywords: ["karaşimşek", "karasimsek", "knight rider", "yürüyen ışık", "sirali led"],
    title: "Karaşimşek (Knight Rider) Devresi",
    explanation: "Karaşimşek devresi, yan yana dizilmiş LED'lerin sırayla ileri ve geri yönlerde yakılıp söndürülmesi prensibine dayanır. Veli Çaman ve Sencer Altun kitaplarında for döngüsü ve 220 ohm koruma dirençleri kullanılarak tasarlanmıştır.",
    schematic: "Devre Bağlantısı: 2, 3, 4, 5, 6, 7, 8, 9 nolu dijital pinler -> 220 Ohm dirençler -> LED Anot (+), LED Katot (-) -> GND.",
    code: `void setup() {
  for (int i = 2; i <= 9; i++) {
    pinMode(i, OUTPUT);
  }
}

void loop() {
  for (int i = 2; i <= 9; i++) {
    digitalWrite(i, HIGH);
    delay(50);
    digitalWrite(i, LOW);
  }
  for (int i = 8; i >= 3; i--) {
    digitalWrite(i, HIGH);
    delay(50);
    digitalWrite(i, LOW);
  }
}`
  },
  {
    keywords: ["park sensör", "park sensor", "mesafe sensör", "mesafe sensor", "hc-sr04", "hcsr04", "ultrasonik"],
    title: "HC-SR04 Ultrasonik Park Sensörü",
    explanation: "HC-SR04 sensörü 40 kHz ultrasonik ses dalgası yayarak cisimlerden dönen yankı süresini ölçer (Mesafe = Süre / 58.2 cm). Mesafe azaldıkça buzzer bip sesleri ve LED uyarıları hızlanır.",
    schematic: "VCC -> 5V, GND -> GND, Trig -> Pin 12 (Çıkış), Echo -> Pin 13 (Giriş), Buzzer -> Pin 8, Kırmızı LED -> Pin 2.",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(12, OUTPUT);
  pinMode(13, INPUT);
  pinMode(8, OUTPUT);
  pinMode(2, OUTPUT);
}

void loop() {
  digitalWrite(12, LOW);
  delayMicroseconds(2);
  digitalWrite(12, HIGH);
  delayMicroseconds(10);
  digitalWrite(12, LOW);
  long sure = pulseIn(13, HIGH);
  long mesafe = sure / 58;
  Serial.print("Mesafe: ");
  Serial.println(mesafe);
  if (mesafe <= 15) {
    digitalWrite(2, HIGH);
    tone(8, 1000, 100);
    delay(100);
  } else {
    digitalWrite(2, LOW);
    delay(200);
  }
}`
  },
  {
    keywords: ["ldr", "gece lamba", "isik sensor", "ışık sensör", "far yak", "otomatik far"],
    title: "LDR Işık Sensörlü Otomatik Far / Gece Lambası",
    explanation: "LDR (Light Dependent Resistor), üzerine düşen ışık arttıkça direnci azalan, karanlıkta ise direnci megaohm seviyesine çıkan foto dirençtir. 10k dirençle gerilim bölücü kurularak A0 analog pininden ortam ışığı ölçülür.",
    schematic: "LDR bir ucu 5V, diğer ucu A0 pinine ve 10K direnç üzerinden GND'ye. LED Anot -> Pin 13, Katot -> 220 Ohm -> GND.",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}

void loop() {
  int isik = analogRead(A0);
  Serial.print("Isik Degeri: ");
  Serial.println(isik);
  if (isik < 200) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
  delay(200);
}`
  },
  {
    keywords: ["servo", "potansiyometre servo", "sg90", "servo pot"],
    title: "Potansiyometre ile Hassas Servo Motor Kontrolü",
    explanation: "Servo motorlar 0 ile 180 derece arasında açısal pozisyon alan dişli motorlardır. Potansiyometreden okunan 10-bit analog veri (0-1023), map() fonksiyonu ile 0-180 derece aralığına ölçeklenerek motora yazılır.",
    schematic: "Potansiyometre orta bacak -> A0, yan bacaklar 5V ve GND. Servo Kırmızı -> 5V, Kahverengi -> GND, Turuncu (Sinyal) -> Pin 9 (PWM).",
    code: `#include <Servo.h>

Servo servo_9;

void setup() {
  servo_9.attach(9);
}

void loop() {
  int potDeger = analogRead(A0);
  int aci = map(potDeger, 0, 1023, 0, 180);
  servo_9.write(aci);
  delay(15);
}`
  },
  {
    keywords: ["toprak nem", "sulama", "nem sensor", "otomatik sulama", "bitki sulama"],
    title: "Toprak Nem Sensörlü Otomatik Sulama Sistemi",
    explanation: "Toprak nem sensörü toprağın su oranına göre direnç değişimi üretir. Toprak kuruduğunda analog okuma değeri yükselir ve 5V röle modülü üzerinden 12V su motoru devreye girer.",
    schematic: "Toprak Nem Sensörü AO -> A0, VCC -> 5V, GND -> GND. 5V Röle IN -> Pin 3, Röle NO kontağı -> Su Pompası.",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(3, OUTPUT);
}

void loop() {
  int nem = analogRead(A0);
  Serial.print("Toprak Nem: ");
  Serial.println(nem);
  if (nem > 600) {
    digitalWrite(3, HIGH);
    Serial.println("Toprak kuru, sulama basladi.");
  } else {
    digitalWrite(3, LOW);
  }
  delay(1000);
}`
  },
  {
    keywords: ["trafik", "trafik ışık", "trafik isik", "traffic light"],
    title: "3 Renkli Trafik Işığı Sistemi",
    explanation: "Gerçek trafik akış algoritmasını simüle eder: Kırmızı ışık yanar (5 sn), ardından Sarı ile Kırmızı birlikte hazırlanır (1.5 sn), Yeşil ışık yanar (5 sn) ve Sarı ikaz sonrası döngü tekrarlanır.",
    schematic: "Kırmızı LED -> Pin 10, Sarı LED -> Pin 9, Yeşil LED -> Pin 8. Tüm LED katotları 220 Ohm dirençle GND'ye.",
    code: `void setup() {
  pinMode(10, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(8, OUTPUT);
}

void loop() {
  digitalWrite(10, HIGH);
  digitalWrite(9, LOW);
  digitalWrite(8, LOW);
  delay(5000);
  digitalWrite(9, HIGH);
  delay(1500);
  digitalWrite(10, LOW);
  digitalWrite(9, LOW);
  digitalWrite(8, HIGH);
  delay(5000);
  digitalWrite(8, LOW);
  digitalWrite(9, HIGH);
  delay(1500);
}`
  },
  {
    keywords: ["lm35", "sıcaklık", "sicaklik", "termometre", "yangin", "yangın"],
    title: "LM35 Sıcaklık Sensörü & Yangın/Fan Alarmı",
    explanation: "LM35 hassas analog sıcaklık sensörüdür. Her 1 santigrat derece için 10mV çıkış verir. (Sıcaklık = (AnalogOkuma / 1023.0) * 5000 / 10.0). Eşik değer aşıldığında alarm verir.",
    schematic: "LM35 Pin 1 (Sol) -> 5V, Pin 2 (Orta) -> A0, Pin 3 (Sağ) -> GND. Buzzer -> Pin 8, Kırmızı LED -> Pin 13.",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  pinMode(8, OUTPUT);
}

void loop() {
  int ham = analogRead(A0);
  float voltaj = (ham / 1023.0) * 5000.0;
  float sicaklik = voltaj / 10.0;
  Serial.print("Sicaklik (C): ");
  Serial.println(sicaklik);
  if (sicaklik > 35.0) {
    digitalWrite(13, HIGH);
    tone(8, 1200, 250);
  } else {
    digitalWrite(13, LOW);
  }
  delay(500);
}`
  },
  {
    keywords: ["gaz", "mq2", "mq-2", "mq4", "duman", "madenci", "baret"],
    title: "MQ-2 / MQ-4 Gaz ve Duman Kaçak Alarmı",
    explanation: "MQ serisi elektrokimyasal gaz sensörleri LPG, metan, bütan, propan ve dumanı algılar. Gaz yoğunluğu arttığında analog çıkış yükselir.",
    schematic: "MQ-2 AO -> A5, VCC -> 5V, GND -> GND. Buzzer -> Pin 10, Kırmızı LED -> Pin 12, Yeşil LED -> Pin 11.",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(12, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(10, OUTPUT);
}

void loop() {
  int gaz = analogRead(A5);
  Serial.print("Gaz Seviyesi: ");
  Serial.println(gaz);
  if (gaz > 400) {
    digitalWrite(12, HIGH);
    digitalWrite(11, LOW);
    tone(10, 1000, 200);
  } else {
    digitalWrite(12, LOW);
    digitalWrite(11, HIGH);
  }
  delay(200);
}`
  },
  {
    keywords: ["pir", "hareket", "hirsiz", "hırsız"],
    title: "PIR Hareket Sensörlü Güvenlik Alarmı",
    explanation: "PIR (Passive Infrared) sensör ortamdaki canlıların yaydığı kızılötesi ısı değişimini algılar. Hareket tespit edildiğinde OUT bacağından 3.3V (HIGH) verir.",
    schematic: "PIR VCC -> 5V, GND -> GND, OUT -> Pin 2 (Giriş). Buzzer -> Pin 10, LED -> Pin 13.",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT);
  pinMode(13, OUTPUT);
  pinMode(10, OUTPUT);
}

void loop() {
  int hareket = digitalRead(2);
  if (hareket == HIGH) {
    Serial.println("Hareket algilandi!");
    digitalWrite(13, HIGH);
    tone(10, 800, 300);
  } else {
    digitalWrite(13, LOW);
  }
  delay(150);
}`
  },
  {
    keywords: ["polis", "flasor", "çakar", "cakar"],
    title: "Polis Çakarı Flaşör Devresi",
    explanation: "Kırmızı ve Mavi LED gruplarının yüksek frekansta (30ms) 15'er kez sırayla seri olarak yakılıp söndürülmesiyle oluşturulan görsel ikaz sistemidir.",
    schematic: "Mavi LED'ler -> Pin 2, 3. Kırmızı LED'ler -> Pin 4, 5. Tüm LED'ler 220 Ohm dirençle GND'ye.",
    code: `void setup() {
  pinMode(2, OUTPUT);
  pinMode(3, OUTPUT);
  pinMode(4, OUTPUT);
  pinMode(5, OUTPUT);
}

void loop() {
  for (int r = 0; r < 15; r++) {
    digitalWrite(2, HIGH);
    digitalWrite(3, HIGH);
    delay(30);
    digitalWrite(2, LOW);
    digitalWrite(3, LOW);
    delay(30);
  }
  for (int r = 0; r < 15; r++) {
    digitalWrite(4, HIGH);
    digitalWrite(5, HIGH);
    delay(30);
    digitalWrite(4, LOW);
    digitalWrite(5, LOW);
    delay(30);
  }
}`
  },
  {
    keywords: ["buton", "button", "push", "anahtar"],
    title: "Buton ile LED Yakma (Dijital Giriş)",
    explanation: "Buton basıldığında pine HIGH veya LOW sinyali gönderir. Kararsız durumları önlemek için 10k pull-down direnci veya Arduino'nun dahili INPUT_PULLUP özelliği kullanılır.",
    schematic: "Buton bir ucu 5V, diğer ucu Pin 2 ve 10K direnç üzerinden GND'ye. LED -> Pin 13.",
    code: `void setup() {
  pinMode(2, INPUT);
  pinMode(13, OUTPUT);
}

void loop() {
  int durum = digitalRead(2);
  if (durum == HIGH) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
}`
  },
  {
    keywords: ["l298n", "dc motor", "motor sürücü", "motor surucu", "robot"],
    title: "L298N Çift Motor Sürücü & Robot Kontrolü",
    explanation: "L298N H-Köprüsü entegresi, mikrodenetleyiciden gelen zayıf mantık sinyalleriyle yüksek akımlı 12V DC motorların yönünü (İleri: HIGH/LOW, Geri: LOW/HIGH) ve PWM ile hızını kontrol eder.",
    schematic: "IN1 -> Pin 8, IN2 -> Pin 9, ENA (Hız) -> Pin 10 (PWM). Motor uçları OUT1 ve OUT2 klemenslerine.",
    code: `void setup() {
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
}

void loop() {
  digitalWrite(8, HIGH);
  digitalWrite(9, LOW);
  analogWrite(10, 200);
  delay(3000);
  digitalWrite(8, LOW);
  digitalWrite(9, HIGH);
  analogWrite(10, 200);
  delay(3000);
}`
  },
  {
    keywords: ["rfid", "rc522", "kart", "kapi", "kapı", "kilit"],
    title: "RC522 RFID Akıllı Kapı Kilidi",
    explanation: "13.56 MHz frekansında çalışan MFRC522 RFID okuyucu, karta yaklaştırılan kartın benzersiz 4 baytlık UID numarasını SPI protokolüyle okur. Yetkili UID eşleşirse servo motor kilit mandalını açar.",
    schematic: "SDA -> Pin 10, SCK -> Pin 13, MOSI -> Pin 11, MISO -> Pin 12, RST -> Pin 9. Servo -> Pin 8.",
    code: `#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>

MFRC522 rfid(10, 9);
Servo servo_8;

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
  servo_8.attach(8);
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  Serial.println("Kart Algilandi");
  servo_8.write(90);
  delay(3000);
  servo_8.write(0);
}`
  },
  {
    keywords: ["lcd", "16x2", "ekran", "liquidcrystal"],
    title: "16x2 Karakter LCD Ekran Uygulaması",
    explanation: "Hitachi HD44780 uyumlu 16 sütun 2 satırlı LCD ekran. LiquidCrystal kütüphanesiyle RS, E, D4, D5, D6, D7 paralel veri pinleri üzerinden kontrol edilir.",
    schematic: "RS -> Pin 12, E -> Pin 11, D4 -> Pin 5, D5 -> Pin 4, D6 -> Pin 3, D7 -> Pin 2. Vo ucu kontrast için 10k potansiyometreye.",
    code: `#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(16, 2);
  lcd.setCursor(0, 0);
  lcd.print("Flowide Arduino");
  lcd.setCursor(0, 1);
  lcd.print("Gorsel Kodlama");
}

void loop() {
  delay(1000);
}`
  },
  {
    keywords: ["bluetooth", "hc06", "hc-06", "arac", "araba"],
    title: "HC-06 Bluetooth Uzaktan Kumanda",
    explanation: "HC-06 UART seri haberleşme modülü ile telefon veya tabletten gelen 'F' (ileri), 'B' (geri), 'R' (sağ), 'L' (sol), 'V' (korna/buzzer) komutları çözümlenir.",
    schematic: "HC-06 VCC -> 5V, GND -> GND, TX -> Pin 10 (RX), RX -> Gerilim bölücü ile Pin 11 (TX).",
    code: `void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}

void loop() {
  if (Serial.available() > 0) {
    char komut = Serial.read();
    if (komut == 'F' || komut == '1') {
      digitalWrite(13, HIGH);
    } else if (komut == 'S' || komut == '0') {
      digitalWrite(13, LOW);
    }
  }
}`
  },
  {
    keywords: ["pwm nedir", "pwm", "analogwrite", "darbe genlik"],
    title: "PWM (Darbe Genişlik Modülasyonu) Nedir?",
    explanation: "PWM (Pulse Width Modulation), mikrodenetleyicinin dijital 5V çıkışını çok yüksek hızda açıp kapatarak (Duty Cycle) 0V ile 5V arasında yapay bir analog gerilim üretme tekniğidir.\n\n• Arduino Uno'da PWM pinleri: ~3, ~5, ~6, ~9, ~10, ~11 pinleridir.\n• Çözünürlük: 8-bit tir (0 ile 255 arası değer alır).\n• 0 = 0 Volt (%0 görev süresi)\n• 128 = 2.5 Volt (%50 görev süresi)\n• 255 = 5.0 Volt (%100 görev süresi)\n\nanalogWrite(pin, deger); komutuyla LED parlaklığı veya motor hızı hassas şekilde ayarlanır.",
    schematic: null,
    code: `void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  for (int parlaklik = 0; parlaklik <= 255; parlaklik += 5) {
    analogWrite(9, parlaklik);
    delay(20);
  }
  for (int parlaklik = 255; parlaklik >= 0; parlaklik -= 5) {
    analogWrite(9, parlaklik);
    delay(20);
  }
}`
  },
  {
    keywords: ["ohm kanunu", "ohm", "v=i*r", "direnç formülü", "direnc formulu"],
    title: "Ohm Kanunu ve Formüller",
    explanation: "Ohm Kanunu elektriğin temel kuralıdır: Bir iletkenden geçen akım, uçlarındaki gerilimle doğru, direnciyle ters orantılıdır.\n\nFormül: V = I * R\n• V (Gerilim - Volt)\n• I (Akım - Amper)\n• R (Direnç - Ohm)\n\nLED Koruma Direnci Hesabı:\nRs = (Vs - Vf) / If\nÖrnek: 5V beslemede 2V çalışma gerilimli ve 20mA (0.02A) akım çeken bir LED için:\nRs = (5 - 2) / 0.02 = 150 Ohm (Standart olarak 220 Ohm kullanılır).",
    schematic: null,
    code: null
  },
  {
    keywords: ["pull up", "pull down", "pullup", "pulldown"],
    title: "Pull-Up ve Pull-Down Direnç Mantığı",
    explanation: "Mikrodenetleyici giriş pinleri boşta bırakıldığında havadaki elektromanyetik gürültüden etkilenerek rastgele 0 ve 1 okuyabilir (Floating durumu). Bunu engellemek için 10k direnç kullanılır:\n\n• Pull-Down: Pin 10k dirençle GND'ye çekilir. Butona basılmadığında 0V (LOW), basıldığında 5V (HIGH) okunur.\n• Pull-Up: Pin 10k dirençle 5V'a çekilir. Butona basılmadığında 5V (HIGH), basıldığında 0V (LOW) okunur.\n• Dahili Pull-Up: pinMode(pin, INPUT_PULLUP); komutuyla harici dirence gerek kalmadan Arduino içindeki 20k direnç aktif edilir.",
    schematic: null,
    code: `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
}

void loop() {
  int basildi = digitalRead(2);
  if (basildi == LOW) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
}`
  },
  {
    keywords: ["millis", "delay farkı", "delay farki", "zamanlayici", "non blocking"],
    title: "millis() Fonksiyonu ve delay() Farkı",
    explanation: "• delay(): İşlemciyi belirtilen milisaniye boyunca tamamen durdurur. Bu sürede sensör okunamaz, butonlara tepki verilemez.\n• millis(): Arduino enerjilendiği andan itibaren geçen milisaniyeyi arka planda sayar (unsigned long, 50 güne kadar). Döngüyü kilitlemeden zamanlama kontrolü (if(simdikizaman - oncekizaman >= aralik)) yapılmasını sağlar.",
    schematic: null,
    code: `unsigned long oncekiZaman = 0;
int ledDurum = LOW;

void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  unsigned long simdikiZaman = millis();
  if (simdikiZaman - oncekiZaman >= 1000) {
    oncekiZaman = simdikiZaman;
    ledDurum = !ledDurum;
    digitalWrite(13, ledDurum);
  }
}`
  },
  {
    keywords: ["döngü", "dongu", "for", "while", "do while"],
    title: "Arduino Programlama Döngüleri (For, While, Do-While)",
    explanation: "• for döngüsü: Belirli bir başlangıç, bitiş ve artış miktarıyla belirli sayıda tekrarlama için kullanılır (Örn: for(int i=0; i<10; i++)).\n• while döngüsü: Belirtilen koşul doğru (true) olduğu sürece blok içindeki kodları çalıştırır.\n• do-while döngüsü: Koşula bakılmaksızın kodu en az bir kez mutlaka çalıştırır, ardından koşulu kontrol eder.\n• break: Döngüyü anında sonlandırır.\n• continue: Mevcut adımı atlayıp döngünün bir sonraki turuna geçer.",
    schematic: null,
    code: `void setup() {
  Serial.begin(9600);
}

void loop() {
  for (int i = 1; i <= 5; i++) {
    Serial.print("Sayac: ");
    Serial.println(i);
    delay(500);
  }
  while(1);
}`
  }
];

function findAssistantAnswer(query) {
  const cleanQ = query.toLowerCase().replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ");
  let bestMatch = null;
  let highestScore = 0;

  for (const item of ARDUINO_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (cleanQ.includes(kw)) {
        score += kw.length * 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && highestScore > 0) {
    return bestMatch;
  }

  // Check if it's a request to write code
  const isCodeRequest = /kod|yaz|yap|kur|olustur|devre|proje|kontrol|motor|led|sensor|sensör/i.test(query);
  if (isCodeRequest) {
    return {
      title: "Özel Arduino Devre & Kod Tasarımı",
      explanation: `"${query}" isteğinize uygun C++ programı ve devre bağlantısı hazırlandı.`,
      schematic: "Devre: Dijital pinler ve 220 Ohm koruma dirençleri üzerinden bileşen bağlantıları hazırlandı.",
      code: `void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}

void loop() {
  // ${query}
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`
    };
  }

  // Fallback for general questions with Gemini redirection
  return {
    title: "Teknik Danışma & Gemini",
    explanation: `"${query}" sorunuz için doğrudan bir devre şablonu bulunamadı. Daha ayrıntılı teknik rehberlik ve sorularınız için Google Gemini'ye danışabilirsiniz.`,
    schematic: null,
    code: null,
    isGeminiRedirect: true,
  };
}

function initAssistantChat() {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatSuggestions = document.getElementById("chat-suggestions");

  if (!chatForm || !chatInput || !chatMessages) return;

  function appendMessage(sender, text, item = null) {
    if (chatMessages.style.display === "none") {
      chatMessages.style.display = "flex";
    }

    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${sender === "user" ? "user-msg" : "bot-msg"}`;

    let contentHtml = `<div class="msg-content">`;

    if (sender === "user") {
      contentHtml += `<p>${escapeHtml(text)}</p>`;
    } else {
      if (item && item.title) {
        contentHtml += `<h4 class="bot-msg-title">${escapeHtml(item.title)}</h4>`;
      }
      if (item && item.explanation) {
        contentHtml += `<p class="bot-msg-desc">${escapeHtml(item.explanation)}</p>`;
      } else if (text) {
        contentHtml += `<p class="bot-msg-desc">${escapeHtml(text)}</p>`;
      }

      if (item && item.schematic) {
        const cleanSchematic = item.schematic.replace(/^(Devre Bağlantısı:|Devre:|Bağlantı:)\s*/i, "");
        contentHtml += `
          <div class="bot-schematic-card">
            <span class="schematic-lead">Devre Bağlantısı:</span>
            <span>${escapeHtml(cleanSchematic)}</span>
          </div>
        `;
      }

      if (item && item.code) {
        contentHtml += `<pre class="chat-code-block"><code>${escapeHtml(item.code)}</code></pre>`;
        contentHtml += `
          <div class="chat-action-row">
            <button type="button" class="chat-open-ide-btn" data-code="${encodeURIComponent(item.code)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>IDE'de Aç</span>
            </button>
          </div>
        `;
      }

      if (item && item.isGeminiRedirect) {
        contentHtml += `
          <div class="chat-action-row">
            <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" class="gemini-redirect-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              <span>Google Gemini'de Sor</span>
            </a>
          </div>
        `;
      }
    }

    contentHtml += `</div>`;
    msgDiv.innerHTML = contentHtml;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Bind open ide buttons
    msgDiv.querySelectorAll(".chat-open-ide-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rawCode = decodeURIComponent(btn.dataset.code);
        enterIde();
        if (codeOutput) codeOutput.value = rawCode;
        applyCodeToFlow(rawCode);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function handleUserSubmit(promptText) {
    const q = promptText.trim();
    if (!q) return;

    appendMessage("user", q);
    chatInput.value = "";

    setTimeout(() => {
      const match = findAssistantAnswer(q);
      appendMessage("bot", match.explanation, match);
    }, 200);
  }

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserSubmit(chatInput.value);
    });
  }

  const chatSendBtn = document.getElementById("chat-send-btn");
  if (chatSendBtn) {
    chatSendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleUserSubmit(chatInput.value);
    });
  }

  if (chatSuggestions) {
    chatSuggestions.querySelectorAll(".suggestion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        handleUserSubmit(chip.dataset.prompt);
      });
    });
  }
}

// ==========================================================================
// 14.6. INTEGRATED IN-PAGE DOCUMENTATION CONTROLLER
// ==========================================================================
function switchDocsTab(tabId) {
  document.querySelectorAll(".docs-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".docs-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === tabId);
  });
}

function initDocsSection() {
  const searchInput = document.getElementById("docs-projects-filter");
  const projectsGrid = document.getElementById("docs-projects-grid");

  // Tab switcher
  document.querySelectorAll(".docs-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchDocsTab(btn.dataset.tab);
    });
  });

  // Populate projects grid with all projects from knowledge base
  if (projectsGrid) {
    projectsGrid.innerHTML = "";
    ARDUINO_KNOWLEDGE_BASE.filter((item) => item.code).forEach((proj) => {
      const card = document.createElement("div");
      card.className = "doc-project-card";
      card.innerHTML = `
        <h5>${escapeHtml(proj.title)}</h5>
        <p>${escapeHtml(proj.explanation)}</p>
        ${proj.schematic ? `<div class="doc-schematic"><span>Devre:</span> <span>${escapeHtml(proj.schematic.replace(/^(Devre Bağlantısı:|Devre:|Bağlantı:)\s*/i, ""))}</span></div>` : ""}
        <code>${escapeHtml(proj.code)}</code>
        <div class="card-footer">
          <button type="button" class="chat-open-ide-btn doc-load-btn" data-code="${encodeURIComponent(proj.code)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>IDE'de Aç</span>
          </button>
        </div>
      `;
      projectsGrid.appendChild(card);
    });

    projectsGrid.querySelectorAll(".doc-load-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rawCode = decodeURIComponent(btn.dataset.code);
        enterIde();
        if (codeOutput) codeOutput.value = rawCode;
        applyCodeToFlow(rawCode);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  // Real-time project filter
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        document.querySelectorAll("#docs-projects-grid .doc-project-card").forEach((el) => {
          el.style.display = "flex";
        });
        return;
      }

      document.querySelectorAll("#docs-projects-grid .doc-project-card").forEach((el) => {
        const txt = el.textContent.toLowerCase();
        el.style.display = txt.includes(q) ? "flex" : "none";
      });
    });
  }
}

// ==========================================================================
// 14.7. IN-IDE ASSISTANT CONTROLLER
// ==========================================================================
function initIdeAssistant() {
  const ideChatInput = document.getElementById("ide-chat-input");
  const ideChatSendBtn = document.getElementById("ide-chat-send-btn");
  const ideChatResponse = document.getElementById("ide-chat-response");
  const ideChatBody = document.getElementById("ide-chat-body");
  const ideChatClose = document.getElementById("ide-chat-close");

  if (!ideChatInput || !ideChatSendBtn || !ideChatResponse || !ideChatBody) return;

  function submitIdePrompt() {
    const q = ideChatInput.value.trim();
    if (!q) {
      ideChatResponse.style.display = "block";
      ideChatBody.innerHTML = `
        <div style="font-size:0.85rem; color:#e4e4e7;">
          <strong>İpucu:</strong> Bağlantı noktalarını tutup diğer bloğa sürükleyin veya art arda tıklayın.
        </div>
      `;
      return;
    }

    const match = findAssistantAnswer(q);
    ideChatResponse.style.display = "block";

    let html = `
      <div class="bot-msg-title"><h4>${escapeHtml(match.title)}</h4></div>
      <p class="bot-msg-desc">${escapeHtml(match.explanation)}</p>
    `;

    if (match.schematic) {
      const cleanSchematic = match.schematic.replace(/^(Devre Bağlantısı:|Devre:|Bağlantı:)\s*/i, "");
      html += `
        <div class="bot-schematic-card">
          <span class="schematic-lead">Devre:</span>
          <span>${escapeHtml(cleanSchematic)}</span>
        </div>
      `;
    }

    if (match.code) {
      html += `<pre class="chat-code-block"><code>${escapeHtml(match.code)}</code></pre>`;
      html += `
        <div class="chat-action-row" style="margin-top:0.4rem;">
          <button type="button" class="chat-open-ide-btn ide-apply-code-btn" data-code="${encodeURIComponent(match.code)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Akışa Aktar</span>
          </button>
        </div>
      `;
    }

    if (match.isGeminiRedirect) {
      html += `
        <div class="chat-action-row" style="margin-top:0.4rem;">
          <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" class="gemini-redirect-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>Google Gemini'de Sor</span>
          </a>
        </div>
      `;
    }

    ideChatBody.innerHTML = html;
    ideChatInput.value = "";

    // Bind apply code button
    ideChatBody.querySelectorAll(".ide-apply-code-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rawCode = decodeURIComponent(btn.dataset.code);
        if (codeOutput) codeOutput.value = rawCode;
        applyCodeToFlow(rawCode);
        ideChatResponse.style.display = "none";
      });
    });
  }

  ideChatSendBtn.addEventListener("click", submitIdePrompt);
  ideChatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitIdePrompt();
    }
  });

  if (ideChatClose) {
    ideChatClose.addEventListener("click", () => {
      ideChatResponse.style.display = "none";
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadExampleFlow(name) {
  const ex = examples[name];
  if (!ex) return;
  restoreFromJSON(ex, true);
  recordSnapshot();
}

// ==========================================================================
// 15. BOOTSTRAP
// ==========================================================================
if (typeof initEvents === "function" && document.getElementById("canvas-viewport")) {
  initEvents();
}
if (typeof initAssistantChat === "function" && document.getElementById("chat-form")) {
  initAssistantChat();
}
if (typeof initDocsSection === "function" && document.getElementById("docs-section")) {
  initDocsSection();
}
if (typeof initIdeAssistant === "function") {
  initIdeAssistant();
}

if (document.getElementById("canvas-viewport")) {
  if (!loadFromLocalStorage()) {
    loadExampleFlow("blink");
  }
  updateStageTransform();
}
