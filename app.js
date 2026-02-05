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

let flow = [];
let connections = [];
let pendingConnector = null;

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

function buildBlockElement(block) {
  const element = document.createElement("article");
  element.className = `flow-block ${block.theme}`;
  element.dataset.id = block.id;

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

  title.querySelector("button").addEventListener("click", () => {
    flow = flow.filter((item) => item.id !== block.id);
    connections = connections.filter((conn) => conn.from !== block.id && conn.to !== block.id);
    element.remove();
    updateUI();
  });

  element.appendChild(title);
  element.appendChild(body);
  element.appendChild(inputConnector);
  element.appendChild(outputConnector);

  return element;
}

function buildSummary(block) {
  const values = Object.values(block.values).join(", ");
  return values.length > 0 ? values : "";
}

function createFlowBlock(type) {
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
    values,
    summary: "",
  };

  block.summary = buildSummary(block);
  flow.push(block);

  const element = buildBlockElement(block);
  canvas.appendChild(element);
  updateUI();
}

function handleDrop(event) {
  event.preventDefault();
  canvas.classList.remove("drag-over");
  const type = event.dataTransfer.getData("text/plain");
  if (type) {
    createFlowBlock(type);
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
    const curve = `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`;
    path.setAttribute("d", curve);
    path.setAttribute("class", "connection-line");
    connectionsSvg.appendChild(path);
  });
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
window.addEventListener("resize", drawConnections);

clearCanvas.addEventListener("click", () => {
  flow = [];
  connections = [];
  canvas.querySelectorAll(".flow-block").forEach((el) => el.remove());
  updateUI();
});

autoLayout.addEventListener("click", () => {
  const blocks = Array.from(canvas.querySelectorAll(".flow-block"));
  blocks.forEach((block, index) => {
    block.style.order = index;
  });
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

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  document.querySelectorAll(".block").forEach((block) => {
    const label = block.textContent.toLowerCase();
    block.style.display = label.includes(query) ? "block" : "none";
  });
});

updateUI();
