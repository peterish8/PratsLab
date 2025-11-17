let editor;
let isResizing = false;
let currentTheme = localStorage.getItem("jsPlaygroundTheme") || "vscode";
let isFullscreen = false;
let terminals = [];
let activeTerminal = 0;

let files = {};
let folders = {};
let expandedFolders = new Set();
let contextTarget = null;
let contextType = null;

// Load files from localStorage or use defaults
function loadFilesFromStorage() {
  const savedFiles = localStorage.getItem("jsPlaygroundFiles");
  const savedFolders = localStorage.getItem("jsPlaygroundFolders");

  if (savedFiles) {
    files = JSON.parse(savedFiles);
  } else {
    files = {
      "main.js":
        '// 🎉 Hello Friend! Welcome to the JS Playground! Made by ur frnd prats 🚀\nconsole.log("Hello, World! 👋");',
      "hello.py":
        '# 🎉 Hello Friend! Welcome to the JS Playground! Made by ur frnd prats 🚀\nprint("Hello, Python World! 👋")',
    };
    saveFilesToStorage();
  }

  if (savedFolders) {
    folders = JSON.parse(savedFolders);
  }
}

// Save files to localStorage
function saveFilesToStorage() {
  localStorage.setItem("jsPlaygroundFiles", JSON.stringify(files));
  localStorage.setItem("jsPlaygroundCurrentFile", currentFile);
}

// Load current file from localStorage or use default
function loadCurrentFile() {
  const savedCurrentFile = localStorage.getItem("jsPlaygroundCurrentFile");
  if (savedCurrentFile && files[savedCurrentFile]) {
    return savedCurrentFile;
  }
  return "main.js";
}

let currentFile = "main.js";
let sidebarVisible = true;
let bottomBarVisible = true;
let isResizingSidebar = false;

// Block browser dialogs in parent window
const originalPrompt = window.prompt;
const originalAlert = window.alert;
const originalConfirm = window.confirm;

window.prompt = function (message, defaultValue) {
  console.log("PROMPT: " + message + " (Using default: 5)");
  return defaultValue || "5";
};
window.alert = function () {};
window.confirm = function () {
  return false;
};

// Define custom Monaco themes
function defineCustomThemes() {
  monaco.editor.defineTheme("black-theme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "666666" },
      { token: "keyword", foreground: "ffffff", fontStyle: "bold" },
      { token: "string", foreground: "cccccc" },
      { token: "number", foreground: "ffffff" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#ffffff",
      "editor.lineHighlightBackground": "#0a0a0a",
      "editorCursor.foreground": "#ffffff",
      "editor.selectionBackground": "#333333",
    },
  });

  monaco.editor.defineTheme("matrix-theme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "008800" },
      { token: "keyword", foreground: "00ff00", fontStyle: "bold" },
      { token: "string", foreground: "00cc00" },
      { token: "number", foreground: "00ff00" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#00ff00",
      "editor.lineHighlightBackground": "#001100",
      "editorCursor.foreground": "#00ff00",
      "editor.selectionBackground": "#002200",
    },
  });

  monaco.editor.defineTheme("tokyo-theme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "565f89" },
      { token: "keyword", foreground: "7aa2f7", fontStyle: "bold" },
      { token: "string", foreground: "9ece6a" },
      { token: "number", foreground: "ff9e64" },
    ],
    colors: {
      "editor.background": "#0f0f14",
      "editor.foreground": "#c0caf5",
      "editor.lineHighlightBackground": "#16161e",
      "editorCursor.foreground": "#c0caf5",
      "editor.selectionBackground": "#24283b",
    },
  });

  monaco.editor.defineTheme("solarized-theme", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "93a1a1" },
      { token: "keyword", foreground: "268bd2", fontStyle: "bold" },
      { token: "string", foreground: "2aa198" },
      { token: "number", foreground: "d33682" },
    ],
    colors: {
      "editor.background": "#fdf6e3",
      "editor.foreground": "#586e75",
      "editor.lineHighlightBackground": "#eee8d5",
      "editorCursor.foreground": "#586e75",
      "editor.selectionBackground": "#d3af86",
    },
  });

  monaco.editor.defineTheme("monokai-dimmed-theme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5a5a50" },
      { token: "keyword", foreground: "8ac6f2", fontStyle: "bold" },
      { token: "string", foreground: "98c379" },
      { token: "number", foreground: "d19a66" },
    ],
    colors: {
      "editor.background": "#1e1f1c",
      "editor.foreground": "#c5c8c6",
      "editor.lineHighlightBackground": "#2f2f2a",
      "editorCursor.foreground": "#c5c8c6",
      "editor.selectionBackground": "#3a3a35",
    },
  });

  monaco.editor.defineTheme("dark-modern-theme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955" },
      { token: "keyword", foreground: "569CD6" },
      { token: "string", foreground: "CE9178" },
      { token: "number", foreground: "B5CEA8" },
      { token: "constant", foreground: "B5CEA8" },
      { token: "function", foreground: "569CD6" },
      { token: "entity.name.function", foreground: "569CD6" },
      { token: "support.function", foreground: "569CD6" },
    ],
    colors: {
      "editor.background": "#1E1E1E",
      "editor.foreground": "#D4D4D4",
      "editor.lineHighlightBackground": "#333333",
      "editorCursor.foreground": "#AEAFAD",
      "editor.selectionBackground": "#264F78",
      "editor.lineNumber.foreground": "#858585",
      "editor.lineNumber.activeForeground": "#C6C6C6",
    },
  });
}

// Theme mappings for Monaco Editor
const monacoThemes = {
  vscode: "vs-dark",
  black: "black-theme",
  matrix: "matrix-theme",
  tokyo: "tokyo-theme",
  solarized: "solarized-theme",
  "monokai-dimmed": "monokai-dimmed-theme",
  "dark-modern": "dark-modern-theme",
};

// Initialize Monaco Editor
require.config({
  paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" },
});
require(["vs/editor/editor.main"], function () {
  loadFilesFromStorage();
  currentFile = loadCurrentFile();
  defineCustomThemes();

  const extension = currentFile.split(".").pop().toLowerCase();
  const initialLanguage = extension === "py" ? "python" : "javascript";

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: files[currentFile] || "",
    language: initialLanguage,
    theme: monacoThemes[currentTheme],
    fontSize: 14,
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
    fontLigatures: false,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: "on",
    lineNumbers: "on",
    folding: true,
    bracketMatching: "always",
    bracketPairColorization: { enabled: false },
    guides: { bracketPairs: false },
    overviewRulerLanes: 0,
    renderLineHighlight: "none",
    occurrencesHighlight: false,
    selectionHighlight: false,
    hideCursorInOverviewRuler: true,
    find: { addExtraSpaceOnTop: false, autoFindInSelection: false },
  });

  setTimeout(() => {
    if (editor) {
      editor.layout();
      editor.focus();
    }
  }, 100);

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, toggleSidebar);

  editor.onDidChangeModelContent(() => {
    files[currentFile] = editor.getValue();
    saveFilesToStorage();
  });

  renderFileTree();
  addTerminal();

  setTimeout(() => {
    feather.replace();
  }, 100);
});

// Python execution using CodeX API

// Python input handling

async function executePythonCode(code) {
  const terminalId = activeTerminal;
  hasOutput = false;
  executionStartTime = Date.now();

  // Replace input() calls with values typed in the terminal
  const pythonInputRegex = /input\s*\(\s*(["'`])([^"'`]*)\1\s*\)/g;
  code = await replaceInputCallsInCode(
    code,
    pythonInputRegex,
    terminalId,
    "Enter value:",
    escapeForPythonString
  );

  // Process code: if last line is an expression, wrap it in print()
  const lines = code.split("\n");
  let lastNonEmptyLine = "";
  let lastLineIndex = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith("#")) {
      lastNonEmptyLine = trimmed;
      lastLineIndex = i;
      break;
    }
  }

  let processedCode = code;

  // If last line is an expression that should be printed
  if (
    lastNonEmptyLine &&
    !lastNonEmptyLine.startsWith("print(") &&
    !lastNonEmptyLine.includes("=") &&
    !lastNonEmptyLine.startsWith("def ") &&
    !lastNonEmptyLine.startsWith("class ") &&
    !lastNonEmptyLine.startsWith("if ") &&
    !lastNonEmptyLine.startsWith("for ") &&
    !lastNonEmptyLine.startsWith("while ") &&
    !lastNonEmptyLine.startsWith("try:") &&
    !lastNonEmptyLine.startsWith("except") &&
    !lastNonEmptyLine.startsWith("with ") &&
    !lastNonEmptyLine.startsWith("import ") &&
    !lastNonEmptyLine.startsWith("from ")
  ) {
    // It's likely an expression - wrap it in print
    const codeLines = code.split("\n");
    codeLines[lastLineIndex] = `print(${lastNonEmptyLine})`;
    processedCode = codeLines.join("\n");
  }

  // Try multiple Python execution APIs as fallbacks
  const apis = [
    {
      name: "CodeX API",
      url: "https://api.codex.jaagrav.in",
      body: {
        code: processedCode,
        language: "python",
        input: "",
      },
    },
    {
      name: "Piston API",
      url: "https://emkc.org/api/v2/piston/execute",
      body: {
        language: "python",
        version: "3.10.0",
        files: [
          {
            content: processedCode,
          },
        ],
      },
    },
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(api.body),
      });

      if (!response.ok) {
        // Check for 429 immediately - silently ignore
        if (response.status === 429) {
          return; // Silently ignore rate limit errors
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle CodeX API response
      if (api.name === "CodeX API") {
        if (data.error) {
          let errorMsg = data.error.trim();
          const errorLines = errorMsg.split("\n");
          const lastErrorLine = errorLines[errorLines.length - 1] || errorMsg;
          addLogEntry(lastErrorLine, "error", terminalId);
          return;
        } else if (data.output) {
          const output = data.output.trim();
          if (output) {
            addLogEntry(output, "info", terminalId);
          }
          return;
        }
      }

      // Handle Piston API response
      if (api.name === "Piston API") {
        if (data.run && data.run.stderr) {
          const errorMsg = data.run.stderr.trim();
          const errorLines = errorMsg.split("\n");
          const lastErrorLine = errorLines[errorLines.length - 1] || errorMsg;
          addLogEntry(lastErrorLine, "error", terminalId);
          return;
        } else if (data.run && data.run.stdout) {
          const output = data.run.stdout.trim();
          if (output) {
            addLogEntry(output, "info", terminalId);
          }
          return;
        }
      }

      // If we get here, the API responded but didn't have expected format
      lastError = new Error(`Unexpected response format from ${api.name}`);
    } catch (error) {
      const errorMsg = error.message || error.toString();

      // Check for 429 error immediately and handle it
      if (errorMsg.includes("429") || errorMsg.includes("Too Many Requests")) {
        return; // Silently ignore rate limit errors - don't try other APIs
      }

      lastError = error;
      // Try next API
      continue;
    }
  }

  // If all APIs failed, show the last error (but ignore 429 rate limit errors)
  if (lastError) {
    const errorMsg = lastError.message || lastError.toString();

    // Ignore 429 (Too Many Requests) errors - don't show them to user
    if (errorMsg.includes("429") || errorMsg.includes("Too Many Requests")) {
      return; // Silently ignore rate limit errors
    }

    const errorLines = errorMsg.split("\n");
    const lastErrorLine = errorLines[errorLines.length - 1] || errorMsg;
    addLogEntry(
      `Execution failed: ${lastErrorLine.trim()}. Please check your internet connection.`,
      "error",
      terminalId
    );
  }
}

function setRunButtonLoading(isLoading) {
  const runBtn = document.querySelector(".run-btn");
  if (!runBtn) return;

  if (isLoading) {
    if (!runBtn.dataset.defaultContent) {
      runBtn.dataset.defaultContent = runBtn.innerHTML;
    }
    runBtn.classList.add("loading");
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="spinner"></span> Running...`;
  } else {
    runBtn.classList.remove("loading");
    runBtn.disabled = false;
    if (runBtn.dataset.defaultContent) {
      runBtn.innerHTML = runBtn.dataset.defaultContent;
      if (window.feather) {
        feather.replace();
      }
    }
  }
}

// Code execution
async function runCode() {
  let code = editor.getValue();
  const outputElement = document.getElementById(`output-${activeTerminal}`);
  const extension = currentFile.split(".").pop().toLowerCase();

  if (extension === "py") {
    setRunButtonLoading(true);
    try {
      await executePythonCode(code);
    } finally {
      setRunButtonLoading(false);
    }
  } else {
    setRunButtonLoading(true);
    try {
      const promptRegex = /prompt\s*\(\s*(["'`])([^"'`]*)\1\s*\)/g;
      const processedCode = await replaceInputCallsInCode(
        code,
        promptRegex,
        activeTerminal,
        "Enter value:",
        escapeForJavaScriptString
      );
      executeCode(processedCode);
    } finally {
      setRunButtonLoading(false);
    }
  }
}

function executeCode(code) {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  // Wait for iframe to load before accessing its document
  iframe.onload = function () {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Escape code properly to prevent template literal issues
    const escapedCode = code
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\${/g, "\\${");

    const script = iframeDoc.createElement("script");
    script.textContent = `
            console.log = function(...args) {
                window.parent.postMessage({
                    type: 'log',
                    level: 'info',
                    terminalId: ${activeTerminal},
                    message: args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ')
                }, '*');
            };

            console.error = function(...args) {
                window.parent.postMessage({
                    type: 'log',
                    level: 'error',
                    terminalId: ${activeTerminal},
                    message: args.map(arg => String(arg)).join(' ')
                }, '*');
            };
            window.onerror = function(message, source, lineno, colno, error) {
                window.parent.postMessage({
                    type: 'log',
                    level: 'error',
                    terminalId: ${activeTerminal},
                    message: 'Error: ' + (error ? error.message : message)
                }, '*');
                return true;
            };

            try {
                ${escapedCode}
                window.parent.postMessage({
                    type: 'execution-complete',
                    terminalId: ${activeTerminal}
                }, '*');
            } catch (error) {
                window.parent.postMessage({
                    type: 'log',
                    level: 'error',
                    terminalId: ${activeTerminal},
                    message: 'Error: ' + error.message
                }, '*');
            }
        `;

    iframeDoc.head.appendChild(script);

    // Clean up iframe after execution
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  // Initialize iframe with empty document
  iframe.src = "about:blank";
}

// Handle messages from iframe
window.addEventListener("message", function (event) {
  if (event.data.type === "log") {
    addLogEntry(event.data.message, event.data.level, event.data.terminalId);
  } else if (event.data.type === "execution-complete") {
    // Don't show "Code executed successfully" - just silent execution
    // Only show output if there was actual output from console.log, etc.
  } else if (event.data.type === "prompt") {
    // Handle prompt request from iframe
    showPromptDialog(
      event.data.message,
      event.data.defaultValue,
      event.data.promptId,
      event.data.terminalId
    );
  }
});

// Prompt dialog management
let promptCallbacks = {};

function showPromptDialog(message, defaultValue, promptId, terminalId) {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "prompt-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  // Create prompt dialog
  const dialog = document.createElement("div");
  dialog.className = "prompt-dialog";
  dialog.style.cssText = `
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border, #3e3e3e);
    border-radius: 8px;
    padding: 20px;
    min-width: 300px;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;

  const label = document.createElement("div");
  label.textContent = message;
  label.style.cssText = `
    color: var(--text-primary, #cccccc);
    margin-bottom: 12px;
    font-size: 14px;
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.value = defaultValue || "";
  input.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-secondary, #252526);
    border: 1px solid var(--border, #3e3e3e);
    border-radius: 4px;
    color: var(--text-primary, #cccccc);
    font-size: 14px;
    box-sizing: border-box;
    margin-bottom: 12px;
  `;

  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `;

  const okButton = document.createElement("button");
  okButton.textContent = "OK";
  okButton.style.cssText = `
    padding: 6px 16px;
    background: var(--accent, #007acc);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.style.cssText = `
    padding: 6px 16px;
    background: var(--bg-tertiary, #2d2d30);
    color: var(--text-primary, #cccccc);
    border: 1px solid var(--border, #3e3e3e);
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

  const sendResponse = (value) => {
    // Send response back to iframe
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      iframe.contentWindow.postMessage(
        {
          type: "prompt-response",
          promptId: promptId,
          value: value,
        },
        "*"
      );
    });
    document.body.removeChild(overlay);
  };

  okButton.onclick = () => sendResponse(input.value);
  cancelButton.onclick = () => sendResponse(null);

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      sendResponse(input.value);
    } else if (e.key === "Escape") {
      sendResponse(null);
    }
  };

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(okButton);

  dialog.appendChild(label);
  dialog.appendChild(input);
  dialog.appendChild(buttonContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus input
  setTimeout(() => input.focus(), 100);
}

function addLogEntry(message, level = "info", terminalId = activeTerminal) {
  const output = document.getElementById(`output-${terminalId}`);
  if (!output) return;

  // Add separator only if there's existing content and we're adding new content
  if (output.children.length > 0) {
    // Check if last child is already a separator
    const lastChild = output.lastElementChild;
    if (!lastChild || !lastChild.classList.contains("log-separator")) {
      const separator = document.createElement("div");
      separator.className = "log-separator";
      separator.style.cssText =
        "border-top: 1px solid var(--border); margin: 8px 0; opacity: 0.5;";
      output.appendChild(separator);
    }
  }

  const entry = document.createElement("div");
  entry.className = `log-entry log-${level}`;
  entry.textContent = message;
  output.appendChild(entry);

  output.scrollTop = output.scrollHeight;
}

// Terminal management
let terminalCounter = 0;

function addTerminal() {
  const terminalId = terminalCounter++;
  const terminal = {
    id: terminalId,
    name: `Terminal ${terminalId + 1}`,
    output: [],
  };

  terminals.push(terminal);

  const tab = document.createElement("button");
  tab.className = "terminal-tab";
  tab.dataset.terminalId = terminalId;
  tab.innerHTML = `
    <span>${terminal.name}</span>
    <span class="tab-close" onclick="closeTerminal(${terminalId}, event)">×</span>
  `;
  tab.onclick = (e) => {
    if (!e.target.classList.contains("tab-close")) {
      switchTerminal(terminalId);
    }
  };

  document
    .getElementById("terminalTabs")
    .insertBefore(tab, document.querySelector(".add-terminal"));

  const content = document.createElement("div");
  content.className = "terminal-content";
  content.id = `terminal-${terminalId}`;
  content.innerHTML = `
    <div class="output-header">
      <span><i data-feather="terminal"></i> ${terminal.name}</span>
      <div>
        <button class="clear-btn" onclick="clearTerminal(${terminalId})"><i data-feather="trash-2"></i> Clear</button>
      </div>
    </div>
    <div class="output-content" id="output-${terminalId}"></div>
  `;

  document.getElementById("terminalContainer").appendChild(content);
  switchTerminal(terminalId);

  setTimeout(() => feather.replace(), 10);
}

// Wait for user input from terminal input field
function waitForTerminalInput(terminalId, promptMessage) {
  return new Promise((resolve) => {
    const output = document.getElementById(`output-${terminalId}`);
    if (!output) {
      resolve("");
      return;
    }

    const row = document.createElement("div");
    row.className = "inline-input-row";

    const message = document.createElement("span");
    message.className = "inline-input-message";
    message.textContent = promptMessage + " ";

    const caret = document.createElement("span");
    caret.className = "inline-input-caret";
    caret.textContent = "> ";

    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.className = "inline-input-field";
    inputField.placeholder = "Enter value...";

    row.appendChild(message);
    row.appendChild(caret);
    row.appendChild(inputField);
    output.appendChild(row);
    output.scrollTop = output.scrollHeight;
    inputField.focus();

    const finish = (value) => {
      inputField.disabled = true;
      const valueSpan = document.createElement("span");
      valueSpan.className = "inline-input-value";
      valueSpan.textContent = value;
      row.replaceChild(valueSpan, inputField);
      resolve(value);
    };

    inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finish(inputField.value.trim());
      } else if (e.key === "Escape") {
        finish("");
      }
    });
  });
}

async function replaceInputCallsInCode(
  code,
  regex,
  terminalId,
  defaultPrompt,
  escapeFn
) {
  regex.lastIndex = 0;
  const matches = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      prompt: match[2] || defaultPrompt,
    });
  }

  if (matches.length === 0) return code;

  let result = "";
  let lastIndex = 0;

  for (const inputCall of matches) {
    result += code.slice(lastIndex, inputCall.start);
    const userValue = await waitForTerminalInput(
      terminalId,
      inputCall.prompt || defaultPrompt
    );
    result += escapeFn(userValue);
    lastIndex = inputCall.end;
  }

  result += code.slice(lastIndex);
  return result;
}

function escapeForPythonString(value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function escapeForJavaScriptString(value) {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
  return "`" + escaped + "`";
}

function switchTerminal(id) {
  document.querySelectorAll(".terminal-tab").forEach((tab) => {
    tab.classList.toggle("active", parseInt(tab.dataset.terminalId) === id);
  });

  document.querySelectorAll(".terminal-content").forEach((content) => {
    const contentId = parseInt(content.id.split("-")[1]);
    content.classList.toggle("active", contentId === id);
  });

  activeTerminal = id;

  // Ensure input handler is set up for the active terminal
  setupTerminalInputHandler(id);
}

function setupTerminalInputHandler(terminalId) {
  const inputField = document.getElementById(`input-${terminalId}`);
  if (!inputField) return;

  // Remove existing listeners by cloning and replacing
  const newInput = inputField.cloneNode(true);
  inputField.parentNode.replaceChild(newInput, inputField);

  // Add new listener
  newInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const command = newInput.value.trim();
      if (command) {
        handleTerminalInput(terminalId, command);
        newInput.value = "";
      }
    }
  });
}

function closeTerminal(id, event) {
  event.stopPropagation();
  if (terminals.length <= 1) return;

  const tab = document.querySelector(`[data-terminal-id="${id}"]`);
  const content = document.getElementById(`terminal-${id}`);

  if (tab) tab.remove();
  if (content) content.remove();

  terminals = terminals.filter((t) => t.id !== id);

  if (activeTerminal === id && terminals.length > 0) {
    switchTerminal(terminals[0].id);
  }
}

function clearTerminal(id) {
  const output = document.getElementById(`output-${id}`);
  if (output) {
    output.innerHTML = "";
  }
}

// File management functions
function renderFileTree() {
  const tree = document.getElementById("fileTree");
  tree.innerHTML = "";

  Object.keys(files).forEach((filename) => {
    if (!filename.includes("/")) {
      const item = document.createElement("div");
      item.className = `file-item ${filename === currentFile ? "active" : ""}`;
      item.innerHTML = `<i data-feather="file-text"></i> ${filename}`;
      item.onclick = () => openFile(filename);
      tree.appendChild(item);
    }
  });

  setTimeout(() => feather.replace(), 10);
}

function openFile(filename) {
  if (files[filename] !== undefined) {
    currentFile = filename;
    editor.setValue(files[filename]);

    const extension = filename.split(".").pop().toLowerCase();
    const language = extension === "py" ? "python" : "javascript";
    monaco.editor.setModelLanguage(editor.getModel(), language);

    setTimeout(() => {
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.focus();
      editor.layout();
    }, 50);

    renderFileTree();
  }
}

function createNewFile() {
  const tree = document.getElementById("fileTree");
  const input = document.createElement("input");
  input.className = "inline-input";
  input.type = "text";
  input.placeholder = "filename.js";
  input.value = "";

  const container = document.createElement("div");
  container.className = "file-item";
  container.innerHTML = `<i data-feather="file-text"></i>`;
  container.appendChild(input);

  tree.insertBefore(container, tree.firstChild);
  input.focus();

  const finishCreation = () => {
    const name = input.value.trim();
    if (name && !files[name]) {
      const extension = name.split(".").pop().toLowerCase();
      if (extension === "py") {
        files[name] = '# New Python file\nprint("Hello from ' + name + '")';
      } else {
        files[name] =
          '// New JavaScript file\nconsole.log("Hello from ' + name + '");';
      }
      saveFilesToStorage();
      renderFileTree();
      openFile(name);
    } else {
      container.remove();
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishCreation();
    } else if (e.key === "Escape") {
      e.preventDefault();
      container.remove();
    }
  });

  input.addEventListener("blur", finishCreation);
  setTimeout(() => feather.replace(), 10);
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebarVisible = !sidebarVisible;
  sidebar.classList.toggle("hidden", !sidebarVisible);
}

// Theme management
function toggleThemeMenu() {
  const menu = document.getElementById("themeMenu");
  menu.classList.toggle("show");
}

function selectTheme(theme, displayName) {
  currentTheme = theme;
  document.body.className = `theme-${theme}`;
  document.getElementById("currentTheme").textContent = displayName;

  document
    .querySelectorAll(".theme-option")
    .forEach((opt) => opt.classList.remove("active"));
  event.target.classList.add("active");

  if (editor && monaco && monacoThemes[theme]) {
    monaco.editor.setTheme(monacoThemes[theme]);
  }

  document.getElementById("themeMenu").classList.remove("show");
  localStorage.setItem("jsPlaygroundTheme", theme);
  localStorage.setItem("jsPlaygroundThemeDisplay", displayName);
}

function toggleFullscreen() {
  if (!isFullscreen) {
    document.documentElement.requestFullscreen();
    isFullscreen = true;
  } else {
    document.exitFullscreen();
    isFullscreen = false;
  }
}

function showAbout() {
  document.getElementById("aboutModal").classList.add("show");
}

function hideAbout() {
  document.getElementById("aboutModal").classList.remove("show");
}

function showUpdates() {
  hideAbout();
  document.getElementById("updatesModal").classList.add("show");
}

function hideUpdates() {
  document.getElementById("updatesModal").classList.remove("show");
}

// Global keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "b") {
    e.preventDefault();
    toggleSidebar();
  }
  if (e.key === "Escape") {
    hideAbout();
    hideUpdates();
  }
});

// Apply saved theme immediately
(function () {
  const savedTheme = localStorage.getItem("jsPlaygroundTheme") || "vscode";
  document.body.className = `theme-${savedTheme}`;
})();
