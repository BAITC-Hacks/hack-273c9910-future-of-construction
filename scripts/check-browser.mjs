import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Run after npm run build, using an installed Chromium browser and Node's native
// WebSocket. The check never uses a personal browser profile or the real user DB.
async function findBrowser() {
  const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = [process.env.BROWSER_EXECUTABLE];
  for (const root of roots) {
    candidates.push(path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"));
    candidates.push(path.join(root, "Google", "Chrome", "Application", "chrome.exe"));
    const core = path.join(root, "Microsoft", "EdgeCore");
    for (const entry of await readdir(core, { withFileTypes: true }).catch(() => [])) {
      if (entry.isDirectory()) candidates.push(path.join(core, entry.name, "msedge.exe"));
    }
  }
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  assert.ok(found, "No installed Chromium browser found. Set BROWSER_EXECUTABLE to its executable.");
  return found;
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = [];
    socket.addEventListener("message", (message) => {
      const data = JSON.parse(message.data);
      if (data.id) {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        clearTimeout(pending.timer);
        if (data.error) pending.reject(new Error(JSON.stringify(data.error)));
        else pending.resolve(data.result);
      } else {
        for (const listener of this.listeners) listener(data);
      }
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Browser debugger disconnected."));
      }
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20_000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result.value;
  }

  async until(expression, label, timeout = 25_000) {
    const end = Date.now() + timeout;
    let lastError;
    while (Date.now() < end) {
      try {
        const value = await this.evaluate(`Boolean(${expression})`);
        if (value) return value;
      } catch (error) { lastError = error; }
      await delay(100);
    }
    throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
  }

  async click(expression) {
    await this.evaluate(`(() => {
      const element = (${expression});
      if (!element || element.disabled || element.closest('fieldset:disabled')) throw new Error('Button is missing or disabled');
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
      element.click();
    })()`);
    await delay(100);
  }

  async fill(selector, value) {
    await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Input is missing');
      element.focus(); element.select();
    })()`);
    await this.send("Input.insertText", { text: value });
  }
}

const browserExecutable = await findBrowser();
const directory = await mkdtemp(path.join(tmpdir(), "akim-browser-check-"));
const artifacts = await mkdtemp(path.join(tmpdir(), "akim-browser-artifacts-"));
let server;
let browser;
let cdp;
let serverOutput = "";
let browserOutput = "";
const consoleErrors = [];
const apiResponses = [];
const screenshots = [];
const checks = [];
const button = (text, root = "document") => `[...(${root}).querySelectorAll('button')].find(element => element.textContent.trim() === ${JSON.stringify(text)})`;
const article = (name) => `[...document.querySelectorAll('article')].find(element => element.querySelector('h3')?.textContent.startsWith(${JSON.stringify(name)}))`;

async function screenshot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const target = path.join(artifacts, `${name}.png`);
  await writeFile(target, Buffer.from(data, "base64"));
  screenshots.push(target);
}

async function selectMeasure(name, district) {
  if (district) await cdp.click(button(district, article(name)));
  await cdp.click(button("Добавить в план", article(name)));
  await cdp.until(`${button("Отменить", article(name))} !== undefined`, `${name} selected`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  for (let index = 0; index < 50 && child.exitCode === null; index++) await delay(100);
}

try {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "0"], {
    env: { ...process.env, AUTH_DATABASE_PATH: path.join(directory, "auth.sqlite"), OPENAI_API_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });
  server.on("error", (error) => { serverOutput += error.message; });
  let base;
  for (let attempt = 0; attempt < 150; attempt++) {
    base = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (base && serverOutput.includes("Ready")) break;
    if (server.exitCode !== null) throw new Error(serverOutput);
    await delay(200);
  }
  assert.ok(base && serverOutput.includes("Ready"), `Server did not start: ${serverOutput}`);

  const profile = path.join(directory, "browser-profile");
  browser = spawn(browserExecutable, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-component-update", "--disable-sync",
    "--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication",
    "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  browser.stdout.on("data", (chunk) => { browserOutput += chunk; });
  browser.stderr.on("data", (chunk) => { browserOutput += chunk; });
  browser.on("error", (error) => { browserOutput += error.message; });
  let debugPort;
  for (let attempt = 0; attempt < 150; attempt++) {
    const active = await readFile(path.join(profile, "DevToolsActivePort"), "utf8").catch(() => "");
    debugPort = Number(active.split("\n")[0]);
    if (debugPort) break;
    if (browser.exitCode !== null) throw new Error(browserOutput);
    await delay(200);
  }
  assert.ok(debugPort, `Browser debugger did not start: ${browserOutput}`);
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const target = targets.find((item) => item.type === "page");
  assert.ok(target?.webSocketDebuggerUrl, "Browser did not create a page target.");
  cdp = await Cdp.connect(target.webSocketDebuggerUrl);
  cdp.listeners.push(({ method, params }) => {
    if (method === "Runtime.exceptionThrown") consoleErrors.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
    if (method === "Runtime.consoleAPICalled" && params.type === "error") consoleErrors.push(params.args.map((arg) => arg.value ?? arg.description).join(" "));
    if (method === "Log.entryAdded" && params.entry.level === "error") consoleErrors.push(`${params.entry.text}${params.entry.url ? ` (${params.entry.url})` : ""}`);
    if (method === "Network.responseReceived" && params.response.url.startsWith(`${base}/api/`)) {
      apiResponses.push({ url: new URL(params.response.url).pathname, status: params.response.status });
    }
  });
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  async function navigate(route, ready) {
    await cdp.send("Page.navigate", { url: `${base}${route}` });
    await cdp.until(`location.pathname === ${JSON.stringify(route)} && (${ready})`, `${route} ready`);
    await delay(400);
  }

  await navigate("/register", "document.querySelector('#confirmPassword')");
  await cdp.fill("#displayName", "Браузерная проверка");
  await cdp.fill("#login", "browser_check_user");
  await cdp.fill("#password", "private browser check password");
  await cdp.fill("#confirmPassword", "private browser check password");
  await cdp.click(button("Создать аккаунт"));
  await cdp.until("location.pathname === '/profile' && document.querySelector('#profile-name')", "registered profile");
  await cdp.fill("#profile-name", "Проверенный профиль");
  await cdp.fill("#profile-bio", "Мой город — Астана");
  await cdp.click(button("Сохранить изменения"));
  await cdp.until("document.querySelector('[role=status]')?.textContent.includes('Профиль сохранён')", "profile saved");
  await cdp.click(button("Выйти из аккаунта"));
  await cdp.until("location.pathname === '/'", "logout");
  await navigate("/login", "document.querySelector('#password')");
  await cdp.fill("#login", "browser_check_user");
  await cdp.fill("#password", "private browser check password");
  await cdp.click(button("Войти"));
  await cdp.until("location.pathname === '/profile' && document.querySelector('#profile-name')", "login");
  assert.equal(await cdp.evaluate("document.querySelector('#profile-name').value"), "Проверенный профиль");
  assert.equal(await cdp.evaluate("document.querySelector('#profile-bio').value"), "Мой город — Астана");
  checks.push("Browser registration, profile edit, logout and login persisted the profile.");
  console.log("Browser: account flow passed.");

  const eventButton = button("Режим городских событий");
  await navigate("/simulator", `${eventButton} && !(${eventButton}).disabled`);
  assert.equal(await cdp.evaluate("document.querySelectorAll('input[type=number]').length"), 0);
  assert.match(await cdp.evaluate("document.body.innerText"), /100 условных единиц/);
  await screenshot("desktop-simulator");
  await cdp.click(button("Консультант"));
  await cdp.until("document.querySelector('#city-consultant input') === document.activeElement", "consultant input focused");
  await cdp.click(button("Сколько осталось бюджета?"));
  await cdp.until("document.querySelector('#city-consultant')?.innerText.includes('100 из 100')", "consultant reads empty budget");
  assert.match(await cdp.evaluate("document.querySelector('#city-consultant').innerText"), /Справочный режим · без ИИ/);
  await screenshot("desktop-consultant");
  await cdp.fill('#city-consultant input', "Покажи экологию");
  await cdp.click("document.querySelector('#city-consultant button[aria-label=\"Отправить вопрос\"]')");
  await cdp.until(`${button("Экология", "document.querySelector('#city-consultant')")} !== undefined`, "consultant ecology navigation");
  await cdp.click(button("Экология", "document.querySelector('#city-consultant')"));
  await cdp.until("!document.querySelector('#city-consultant') && document.querySelectorAll('#measures article').length === 3", "consultant filters ecology catalog");
  assert.equal(await cdp.evaluate("document.activeElement.id"), "measures");
  await cdp.click("document.querySelector('.simulator-filter-row button')");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.click(button("Консультант"));
  assert.ok(await cdp.evaluate("(() => { const rect=document.querySelector('#city-consultant').getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight; })()"), "Mobile consultant must fit the viewport.");
  await screenshot("mobile-consultant");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.until("!document.querySelector('#city-consultant')", "Escape closes consultant");
  assert.equal(await cdp.evaluate("document.activeElement.textContent"), "Консультант");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  checks.push("Consultant: budget-aware local replies, ecology navigation, keyboard focus/Escape, desktop and mobile layout.");
  console.log("Browser: consultant passed.");
  await selectMeasure("Школа + детсад", "Нура");
  await cdp.click(button("Консультант"));
  await cdp.click(button("Сколько осталось бюджета?"));
  await cdp.until("document.querySelector('#city-consultant')?.innerText.includes('76 из 100')", "consultant receives changed plan");
  await cdp.click("document.querySelector('#city-consultant button[aria-label=\"Закрыть консультанта\"]')");
  await selectMeasure("Центр семейного здоровья", "Нура");
  await selectMeasure("Освещение и камеры", "Нура");
  await selectMeasure("Единая цифровая платформа");
  await selectMeasure("Перевод частного сектора", "Сарыарка");
  await cdp.click(button("Завершить управление"));
  await cdp.until("document.querySelector('#result')?.innerText.match(/56[,.]54/)", "control score 56.54");
  await cdp.until(`${eventButton} && !(${eventButton}).disabled`, "analysis and optimizer finished", 40_000);
  const resultText = await cdp.evaluate("document.querySelector('#result').innerText");
  assert.match(resultText, /5 \/ 100/);
  assert.match(resultText, /Резервный разбор по правилам · без LLM/);
  assert.match(resultText, /сервер \/api\/simulate/);
  assert.match(resultText, /Сравнение с оптимизатором/);
  await cdp.evaluate("document.querySelector('#result').scrollIntoView({behavior:'instant',block:'start'})");
  await screenshot("desktop-control-result");
  checks.push("Control plan: fixed 100, five UI decisions, score 56.54, balance 5, server simulation, local analysis and server optimizer.");
  console.log("Browser: control scenario passed.");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.evaluate("document.querySelector('#result').scrollIntoView({behavior:'instant',block:'start'})");
  await delay(150);
  await screenshot("mobile-control-result");
  assert.ok(await cdp.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), "Mobile page has horizontal overflow.");

  await cdp.click(eventButton);
  await cdp.until("!document.querySelector('#result') && document.body.innerText.includes('Новый лимит: 92')", "event invalidated result and reduced budget");
  assert.ok(await cdp.evaluate(`(${button("Превышен бюджет")})?.disabled`));

  await navigate("/results", "document.body.innerText.includes('56.54')");
  await cdp.click(button("Запросить AI-анализ"));
  await cdp.until("document.body.innerText.includes('Встроенный аналитик: объяснение сформировано')", "saved result analysis kept its original event context");
  assert.match(await cdp.evaluate("document.body.innerText"), /56[,.]54/);
  assert.equal(apiResponses.filter((response) => response.url === "/api/analyze").at(-1)?.status, 200);
  checks.push("Saved /results retained the original 56.54 scenario and returned analysis 200 after changing the current event.");
  await navigate("/simulator", `${eventButton} && !(${eventButton}).disabled`);
  await cdp.until("document.body.innerText.includes('Новый лимит: 92')", "current event restored after inspecting saved result");

  await cdp.click(eventButton);
  await cdp.click(button("Начать заново"));
  await cdp.until("document.querySelector('#receipt')?.innerText.includes('Пока пусто')", "reset cleared decisions");
  await cdp.click(eventButton);
  await cdp.until("document.querySelector('header select')", "event choice shown");
  await cdp.evaluate("(() => { const select=document.querySelector('header select'); select.value='spring_flood'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await selectMeasure("Школа + детсад", "Нура");
  await selectMeasure("Центр семейного здоровья", "Нура");
  await selectMeasure("Освещение и камеры", "Нура");
  await cdp.until("document.body.innerText.includes('Новый лимит: 90')", "spring flood budget");
  await selectMeasure("Единая цифровая платформа");
  assert.ok(await cdp.evaluate(`(${button("Добавить в план", article("Перевод частного сектора"))})?.disabled`), "Measure exceeding the event budget should be unavailable.");
  await selectMeasure("Городская программа озеленения");
  await cdp.click(button("Завершить управление"));
  await cdp.until("document.querySelector('#result')?.innerText.includes('0 / 90')", "event result with zero balance");
  await cdp.until(`${eventButton} && !(${eventButton}).disabled`, "event optimizer finished", 40_000);
  await cdp.evaluate("document.querySelector('#result').scrollIntoView({behavior:'instant',block:'start'})");
  await screenshot("mobile-event-result");
  assert.ok(await cdp.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), "Mobile event page has horizontal overflow.");
  checks.push("Switching event mode removed the old result; event budgets 92/90 were enforced; the 90-unit plan completed with balance 0.");
  console.log("Browser: event and mobile checks passed.");

  assert.deepEqual(consoleErrors, [], "Unexpected browser console errors.");
  assert.ok(apiResponses.some((response) => response.url === "/api/simulate" && response.status === 200));
  assert.ok(apiResponses.some((response) => response.url === "/api/analyze" && response.status === 200));
  assert.ok(apiResponses.some((response) => response.url === "/api/optimize" && response.status === 200));
  const report = { browserExecutable, checks, consoleErrors, apiResponses, screenshots };
  await writeFile(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (cdp) {
    await screenshot("failure").catch(() => {});
    await writeFile(path.join(artifacts, "failure-page.txt"), await cdp.evaluate("document.body?.innerText ?? ''").catch(() => "")).catch(() => {});
  }
  console.error(JSON.stringify({ artifacts, consoleErrors, apiResponses, serverOutput, browserOutput: browserOutput.slice(-4000) }, null, 2));
  throw error;
} finally {
  if (cdp) {
    await cdp.send("Browser.close").catch(() => {});
    cdp.socket.close();
  }
  await stop(browser);
  await stop(server);
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith("akim-browser-check-"));
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
