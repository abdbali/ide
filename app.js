const canvas = document.getElementById("canvas");
const codeOutput = document.getElementById("code-output");
const flowSummary = document.getElementById("flow-summary");
const blockCount = document.getElementById("block-count");
const clearCanvas = document.getElementById("clear-canvas");
const autoLayout = document.getElementById("auto-layout");
const downloadButton = document.getElementById("download-ino");
const copyButton = document.getElementById("copy-code");
const searchInput = document.getElementById("block-search");
const connectionsSvg = document.getElementById("connections");
const exampleButtons = document.querySelectorAll(".example");
const loginOverlay = document.getElementById("login-overlay");
const loginButton = document.getElementById("login-button");
const registerButton = document.getElementById("register-button");
const googleButton = document.getElementById("google-button");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authMessage = document.getElementById("auth-message");
const appRoot = document.getElementById("app");
const logoutButton = document.getElementById("logout-button");
const sessionUser = document.getElementById("session-user");
const clearSerial = document.getElementById("clear-serial");
const serialBody = document.getElementById("serial-body");
const examplesPanel = document.getElementById("examples-panel");
const toggleExamples = document.getElementById("toggle-examples");
const resizers = document.querySelectorAll(".resizer");

const blockDefinitions = {
  print: {
    title: "Print",
    theme: "block-theme-blue",
    fields: [{ label: "Text", name: "text", type: "text", value: "Hello world" }],
  },
  delay: {
    title: "Delay",
    theme: "block-theme-orange",
    fields: [{ label: "Süre (ms)", name: "ms", type: "number", value: 1000 }],
  },
  repeat: {
    title: "Repeat",
    theme: "block-theme-purple",
    fields: [{ label: "Times", name: "times", type: "number", value: 1 }],
  },
  if: {
    title: "If-Else",
    theme: "block-theme-blue",
    fields: [
      { label: "Sol", name: "left", type: "text", value: "value" },
      { label: "Koşul", name: "operator", type: "select", value: ">=", options: [">=", "<=", "==", "!="] },
      { label: "Sağ", name: "right", type: "number", value: 0 },
    ],
  },
  for: {
    title: "For Loop",
    theme: "block-theme-purple",
    fields: [
      { label: "Değişken", name: "var", type: "text", value: "i" },
      { label: "Aralık", name: "range", type: "text", value: "range(10)" },
    ],
  },
  while: {
    title: "While Loop",
    theme: "block-theme-green",
    fields: [{ label: "Condition", name: "condition", type: "text", value: "true" }],
  },
  "pin-write": {
    title: "Pin Write",
    theme: "block-theme-orange",
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 4 },
      { label: "Value", name: "value", type: "select", value: "HIGH", options: ["HIGH", "LOW"] },
    ],
  },
  "pin-read": {
    title: "Pin Read",
    theme: "block-theme-blue",
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 4 },
      { label: "Store", name: "store", type: "text", value: "value" },
    ],
  },
  pwm: {
    title: "PWM",
    theme: "block-theme-purple",
    fields: [
      { label: "Pin", name: "pin", type: "number", value: 2 },
      { label: "Frequency", name: "frequency", type: "number", value: 100 },
      { label: "Duty", name: "duty", type: "number", value: 512 },
    ],
  },
  buzzer: {
    title: "Buzzer Tone",
    theme: "block-theme-teal",
    fields: [
      { label: "Buzzer pin", name: "pin", type: "number", value: 46 },
      { label: "Tone", name: "tone", type: "number", value: 1 },
    ],
  },
  ultrasonic: {
    title: "Ultrasonic Sensor",
    theme: "block-theme-purple",
    fields: [
      { label: "Trigger", name: "trigger", type: "number", value: 1 },
      { label: "Echo", name: "echo", type: "number", value: 5 },
      { label: "Store", name: "store", type: "text", value: "distance" },
    ],
  },
  dht: {
    title: "DHT11 Sensor",
    theme: "block-theme-teal",
    fields: [
      { label: "Data", name: "data", type: "number", value: 4 },
      { label: "Temperature", name: "temp", type: "text", value: "temperature" },
      { label: "Humidity", name: "humidity", type: "text", value: "humidity" },
    ],
  },
  rfid: {
    title: "RFID Sensor",
    theme: "block-theme-purple",
    fields: [
      { label: "SCK", name: "sck", type: "number", value: 4 },
      { label: "MOSI", name: "mosi", type: "number", value: 5 },
      { label: "MISO", name: "miso", type: "number", value: 6 },
      { label: "RST", name: "rst", type: "number", value: 7 },
      { label: "CS", name: "cs", type: "number", value: 15 },
      { label: "UID", name: "uid", type: "text", value: "uid" },
    ],
  },
  servo: {
    title: "Servo Motor",
    theme: "block-theme-orange",
    fields: [
      { label: "Port", name: "port", type: "text", value: "Port 1" },
      { label: "Servo Pin", name: "pin", type: "number", value: 4 },
      { label: "Angle", name: "angle", type: "number", value: 90 },
    ],
  },
  oled: {
    title: "1.3in OLED",
    theme: "block-theme-purple",
    fields: [
      { label: "Port", name: "port", type: "text", value: "Port 1" },
      { label: "SCK pin", name: "sck", type: "number", value: 47 },
      { label: "SDA pin", name: "sda", type: "number", value: 48 },
      { label: "Rotate", name: "rotate", type: "number", value: 0 },
      { label: "Text", name: "text", type: "text", value: "Hello world" },
    ],
  },
  wifi: {
    title: "WiFi Connect",
    theme: "block-theme-red",
    fields: [
      { label: "SSID", name: "ssid", type: "text", value: "MyWiFi" },
      { label: "Password", name: "password", type: "text", value: "password" },
    ],
  },
  motor: {
    title: "L298N Motor Driver",
    theme: "block-theme-red",
    fields: [
      { label: "IN1 Pin", name: "in1", type: "number", value: 12 },
      { label: "IN2 Pin", name: "in2", type: "number", value: 14 },
      { label: "IN3 Pin", name: "in3", type: "number", value: 27 },
      { label: "IN4 Pin", name: "in4", type: "number", value: 26 },
      {
        label: "Direction",
        name: "direction",
        type: "select",
        value: "Forward",
        options: ["Forward", "Backward", "Stop"],
      },
    ],
  },
};

const examples = {
  blink: {
    blocks: [
      { type: "pin-write", values: { pin: 13, value: "HIGH" } },
      { type: "delay", values: { ms: 500 } },
      { type: "pin-write", values: { pin: 13, value: "LOW" } },
      { type: "delay", values: { ms: 500 } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  },
  fade: {
    blocks: [
      { type: "pwm", values: { pin: 9, frequency: 500, duty: 128 } },
      { type: "delay", values: { ms: 60 } },
      { type: "repeat", values: { times: 10 } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  distance: {
    blocks: [
      { type: "ultrasonic", values: { trigger: 2, echo: 3, store: "mesafe" } },
      { type: "if", values: { left: "mesafe", operator: "<=", right: 20 } },
      { type: "buzzer", values: { pin: 8, tone: 800 } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  climate: {
    blocks: [
      { type: "dht", values: { data: 4, temp: "sicaklik", humidity: "nem" } },
      { type: "print", values: { text: "Sicaklik ve nem" } },
      { type: "delay", values: { ms: 2000 } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  servo: {
    blocks: [
      { type: "servo", values: { port: "Port 1", pin: 4, angle: 0 } },
      { type: "delay", values: { ms: 300 } },
      { type: "servo", values: { port: "Port 1", pin: 4, angle: 180 } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  rfid: {
    blocks: [
      { type: "rfid", values: { sck: 4, mosi: 5, miso: 6, rst: 7, cs: 15, uid: "uid" } },
      { type: "if", values: { left: "uid", operator: "==", right: 1234 } },
      { type: "pin-write", values: { pin: 12, value: "HIGH" } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  oled: {
    blocks: [
      { type: "oled", values: { port: "Port 1", sck: 47, sda: 48, rotate: 0, text: "Merhaba" } },
      { type: "delay", values: { ms: 1000 } },
      { type: "print", values: { text: "OLED guncellendi" } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  motor: {
    blocks: [
      { type: "motor", values: { in1: 12, in2: 14, in3: 27, in4: 26, direction: "Forward" } },
      { type: "delay", values: { ms: 1500 } },
      { type: "motor", values: { in1: 12, in2: 14, in3: 27, in4: 26, direction: "Backward" } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  iot: {
    blocks: [
      { type: "wifi", values: { ssid: "MyWiFi", password: "password" } },
      { type: "rfid", values: { sck: 4, mosi: 5, miso: 6, rst: 7, cs: 15, uid: "uid" } },
      { type: "oled", values: { port: "Port 1", sck: 47, sda: 48, rotate: 0, text: "Merhaba" } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  loop: {
    blocks: [
      { type: "repeat", values: { times: 5 } },
      { type: "for", values: { var: "i", range: "range(10)" } },
      { type: "while", values: { condition: "true" } },
    ],
    connections: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
};

let flow = [];
let connections = [];
let pendingConnector = null;
let nextPosition = { x: 40, y: 60 };
let activeDrag = null;
let selectedBlockId = null;
let storedExamplesWidth = null;
let activeResizer = null;

function updateUI() {
  blockCount.textContent = flow.length;
  flowSummary.innerHTML = "";

  if (flow.length === 0) {
    flowSummary.innerHTML = "<li>Henüz blok yok</li>";
  } else {
    flow.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.title} — ${item.summary}`;
      flowSummary.appendChild(li);
    });
  }

  codeOutput.textContent = generateCode();
  drawConnections();
}

function generateCode() {
  if (flow.length === 0) {
    return "// Blok ekleyerek Arduino kodunu burada görebilirsiniz.\n";
  }

  const lines = ["#include <Arduino.h>", "", "void setup() {", "  // Başlangıç ayarları", "}", "", "void loop() {"];

  flow.forEach((block) => {
    lines.push(...blockToCode(block));
  });

  lines.push("}", "");
  return lines.join("\n");
}

function blockToCode(block) {
  const fields = block.values;
  switch (block.type) {
    case "print":
      return [`  Serial.println(\"${fields.text}\");`];
    case "delay":
      return [`  delay(${fields.ms});`];
    case "repeat":
      return [`  for (int i = 0; i < ${fields.times}; i++) {`, "    // tekrar", "  }"];
    case "if":
      return [
        `  if (${fields.left} ${fields.operator} ${fields.right}) {`,
        "    // koşul",
        "  } else {",
        "    // alternatif",
        "  }",
      ];
    case "for":
      return [`  for (int ${fields.var} = 0; ${fields.var} < 10; ${fields.var}++) {`, "    // tekrar", "  }"];
    case "while":
      return [`  while (${fields.condition}) {`, "    // koşul doğruyken", "  }"];
    case "pin-write":
      return [`  pinMode(${fields.pin}, OUTPUT);`, `  digitalWrite(${fields.pin}, ${fields.value});`];
    case "pin-read":
      return [`  pinMode(${fields.pin}, INPUT);`, `  int ${fields.store} = digitalRead(${fields.pin});`];
    case "pwm":
      return [`  analogWrite(${fields.pin}, ${fields.duty}); // ${fields.frequency}Hz`];
    case "buzzer":
      return [`  tone(${fields.pin}, ${fields.tone});`];
    case "ultrasonic":
      return [`  // Ultrasonik ölçüm: trig ${fields.trigger}, echo ${fields.echo}`];
    case "dht":
      return [`  // DHT11 data ${fields.data}`, `  float ${fields.temp} = 0;`, `  float ${fields.humidity} = 0;`];
    case "rfid":
      return [`  // RFID SCK:${fields.sck} MOSI:${fields.mosi} MISO:${fields.miso} RST:${fields.rst} CS:${fields.cs}`];
    case "servo":
      return [`  // Servo ${fields.pin} -> ${fields.angle}°`];
    case "oled":
      return [`  // OLED ${fields.sck}/${fields.sda} yaz: ${fields.text}`];
    case "wifi":
      return [`  // WiFi SSID: ${fields.ssid}`];
    case "motor":
      return [`  // L298N ${fields.direction} (IN1:${fields.in1} IN2:${fields.in2} IN3:${fields.in3} IN4:${fields.in4})`];
    default:
      return ["  // blok"];
  }
}

function buildSummary(block) {
  const values = Object.values(block.values).join(", ");
  return values.length > 0 ? values : "";
}

function buildBlockElement(block, options = { draggable: true, showConnectors: true }) {
  const element = document.createElement("article");
  element.className = `flow-block ${block.theme}`;
  element.dataset.id = block.id;
  element.style.left = `${block.position.x}px`;
  element.style.top = `${block.position.y}px`;

  const title = document.createElement("div");
  title.className = "block-title";
  title.innerHTML = `<span>${block.title}</span><button aria-label="Sil">✕</button>`;

  const body = document.createElement("div");
  body.className = "block-body";

  block.fields.forEach((field) => {
    const row = document.createElement("label");
    row.innerHTML = `<span>${field.label}</span>`;

    if (field.type === "select") {
      const select = document.createElement("select");
      field.options.forEach((option) => {
        const optionEl = document.createElement("option");
        optionEl.value = option;
        optionEl.textContent = option;
        if (option === block.values[field.name]) {
          optionEl.selected = true;
        }
        select.appendChild(optionEl);
      });
      select.addEventListener("change", () => {
        block.values[field.name] = select.value;
        block.summary = buildSummary(block);
        updateUI();
      });
      row.appendChild(select);
    } else {
      const input = document.createElement("input");
      input.type = field.type;
      input.value = block.values[field.name];
      input.addEventListener("input", () => {
        block.values[field.name] = input.value;
        block.summary = buildSummary(block);
        updateUI();
      });
      row.appendChild(input);
    }

    body.appendChild(row);
  });

  title.querySelector("button").addEventListener("click", () => {
    removeBlock(block.id);
  });

  if (options.showConnectors) {
    const inputConnector = document.createElement("button");
    inputConnector.className = "connector input";
    inputConnector.type = "button";
    inputConnector.dataset.connector = "input";

    const outputConnector = document.createElement("button");
    outputConnector.className = "connector output";
    outputConnector.type = "button";
    outputConnector.dataset.connector = "output";

    inputConnector.addEventListener("click", () => handleConnectorClick(block, "input", inputConnector));
    outputConnector.addEventListener("click", () => handleConnectorClick(block, "output", outputConnector));

    element.appendChild(inputConnector);
    element.appendChild(outputConnector);
  }

  if (options.draggable) {
    element.addEventListener("pointerdown", (event) => startDragBlock(event, block, element));
  }

  element.addEventListener("click", () => setSelectedBlock(block.id));

  element.appendChild(title);
  element.appendChild(body);

  return element;
}

function createFlowBlock(type, position = null, overrideValues = null) {
  const definition = blockDefinitions[type];
  if (!definition) return;

  const values = {};
  definition.fields.forEach((field) => {
    values[field.name] = field.value;
  });

  const block = {
    id: Date.now() + Math.random(),
    type,
    title: definition.title,
    theme: definition.theme,
    fields: definition.fields,
    values: { ...values, ...overrideValues },
    summary: "",
    position: position || { x: nextPosition.x, y: nextPosition.y },
  };

  block.summary = buildSummary(block);
  flow.push(block);

  const element = buildBlockElement(block);
  canvas.appendChild(element);
  advanceNextPosition();
  setSelectedBlock(block.id);
  updateUI();
}

function advanceNextPosition() {
  nextPosition.x += 240;
  if (nextPosition.x > canvas.clientWidth - 260) {
    nextPosition.x = 40;
    nextPosition.y += 220;
  }
}

function handleDrop(event) {
  event.preventDefault();
  canvas.classList.remove("drag-over");
  const type = event.dataTransfer.getData("text/plain");
  if (type) {
    const canvasRect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - canvasRect.left - 100,
      y: event.clientY - canvasRect.top - 40,
    };
    createFlowBlock(type, position);
  }
}

function handleConnectorClick(block, type, element) {
  if (!pendingConnector) {
    pendingConnector = { blockId: block.id, type, element };
    element.classList.add("active");
    return;
  }

  if (pendingConnector.blockId === block.id) {
    pendingConnector.element.classList.remove("active");
    pendingConnector = null;
    return;
  }

  const from = pendingConnector.type === "output" ? pendingConnector.blockId : block.id;
  const to = pendingConnector.type === "output" ? block.id : pendingConnector.blockId;

  connections.push({ from, to });
  pendingConnector.element.classList.remove("active");
  pendingConnector = null;
  updateUI();
}

function drawConnections() {
  connectionsSvg.innerHTML = "";
  const canvasRect = canvas.getBoundingClientRect();

  connections.forEach((conn) => {
    const fromEl = canvas.querySelector(`[data-id="${conn.from}"] .connector.output`);
    const toEl = canvas.querySelector(`[data-id="${conn.to}"] .connector.input`);
    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
    const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
    const y2 = toRect.top + toRect.height / 2 - canvasRect.top;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const curve = `M ${x1} ${y1} C ${x1 + 90} ${y1}, ${x2 - 90} ${y2}, ${x2} ${y2}`;
    path.setAttribute("d", curve);
    path.setAttribute("class", "connection-line");
    connectionsSvg.appendChild(path);
  });
}

function startDragBlock(event, block, element) {
  if (event.target.closest("input, select, button")) {
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  activeDrag = {
    block,
    element,
    offsetX: event.clientX - canvasRect.left - block.position.x,
    offsetY: event.clientY - canvasRect.top - block.position.y,
  };
  element.setPointerCapture(event.pointerId);
  setSelectedBlock(block.id);
}

function handleBlockMove(event) {
  if (!activeDrag) return;
  const canvasRect = canvas.getBoundingClientRect();
  const x = event.clientX - canvasRect.left - activeDrag.offsetX;
  const y = event.clientY - canvasRect.top - activeDrag.offsetY;

  activeDrag.block.position.x = Math.max(0, x);
  activeDrag.block.position.y = Math.max(0, y);
  activeDrag.element.style.left = `${activeDrag.block.position.x}px`;
  activeDrag.element.style.top = `${activeDrag.block.position.y}px`;
  drawConnections();
}

function stopDragBlock(event) {
  if (!activeDrag) return;
  activeDrag.element.releasePointerCapture(event.pointerId);
  activeDrag = null;
}

function renderPreviews() {
  document.querySelectorAll(".block-preview").forEach((preview) => {
    const type = preview.dataset.type;
    const definition = blockDefinitions[type];
    if (!definition) return;
    const values = {};
    definition.fields.forEach((field) => {
      values[field.name] = field.value;
    });
    const block = {
      id: `preview-${type}`,
      type,
      title: definition.title,
      theme: definition.theme,
      fields: definition.fields,
      values,
      summary: "",
      position: { x: 0, y: 0 },
    };
    const element = buildBlockElement(block, { draggable: false, showConnectors: false });
    element.classList.add("preview");
    element.style.left = "0px";
    element.style.top = "0px";
    element.querySelector("button").remove();
    preview.innerHTML = "";
    preview.appendChild(element);
  });
}

function loadExample(name) {
  const example = examples[name];
  if (!example) return;
  flow = [];
  connections = [];
  canvas.querySelectorAll(".flow-block").forEach((el) => el.remove());
  nextPosition = { x: 40, y: 60 };

  const created = example.blocks.map((blockData) => {
    const position = { x: nextPosition.x, y: nextPosition.y };
    createFlowBlock(blockData.type, position, blockData.values);
    return flow[flow.length - 1];
  });

  connections = example.connections
    .map((conn) => ({
      from: created[conn.from]?.id,
      to: created[conn.to]?.id,
    }))
    .filter((conn) => conn.from && conn.to);
  updateUI();
}

function layoutBlocks() {
  const blocks = Array.from(canvas.querySelectorAll(".flow-block"));
  let x = 40;
  let y = 60;
  blocks.forEach((block, index) => {
    const id = block.dataset.id;
    const flowBlock = flow.find((item) => String(item.id) === id);
    if (!flowBlock) return;
    flowBlock.position = { x, y };
    block.style.left = `${x}px`;
    block.style.top = `${y}px`;
    x += 240;
    if ((index + 1) % 3 === 0) {
      x = 40;
      y += 220;
    }
  });
  drawConnections();
}

function setSelectedBlock(blockId) {
  selectedBlockId = blockId;
  document.querySelectorAll(".flow-block").forEach((block) => {
    block.classList.toggle("selected", block.dataset.id === String(blockId));
  });
}

function removeBlock(blockId) {
  flow = flow.filter((item) => item.id !== blockId);
  connections = connections.filter((conn) => conn.from !== blockId && conn.to !== blockId);
  const element = canvas.querySelector(`[data-id="${blockId}"]`);
  if (element) {
    element.remove();
  }
  if (selectedBlockId === blockId) {
    selectedBlockId = null;
  }
  updateUI();
}

function handleCanvasClick(event) {
  if (!event.target.closest(".flow-block")) {
    selectedBlockId = null;
    document.querySelectorAll(".flow-block").forEach((block) => block.classList.remove("selected"));
  }
}

function handleKeyDown(event) {
  if (!selectedBlockId) return;
  if (event.key === "Delete") {
    event.preventDefault();
    removeBlock(selectedBlockId);
  }
}

let firebaseAuth = null;
let isRegisterMode = false;
const LAST_IP_KEY = "arduino_last_ip";

async function getCurrentIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

async function enforceIpBinding(user) {
  const ip = await getCurrentIp();
  if (!ip) return;
  const key = `${LAST_IP_KEY}:${user.uid}`;
  const stored = localStorage.getItem(key);
  if (stored && stored !== ip) {
    await firebaseAuth.signOut();
    showAuthMessage("Farklı IP algılandı, güvenlik için tekrar giriş yapın.", true);
    return;
  }
  localStorage.setItem(key, ip);
}

function formatAuthError(error) {
  if (!error || !error.code) return "Bilinmeyen bir doğrulama hatası.";

  if (error.code === "auth/configuration-not-found") {
    return "Firebase Auth yapılandırması eksik: Console > Authentication > Sign-in method bölümünden Email/Password ve Google sağlayıcılarını etkinleştirip domaini doğrulayın.";
  }

  if (error.code === "auth/unauthorized-domain") {
    return "Bu domain yetkili değil. Firebase Console > Authentication > Settings > Authorized domains listesine domaininizi ekleyin.";
  }

  return error.message || "Kimlik doğrulama hatası.";
}

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#fca5a5" : "#9aa4b2";
}

function setAuthMode(registerMode) {
  isRegisterMode = registerMode;
  tabLogin.classList.toggle("active", !registerMode);
  tabRegister.classList.toggle("active", registerMode);
  loginButton.classList.toggle("hidden", registerMode);
  registerButton.classList.toggle("hidden", !registerMode);
}

function handleLogin() {
  if (!firebaseAuth) {
    showAuthMessage("Firebase ayarları eksik. Aşağıdaki adımları tamamlayın.", true);
    return;
  }
  firebaseAuth
    .signInWithEmailAndPassword(authEmail.value.trim(), authPassword.value)
    .catch((error) => showAuthMessage(formatAuthError(error), true));
}

function handleRegister() {
  if (!firebaseAuth) {
    showAuthMessage("Firebase ayarları eksik. Aşağıdaki adımları tamamlayın.", true);
    return;
  }

  const triggerEmailVerification = (currentUser) => {
    if (!currentUser) {
      throw new Error("Doğrulama e-postası için aktif kullanıcı bulunamadı.");
    }
    return currentUser.sendEmailVerification();
  };

  firebaseAuth
    .createUserWithEmailAndPassword(authEmail.value.trim(), authPassword.value)
    .then(({ user }) => triggerEmailVerification(user || firebaseAuth.currentUser))
    .then(() => showAuthMessage("Doğrulama maili gönderildi. E-posta kutunuzu kontrol edin."))
    .catch((error) => showAuthMessage(formatAuthError(error), true));
}

function handleGoogleLogin() {
  if (!firebaseAuth) {
    showAuthMessage("Firebase ayarları eksik. Aşağıdaki adımları tamamlayın.", true);
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  firebaseAuth.signInWithPopup(provider).catch((error) => showAuthMessage(formatAuthError(error), true));
}

function initializeAuth() {
  const config = window.ARDUINO_AUTH || {};
  const isConfigured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => Boolean(config[key]));

  if (!window.firebase || !isConfigured) {
    showAuthMessage("Firebase yapılandırmasını index.html içindeki ARDUINO_AUTH alanına girin.", true);
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  firebaseAuth = firebase.auth();
  firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
      if (!user.emailVerified && user.providerData.some((p) => p.providerId === "password")) {
        showAuthMessage("E-posta doğrulaması gerekli. Lütfen kutunuzu kontrol edin.", true);
        await firebaseAuth.signOut();
        return;
      }
      await enforceIpBinding(user);
      if (!firebaseAuth.currentUser) return;
      sessionUser.textContent = `Oturum: ${user.email || "Google Kullanıcısı"}`;
      loginOverlay.classList.add("hidden");
      appRoot.classList.add("ready");
    } else {
      sessionUser.textContent = "Oturum: -";
      loginOverlay.classList.remove("hidden");
      appRoot.classList.remove("ready");
    }
  });
}

function toggleExamplesPanel() {
  if (!storedExamplesWidth) {
    storedExamplesWidth = getComputedStyle(document.documentElement).getPropertyValue("--examples-width").trim();
  }
  const collapsed = examplesPanel.classList.toggle("collapsed");
  if (collapsed) {
    document.documentElement.style.setProperty("--examples-width", "56px");
  } else {
    document.documentElement.style.setProperty("--examples-width", storedExamplesWidth || "240px");
  }
}

function getCssNumber(variable) {
  return Number(getComputedStyle(document.documentElement).getPropertyValue(variable).replace("px", ""));
}

function handleResizerPointerDown(event) {
  const type = event.currentTarget.dataset.resize;
  const startX = event.clientX;
  activeResizer = {
    type,
    startX,
    startExamples: getCssNumber("--examples-width"),
    startSidebar: getCssNumber("--sidebar-width"),
    startPanel: getCssNumber("--panel-width"),
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleResizerPointerMove(event) {
  if (!activeResizer) return;
  const delta = event.clientX - activeResizer.startX;
  if (activeResizer.type === "examples") {
    const width = Math.min(320, Math.max(180, activeResizer.startExamples + delta));
    document.documentElement.style.setProperty("--examples-width", `${width}px`);
    storedExamplesWidth = `${width}px`;
  }
  if (activeResizer.type === "sidebar") {
    const width = Math.min(380, Math.max(220, activeResizer.startSidebar + delta));
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  }
  if (activeResizer.type === "panel") {
    const width = Math.min(460, Math.max(260, activeResizer.startPanel - delta));
    document.documentElement.style.setProperty("--panel-width", `${width}px`);
  }
}

function handleResizerPointerUp(event) {
  if (!activeResizer) return;
  event.currentTarget.releasePointerCapture(event.pointerId);
  activeResizer = null;
}

document.querySelectorAll(".block").forEach((block) => {
  block.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", block.dataset.type);
  });
});

canvas.addEventListener("dragover", (event) => {
  event.preventDefault();
  canvas.classList.add("drag-over");
});

canvas.addEventListener("dragleave", () => {
  canvas.classList.remove("drag-over");
});

canvas.addEventListener("drop", handleDrop);
canvas.addEventListener("pointermove", handleBlockMove);
canvas.addEventListener("pointerup", stopDragBlock);
canvas.addEventListener("click", handleCanvasClick);
window.addEventListener("resize", drawConnections);
document.addEventListener("keydown", handleKeyDown);

clearCanvas.addEventListener("click", () => {
  flow = [];
  connections = [];
  canvas.querySelectorAll(".flow-block").forEach((el) => el.remove());
  updateUI();
});

autoLayout.addEventListener("click", () => {
  layoutBlocks();
});

downloadButton.addEventListener("click", () => {
  const blob = new Blob([codeOutput.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "arduino_proje.ino";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(codeOutput.textContent);
    copyButton.textContent = "Kopyalandı";
    setTimeout(() => {
      copyButton.textContent = "Kopyala";
    }, 1500);
  } catch (error) {
    copyButton.textContent = "Kopyalanamadı";
  }
});

clearSerial.addEventListener("click", () => {
  serialBody.innerHTML = "<p>&gt; Seri monitör temizlendi.</p>";
});

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  document.querySelectorAll(".block").forEach((block) => {
    const label = block.textContent.toLowerCase();
    block.style.display = label.includes(query) ? "block" : "none";
  });
});

exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    loadExample(button.dataset.example);
  });
});

loginButton.addEventListener("click", handleLogin);
registerButton.addEventListener("click", handleRegister);
googleButton.addEventListener("click", handleGoogleLogin);
tabLogin.addEventListener("click", () => setAuthMode(false));
tabRegister.addEventListener("click", () => setAuthMode(true));
toggleExamples.addEventListener("click", toggleExamplesPanel);
logoutButton.addEventListener("click", () => firebaseAuth && firebaseAuth.signOut());

resizers.forEach((resizer) => {
  resizer.addEventListener("pointerdown", handleResizerPointerDown);
  resizer.addEventListener("pointermove", handleResizerPointerMove);
  resizer.addEventListener("pointerup", handleResizerPointerUp);
});

setAuthMode(false);
initializeAuth();
renderPreviews();
updateUI();
