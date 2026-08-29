import "./style.css";
import type { CharacterSheet, RollLogEntry } from "./types";
import { emptySheet } from "./types";
import { renderSheet, cancelPendingSave } from "./ui/sheet";
import { showResult } from "./ui/result";
import { migrateSheet } from "./obr";
import { downloadSheetJson, readFileAsText } from "./jsonio";

let sheet: CharacterSheet | null = null;
let locked = false; // opens straight into edit mode, since that's the point of this page

const app = document.getElementById("app")!;

function handleRoll(entry: RollLogEntry) {
  // No room to log to here - just show the result locally.
  showResult({
    playerName: "Arbitrator",
    title: entry.label,
    dice: entry.dice,
    outcome: entry.outcome,
    detail: entry.detail ?? (entry.target !== undefined ? `Target: ${entry.target}` : undefined),
  });
}

function render() {
  app.innerHTML = "";

  const header = document.createElement("div");
  header.style.borderBottom = "3px solid #000000";
  header.style.paddingBottom = "0.4rem";
  header.style.marginBottom = "0.75rem";
  const h1 = document.createElement("h1");
  h1.style.borderBottom = "none";
  h1.style.marginBottom = "0.3rem";
  h1.textContent = "Void Born Tools — Sheet Editor";
  header.appendChild(h1);
  const note = document.createElement("div");
  note.className = "empty-state";
  note.style.textAlign = "left";
  note.style.padding = "0";
  note.textContent =
    "Standalone editor - not connected to Owlbear Rodeo. Load a JSON file exported from a player's sheet, edit it, then save and send the file back to them to import.";
  header.appendChild(note);
  app.appendChild(header);

  const fileBar = document.createElement("div");
  fileBar.style.display = "flex";
  fileBar.style.flexWrap = "wrap";
  fileBar.style.gap = "0.4rem";
  fileBar.style.marginBottom = "0.75rem";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      cancelPendingSave();
      sheet = migrateSheet(JSON.parse(text));
      locked = false;
      render();
    } catch (err) {
      alert(`Couldn't load that file: ${err}`);
    }
  });

  const loadBtn = document.createElement("button");
  loadBtn.className = "btn";
  loadBtn.textContent = "Load JSON File";
  loadBtn.addEventListener("click", () => fileInput.click());
  fileBar.appendChild(loadBtn);
  fileBar.appendChild(fileInput);

  const newBtn = document.createElement("button");
  newBtn.className = "btn secondary";
  newBtn.textContent = "New Blank Sheet";
  newBtn.addEventListener("click", () => {
    cancelPendingSave();
    sheet = emptySheet();
    locked = false;
    render();
  });
  fileBar.appendChild(newBtn);

  if (sheet) {
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn secondary";
    saveBtn.textContent = "Save JSON File";
    saveBtn.title = "Downloads the edited sheet as a JSON file";
    saveBtn.addEventListener("click", () => {
      try {
        downloadSheetJson(sheet!);
      } catch (err) {
        alert(String(err));
      }
    });
    fileBar.appendChild(saveBtn);
  }

  app.appendChild(fileBar);

  const content = document.createElement("div");
  app.appendChild(content);

  if (!sheet) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.style.paddingTop = "2rem";
    empty.textContent = "Load a JSON file or start a new blank sheet to begin editing.";
    content.appendChild(empty);
    return;
  }

  renderSheet(
    content,
    sheet,
    "Arbitrator",
    locked,
    (updated) => {
      sheet = updated;
    },
    handleRoll,
    () => {
      locked = !locked;
      render();
    },
    (imported) => {
      cancelPendingSave();
      sheet = imported;
      render();
    }
  );
}

render();
