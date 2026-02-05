const canvas = document.getElementById("canvas");
const codeOutput = document.getElementById("code-output");
const flowSummary = document.getElementById("flow-summary");
const blockCount = document.getElementById("block-count");
const clearCanvas = document.getElementById("clear-canvas");
const autoLayout = document.getElementById("auto-layout");
const downloadButton = document.getElementById("download-ino");
const copyButton = document.getElementById("copy-code");
const searchInput = document.getElementById("block-search");

const blockLabels = {
  setup: "Setup",
  loop: "Loop",
  delay: "Bekle (Delay)",
  serial: "Seri Yazdır",
  if: "Eğer / Değilse",
  for: "For Döngüsü",
  while: "While Döngüsü",
  "digital-write": "Dijital Yaz",
  "digital-read": "Dijital Oku",
  "analog-read": "Analog Oku",
  dht: "DHT11 Sensör",
  ultrasonic: "Ultrasonik Mesafe",
  servo: "Servo Motor",
};

const defaultDetails = {
  setup: "pinMode ayarla",
  loop: "sürekli döngü",
  delay: "1000 ms",
  serial: "Serial.println(\"Merhaba\")",
  if: "koşul kontrol",
  for: "10 kez yinele",
  while: "koşul doğruyken",
  "digital-write": "Pin 13 -> HIGH",
  "digital-read": "Pin 2 oku",
  "analog-read": "A0 oku",
  dht: "Sıcaklık & nem",
  ultrasonic: "Mesafe oku",
  servo: "Pin 9 -> 90°",
};

let flow = [];

function updateUI() {
  blockCount.textContent = flow.length;
  flowSummary.innerHTML = "";

  if (flow.length === 0) {
    flowSummary.innerHTML = "<li>Henüz blok yok</li>";
  } else {
    flow.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${blockLabels[item.type]} — ${item.detail}`;
      flowSummary.appendChild(li);
    });
  }

  codeOutput.textContent = generateCode(flow);
}

function generateCode(items) {
  if (items.length === 0) {
    return "// Blok ekleyerek Arduino kodunu burada görebilirsiniz.\n";
  }

  const setupBlocks = items.filter((item) => item.type === "setup");
  const loopBlocks = items.filter((item) => item.type !== "setup");

  const setupLines = setupBlocks.length
    ? setupBlocks.map((item) => `  // ${item.detail}`)
    : ["  // Buraya başlangıç ayarlarını ekleyin"];

  const loopLines = loopBlocks.length
    ? loopBlocks.flatMap((item) => blockToCode(item))
    : ["  // Döngü içi komutlar"];

  return [
    "#include <Arduino.h>",
    "",
    "void setup() {",
    ...setupLines,
    "}",
    "",
    "void loop() {",
    ...loopLines,
    "}",
    "",
  ].join("\n");
}

function blockToCode(item) {
  switch (item.type) {
    case "delay":
      return [`  delay(${item.value || 1000}); // ${item.detail}`];
    case "serial":
      return ["  Serial.begin(9600);", `  Serial.println(\"${item.detail}\");`];
    case "digital-write":
      return ["  pinMode(13, OUTPUT);", "  digitalWrite(13, HIGH);"];
    case "digital-read":
      return ["  pinMode(2, INPUT);", "  int deger = digitalRead(2);"];
    case "analog-read":
      return ["  int analog = analogRead(A0);"];
    case "if":
      return ["  if (true) {", "    // koşul", "  } else {", "    // alternatif", "  }"];
    case "for":
      return ["  for (int i = 0; i < 10; i++) {", "    // tekrar", "  }"];
    case "while":
      return ["  while (true) {", "    // koşul doğruyken", "  }"];
    case "dht":
      return ["  // DHT11 sensör okuma", "  float sicaklik = 0;", "  float nem = 0;"];
    case "ultrasonic":
      return ["  // Ultrasonik mesafe ölçümü", "  long mesafe = 0;"];
    case "servo":
      return ["  // Servo motor kontrol", "  int aci = 90;"];
    case "loop":
      return ["  // Sürekli döngü komutları"];
    default:
      return [`  // ${item.detail}`];
  }
}

function createFlowBlock(type) {
  const detail = defaultDetails[type] || "Özel ayar";
  const block = {
    id: Date.now() + Math.random(),
    type,
    detail,
  };
  flow.push(block);

  const element = document.createElement("article");
  element.className = "flow-block";
  element.dataset.id = block.id;
  element.innerHTML = `
    <header>
      <span>${blockLabels[type]}</span>
      <button aria-label="Sil">✕</button>
    </header>
    <div class="detail">${detail}</div>
  `;

  element.querySelector("button").addEventListener("click", () => {
    flow = flow.filter((item) => item.id !== block.id);
    element.remove();
    updateUI();
  });

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

clearCanvas.addEventListener("click", () => {
  flow = [];
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
