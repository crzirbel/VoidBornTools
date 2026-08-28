import type {
  AbilityEffects,
  AbilityEntry,
  CharacterSheet,
  RollLogEntry,
  TestAttribute,
  Weapon,
  WeaponKind,
  WargearEntry,
} from "../types";
import { emptyAbilityEffects, emptyWeapon, makeId } from "../types";
import { searchWeaponCatalog, weaponFromCatalog } from "../data/weapons";
import { searchWargearCatalog, wargearFromCatalog } from "../data/wargear";
import { searchAbilityCatalog, abilityFromCatalog } from "../data/abilities";
import { exportSheetAsJpeg } from "../export";
import { exportSheetJsonViaNewTab, readFileAsText } from "../jsonio";
import { migrateSheet } from "../obr";
import { rollTest, buildTestLogEntry, buildAttackLogEntry, buildDamageLogEntry } from "../dice";
import {
  computeBonuses,
  effectiveSav,
  modifiersForKind,
  rollAttack,
  rollDamage,
  weaponAtkDiceCount,
  weaponDamageDiceCount,
  weaponDamageTarget,
  weaponHitTarget,
} from "../combat";
import type { SituationalModifier } from "../combat";
import { showResult } from "./result";

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function debounceSave(sheet: CharacterSheet, onSave: (s: CharacterSheet) => void) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => onSave(sheet), 300);
}

function textField(
  labelText: string,
  value: string,
  locked: boolean,
  onInput: (v: string) => void
): HTMLElement {
  const wrap = document.createElement("div");
  const label = document.createElement("label");
  label.textContent = labelText;
  wrap.appendChild(label);
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.disabled = locked;
  input.addEventListener("input", () => onInput(input.value));
  wrap.appendChild(input);
  return wrap;
}

export function renderSheet(
  container: HTMLElement,
  sheet: CharacterSheet,
  playerName: string,
  locked: boolean,
  onSave: (sheet: CharacterSheet) => void,
  onRoll: (entry: RollLogEntry) => void,
  onToggleLock: () => void,
  onImport: (sheet: CharacterSheet) => void
) {
  container.innerHTML = "";

  // Edit / Save toggle
  const lockBar = document.createElement("div");
  lockBar.style.display = "flex";
  lockBar.style.flexWrap = "wrap";
  lockBar.style.justifyContent = "flex-end";
  lockBar.style.gap = "0.4rem";
  lockBar.style.marginBottom = "0.5rem";

  const exportJpegBtn = document.createElement("button");
  exportJpegBtn.className = "btn secondary small";
  exportJpegBtn.textContent = "Export JPEG";
  exportJpegBtn.addEventListener("click", async () => {
    exportJpegBtn.disabled = true;
    const originalText = exportJpegBtn.textContent;
    exportJpegBtn.textContent = "Exporting...";
    try {
      await exportSheetAsJpeg(sheet);
    } catch (err) {
      showResult({ playerName, title: "Export Failed", dice: [], outcome: "info", detail: String(err) });
    } finally {
      exportJpegBtn.disabled = false;
      exportJpegBtn.textContent = originalText;
    }
  });
  lockBar.appendChild(exportJpegBtn);

  const exportJsonBtn = document.createElement("button");
  exportJsonBtn.className = "btn secondary small";
  exportJsonBtn.textContent = "Export JSON";
  exportJsonBtn.title = "Opens the sheet's JSON in a new tab - use the browser's Save As to keep the file";
  exportJsonBtn.addEventListener("click", () => {
    try {
      exportSheetJsonViaNewTab(sheet);
    } catch (err) {
      showResult({ playerName, title: "Export Failed", dice: [], outcome: "info", detail: String(err) });
    }
  });
  lockBar.appendChild(exportJsonBtn);

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".json,application/json";
  importInput.style.display = "none";
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const migrated = migrateSheet(parsed);
      if (!confirm(`Import "${migrated.name || "this sheet"}"? This will overwrite your current sheet.`)) {
        return;
      }
      onImport(migrated);
    } catch (err) {
      showResult({ playerName, title: "Import Failed", dice: [], outcome: "info", detail: String(err) });
    }
  });

  const importBtn = document.createElement("button");
  importBtn.className = "btn secondary small";
  importBtn.textContent = "Import JSON";
  importBtn.title = "Overwrites your current sheet with the contents of the file";
  importBtn.addEventListener("click", () => importInput.click());
  lockBar.appendChild(importBtn);
  lockBar.appendChild(importInput);

  const lockBtn = document.createElement("button");
  lockBtn.className = locked ? "btn secondary small" : "btn small";
  lockBtn.textContent = locked ? "Edit Sheet" : "Save & Lock";
  lockBtn.addEventListener("click", onToggleLock);
  lockBar.appendChild(lockBtn);
  container.appendChild(lockBar);

  // Name + MOV + FGT row (neither is ever rolled directly)
  const nameRow = document.createElement("div");
  nameRow.className = "name-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = sheet.name;
  nameInput.placeholder = "Colonist name";
  nameInput.disabled = locked;
  nameInput.style.fontSize = "1.05rem";
  nameInput.style.fontWeight = "bold";
  nameInput.addEventListener("input", () => {
    sheet.name = nameInput.value;
    debounceSave(sheet, onSave);
  });
  nameRow.appendChild(nameInput);

  for (const attr of [
    { key: "mov" as const, label: "MOV" },
    { key: "fgt" as const, label: "FGT" },
  ]) {
    const box = document.createElement("div");
    box.className = "attr-box compact";
    const label = document.createElement("div");
    label.className = "attr-label";
    label.textContent = attr.label;
    box.appendChild(label);
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(sheet[attr.key]);
    input.disabled = locked;
    input.addEventListener("input", () => {
      (sheet as any)[attr.key] = Number(input.value) || 0;
      debounceSave(sheet, onSave);
    });
    box.appendChild(input);
    nameRow.appendChild(box);
  }
  container.appendChild(nameRow);

  // Handle
  container.appendChild(
    textField("Handle", sheet.handle, locked, (v) => {
      sheet.handle = v;
      debounceSave(sheet, onSave);
    })
  );

  // Attributes: STR AGL TGH INT WIL PRS SAV, one compact row - all rollable
  const attrPanel = document.createElement("div");
  attrPanel.className = "panel";
  const attrGrid = document.createElement("div");
  attrGrid.className = "attr-grid";

  const attrs: { key: keyof CharacterSheet; label: string }[] = [
    { key: "str", label: "STR" },
    { key: "agl", label: "AGL" },
    { key: "tgh", label: "TGH" },
    { key: "int", label: "INT" },
    { key: "wil", label: "WIL" },
    { key: "prs", label: "PRS" },
    { key: "sav", label: "SAV" },
  ];

  for (const attr of attrs) {
    const box = document.createElement("div");
    box.className = "attr-box";
    const label = document.createElement("div");
    label.className = "attr-label";
    label.textContent = attr.label;
    box.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.value = String(sheet[attr.key]);
    input.disabled = locked;
    input.addEventListener("input", () => {
      (sheet as any)[attr.key] = Number(input.value) || 0;
      debounceSave(sheet, onSave);
      if (attr.key === "sav") updateSavNote?.();
    });
    box.appendChild(input);

    // SAV can be boosted by abilities (Wary, Master Crafted) - show the
    // effective total when a bonus is active.
    let updateSavNote: (() => void) | null = null;
    if (attr.key === "sav") {
      const savNote = document.createElement("div");
      savNote.className = "attr-sub-note";
      box.appendChild(savNote);
      updateSavNote = () => {
        const bonuses = computeBonuses(sheet);
        savNote.textContent = bonuses.savBonus !== 0 ? `eff. ${effectiveSav(sheet, bonuses)}` : "";
      };
      updateSavNote();
    }

    if (locked) {
      box.title = `Click to roll a ${attr.label} test`;
      box.classList.add("rollable");

      // SAV specifically needs a one-off situational modifier (e.g. -1 when
      // hit by a Piercing weapon). Applied only to the next roll, then reset.
      let savModInput: HTMLInputElement | null = null;
      if (attr.key === "sav") {
        savModInput = document.createElement("input");
        savModInput.type = "number";
        savModInput.value = "0";
        savModInput.className = "sav-mod-input";
        savModInput.title = "Situational modifier for this roll only (e.g. -1 for Piercing). Resets after rolling.";
        savModInput.addEventListener("click", (e) => e.stopPropagation());
        box.appendChild(savModInput);
      }

      box.addEventListener("click", () => {
        const bonuses = computeBonuses(sheet);
        const base = attr.key === "sav" ? effectiveSav(sheet, bonuses) : Number(input.value) || 0;
        const situational = savModInput ? Number(savModInput.value) || 0 : 0;
        const target = base + situational;
        const result = rollTest(target);
        const label = situational !== 0 ? `${attr.label} Test (${situational > 0 ? "+" : ""}${situational})` : `${attr.label} Test`;
        const entry = buildTestLogEntry(playerName, label, result);
        onRoll(entry);
        if (savModInput) savModInput.value = "0";
      });
    }

    attrGrid.appendChild(box);
  }

  attrPanel.appendChild(attrGrid);
  container.appendChild(attrPanel);

  // Species / Trait / Past / Trinket
  const bgPanel = document.createElement("div");
  bgPanel.className = "panel";
  bgPanel.appendChild(sectionTitle("Background"));
  const bgFields: { key: keyof CharacterSheet; label: string }[] = [
    { key: "species", label: "Species" },
    { key: "trait", label: "Defining Trait" },
    { key: "past", label: "Past / Role" },
    { key: "trinket", label: "Trinket" },
  ];
  const bgRow = document.createElement("div");
  bgRow.className = "field-row";
  for (const f of bgFields) {
    const wrap = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = f.label;
    wrap.appendChild(label);
    const input = document.createElement("input");
    input.type = "text";
    input.value = String(sheet[f.key] ?? "");
    input.disabled = locked;
    input.addEventListener("input", () => {
      (sheet as any)[f.key] = input.value;
      debounceSave(sheet, onSave);
    });
    wrap.appendChild(input);
    bgRow.appendChild(wrap);
  }
  bgPanel.appendChild(bgRow);
  container.appendChild(bgPanel);

  // Weapons
  const weaponPanel = document.createElement("div");
  weaponPanel.className = "panel";
  weaponPanel.appendChild(sectionTitle("Weapons"));

  const weaponHeader = document.createElement("div");
  weaponHeader.className = "weapon-row";
  weaponHeader.style.fontWeight = "bold";
  weaponHeader.style.color = "var(--text-dim)";
  weaponHeader.innerHTML = `<span>Name</span><span>RNG</span><span>Kind</span><span>ATK</span><span>HIT</span><span>DMG</span><span></span>`;
  weaponPanel.appendChild(weaponHeader);

  const weaponList = document.createElement("div");
  weaponPanel.appendChild(weaponList);

  function renderWeapons() {
    weaponList.innerHTML = "";
    if (sheet.weapons.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No weapons yet.";
      weaponList.appendChild(empty);
    }
    for (const weapon of sheet.weapons) {
      weaponList.appendChild(renderWeaponBlock(weapon));
    }
  }

  const MELEE_ATK_OPTIONS = [
    { value: 0, label: "FGT" },
    { value: 1, label: "FGT+1" },
  ];
  const RANGED_ATK_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}D10` }));

  function renderWeaponBlock(weapon: Weapon): HTMLElement {
    const block = document.createElement("div");
    block.className = "weapon-block";

    const row = document.createElement("div");
    row.className = "weapon-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = weapon.name;
    nameInput.placeholder = "Weapon";
    nameInput.disabled = locked;
    nameInput.addEventListener("input", () => {
      weapon.name = nameInput.value;
      debounceSave(sheet, onSave);
    });

    const rngInput = document.createElement("input");
    rngInput.type = "text";
    rngInput.value = weapon.rng;
    rngInput.disabled = locked;
    rngInput.addEventListener("input", () => {
      weapon.rng = rngInput.value;
      debounceSave(sheet, onSave);
    });

    const kindSelect = document.createElement("select");
    kindSelect.disabled = locked;
    const kindOptions: WeaponKind[] = ["melee", "ranged"];
    for (const opt of kindOptions) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt === "melee" ? "Melee" : "Ranged";
      if (opt === weapon.kind) o.selected = true;
      kindSelect.appendChild(o);
    }

    const atkSelect = document.createElement("select");
    atkSelect.disabled = locked;

    function populateAtkOptions() {
      atkSelect.innerHTML = "";
      const options = weapon.kind === "melee" ? MELEE_ATK_OPTIONS : RANGED_ATK_OPTIONS;
      for (const opt of options) {
        const o = document.createElement("option");
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (opt.value === weapon.baseDice) o.selected = true;
        atkSelect.appendChild(o);
      }
      atkSelect.title =
        weapon.kind === "melee"
          ? "Melee ATK dice: FGT, or FGT+1 for weapons with a higher ATK rating"
          : "Ranged ATK dice: this weapon's own dice count";
    }
    populateAtkOptions();

    kindSelect.addEventListener("change", () => {
      weapon.kind = kindSelect.value as WeaponKind;
      // Reset to a sane default for the new kind so the selector never shows
      // a stale/invalid option (e.g. "3" left over from Ranged after switching to Melee).
      weapon.baseDice = weapon.kind === "melee" ? 0 : 1;
      debounceSave(sheet, onSave);
      populateAtkOptions();
      updateHint();
      renderModifiers();
    });

    atkSelect.addEventListener("change", () => {
      weapon.baseDice = Number(atkSelect.value) || 0;
      debounceSave(sheet, onSave);
      updateHint();
    });

    const hitSelect = document.createElement("select");
    hitSelect.disabled = locked;
    const hitOptions: (TestAttribute | "")[] = ["", "STR", "AGL", "TGH", "INT", "WIL", "PRS"];
    for (const opt of hitOptions) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt || "—";
      if (opt === weapon.hit) o.selected = true;
      hitSelect.appendChild(o);
    }
    hitSelect.addEventListener("change", () => {
      weapon.hit = hitSelect.value as TestAttribute | "";
      debounceSave(sheet, onSave);
      updateHint();
    });

    const dmgInput = document.createElement("input");
    dmgInput.type = "text";
    dmgInput.value = weapon.dmg;
    dmgInput.disabled = locked;
    dmgInput.title = 'DMG target. A flat number ("5") or attribute formula ("STR+2")';
    dmgInput.addEventListener("input", () => {
      weapon.dmg = dmgInput.value;
      debounceSave(sheet, onSave);
      updateHint();
    });

    const actions = document.createElement("div");
    actions.className = "actions-cell";

    let atkRollBtn: HTMLButtonElement | null = null;
    if (locked) {
      atkRollBtn = document.createElement("button");
      atkRollBtn.className = "btn small";
      atkRollBtn.textContent = "Roll ATK";
      actions.appendChild(atkRollBtn);
    } else {
      const delBtn = document.createElement("button");
      delBtn.className = "btn small danger";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        sheet.weapons = sheet.weapons.filter((w) => w.id !== weapon.id);
        onSave(sheet);
        renderWeapons();
      });
      actions.appendChild(delBtn);
    }

    row.appendChild(nameInput);
    row.appendChild(rngInput);
    row.appendChild(kindSelect);
    row.appendChild(atkSelect);
    row.appendChild(hitSelect);
    row.appendChild(dmgInput);
    row.appendChild(actions);
    block.appendChild(row);

    const hint = document.createElement("div");
    hint.className = "empty-state";
    hint.style.textAlign = "left";
    hint.style.padding = "0.1rem 0 0";
    block.appendChild(hint);

    function updateHint() {
      if (!atkRollBtn) return;
      const bonuses = computeBonuses(sheet);
      const numDice = weaponAtkDiceCount(sheet, weapon, bonuses);
      const target = weaponHitTarget(sheet, weapon, bonuses);
      const dmgTarget = weaponDamageTarget(sheet, weapon, bonuses);
      if (weapon.hit) {
        atkRollBtn.title = `Rolls ${numDice}D10 vs ${weapon.hit} ${target}`;
        hint.textContent = `DMG target: ${dmgTarget}`;
      } else {
        atkRollBtn.title = "Set a HIT attribute first";
        hint.textContent = "";
      }
    }
    updateHint();

    // Traits (Precise, Pierce, Burn, etc.) - display-only, doesn't affect any
    // math. Editable while unlocked; shown as a compact line (like the DMG
    // target hint above) only when locked and non-empty, to stay out of the way.
    if (locked) {
      if (weapon.traits.trim()) {
        const traitsHint = document.createElement("div");
        traitsHint.className = "empty-state";
        traitsHint.style.textAlign = "left";
        traitsHint.style.padding = "0.1rem 0 0";
        traitsHint.textContent = `Traits: ${weapon.traits}`;
        block.appendChild(traitsHint);
      }
    } else {
      const traitsRow = document.createElement("div");
      traitsRow.className = "traits-row";
      const traitsLabel = document.createElement("label");
      traitsLabel.textContent = "Traits";
      traitsRow.appendChild(traitsLabel);
      const traitsInput = document.createElement("input");
      traitsInput.type = "text";
      traitsInput.value = weapon.traits;
      traitsInput.placeholder = "e.g. Precise, Pierce, Burn";
      traitsInput.addEventListener("input", () => {
        weapon.traits = traitsInput.value;
        debounceSave(sheet, onSave);
      });
      traitsRow.appendChild(traitsInput);
      block.appendChild(traitsRow);
    }

    // Situational modifiers (Cover, Aim, Charge, etc.) - checked before rolling
    // ATK, applied only to that one roll, and reset afterward. Never saved.
    let getActiveModifierTotal: () => { delta: number; labels: string[] } = () => ({ delta: 0, labels: [] });
    let resetModifierChecks: () => void = () => {};
    const modBox = document.createElement("div");
    if (locked) block.appendChild(modBox);

    function renderModifiers() {
      modBox.innerHTML = "";
      if (!locked) return;
      const list = modifiersForKind(weapon.kind);
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn secondary small";
      toggleBtn.textContent = "Modifiers";
      const optionsBox = document.createElement("div");
      optionsBox.className = "modifiers-box";
      optionsBox.style.display = "none";
      toggleBtn.addEventListener("click", () => {
        optionsBox.style.display = optionsBox.style.display === "none" ? "block" : "none";
      });
      modBox.appendChild(toggleBtn);
      modBox.appendChild(optionsBox);

      const checkboxes: { checkbox: HTMLInputElement; mod: SituationalModifier }[] = [];
      for (const mod of list) {
        const wrap = document.createElement("label");
        wrap.className = "modifier-check";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        wrap.appendChild(cb);
        wrap.appendChild(document.createTextNode(`${mod.label} (${mod.delta > 0 ? "+" : ""}${mod.delta})`));
        optionsBox.appendChild(wrap);
        checkboxes.push({ checkbox: cb, mod });
      }

      getActiveModifierTotal = () => {
        const active = checkboxes.filter((c) => c.checkbox.checked);
        return {
          delta: active.reduce((sum, c) => sum + c.mod.delta, 0),
          labels: active.map((c) => c.mod.label),
        };
      };
      resetModifierChecks = () => {
        for (const c of checkboxes) c.checkbox.checked = false;
      };
    }
    renderModifiers();

    // Roll ATK -> shows hits, then Roll DMG is a separate, manually-triggered
    // step (a GM's SAV throw between the two can change how many hits land).
    let hitsLabel: HTMLSpanElement | null = null;
    let dmgCountInput: HTMLInputElement | null = null;
    let dmgRollBtn: HTMLButtonElement | null = null;

    if (locked) {
      const combatRow = document.createElement("div");
      combatRow.className = "weapon-combat-row";

      hitsLabel = document.createElement("span");
      hitsLabel.className = "meta";
      hitsLabel.textContent = "Hits: —";
      combatRow.appendChild(hitsLabel);

      dmgCountInput = document.createElement("input");
      dmgCountInput.type = "number";
      dmgCountInput.min = "0";
      dmgCountInput.value = "0";
      dmgCountInput.title = "Number of DMG dice to roll - defaults to hits (plus any Extra DMG Dice/Hit effect), adjust if some were saved against";
      combatRow.appendChild(dmgCountInput);

      dmgRollBtn = document.createElement("button");
      dmgRollBtn.className = "btn secondary small";
      dmgRollBtn.textContent = "Roll DMG";
      dmgRollBtn.title = "Auto-hit weapons (Spew trait: Musket, Shotgun, Flamer, etc.) have no ATK roll - just type a dice count and roll DMG directly";
      dmgRollBtn.addEventListener("click", () => {
        const n = Number(dmgCountInput!.value) || 0;
        if (n <= 0) return;
        const bonuses = computeBonuses(sheet);
        const dmgTarget = weaponDamageTarget(sheet, weapon, bonuses);
        const dmg = rollDamage(n, dmgTarget);
        const entry = buildDamageLogEntry(playerName, `${weapon.name || "Weapon"} DMG`, dmg);
        onRoll(entry);
      });
      combatRow.appendChild(dmgRollBtn);

      block.appendChild(combatRow);
    }

    if (atkRollBtn) {
      atkRollBtn.addEventListener("click", () => {
        if (!weapon.hit) {
          showResult({ playerName, title: weapon.name || "Weapon", dice: [], outcome: "info", detail: "Set a HIT attribute first." });
          return;
        }
        const bonuses = computeBonuses(sheet);
        const { delta: modDelta, labels: modLabels } = getActiveModifierTotal();
        const target = weaponHitTarget(sheet, weapon, bonuses) + modDelta;
        const atk = rollAttack(
          weaponAtkDiceCount(sheet, weapon, bonuses),
          target,
          bonuses.critThreshold,
          weapon.kind === "ranged" && bonuses.rerollRangedCritFail
        );
        const label =
          modLabels.length > 0
            ? `${weapon.name || "Weapon"} ATK (${modLabels.join(", ")})`
            : `${weapon.name || "Weapon"} ATK`;
        const entry = buildAttackLogEntry(playerName, label, atk);
        onRoll(entry);
        resetModifierChecks();

        if (hitsLabel) hitsLabel.textContent = `Hits: ${atk.hits}`;
        if (dmgCountInput) dmgCountInput.value = String(weaponDamageDiceCount(atk.hits, weapon));
      });
    }

    // Per-weapon Effects (hidden unless this specific weapon needs to modify
    // the sheet's math, e.g. a masterwork item with its own bonus).
    if (!locked) {
      const hasEffects =
        weapon.atkBonus !== 0 ||
        weapon.hitBonus !== 0 ||
        weapon.dmgBonus !== 0 ||
        weapon.extraDmgDicePerHit !== 0;
      const effToggle = document.createElement("button");
      effToggle.className = "btn secondary small";
      effToggle.style.marginTop = "0.3rem";
      effToggle.textContent = hasEffects ? "Effects (set)" : "+ Effects";
      const effBox = document.createElement("div");
      effBox.className = "effects-box";
      effBox.style.display = hasEffects ? "block" : "none";
      effToggle.addEventListener("click", () => {
        effBox.style.display = effBox.style.display === "none" ? "block" : "none";
      });
      block.appendChild(effToggle);
      block.appendChild(effBox);

      const effFields: { key: "atkBonus" | "hitBonus" | "dmgBonus" | "extraDmgDicePerHit"; label: string; title?: string }[] = [
        { key: "atkBonus", label: "ATK Bonus" },
        { key: "hitBonus", label: "HIT Bonus" },
        { key: "dmgBonus", label: "DMG Bonus" },
        {
          key: "extraDmgDicePerHit",
          label: "Extra DMG Dice / Hit",
          title: "e.g. Gnawing: \"If you HIT your target, roll 2 extra DMG dice.\" - set to 2",
        },
      ];
      const effGrid = document.createElement("div");
      effGrid.className = "field-row";
      effGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
      for (const f of effFields) {
        const wrap = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = f.label;
        wrap.appendChild(label);
        const input = document.createElement("input");
        input.type = "number";
        if (f.title) input.title = f.title;
        input.value = String(weapon[f.key]);
        input.addEventListener("input", () => {
          weapon[f.key] = Number(input.value) || 0;
          debounceSave(sheet, onSave);
        });
        wrap.appendChild(input);
        effGrid.appendChild(wrap);
      }
      effBox.appendChild(effGrid);
    }

    return block;
  }

  renderWeapons();

  if (!locked) {
    const addRow = document.createElement("div");
    addRow.style.display = "flex";
    addRow.style.gap = "0.4rem";
    addRow.style.marginTop = "0.4rem";

    const addWeaponBtn = document.createElement("button");
    addWeaponBtn.className = "btn secondary small";
    addWeaponBtn.textContent = "+ Add Blank Weapon";
    addWeaponBtn.addEventListener("click", () => {
      sheet.weapons.push(emptyWeapon());
      onSave(sheet);
      renderWeapons();
    });
    addRow.appendChild(addWeaponBtn);

    const catalogToggle = document.createElement("button");
    catalogToggle.className = "btn small";
    catalogToggle.textContent = "+ Add From Catalog";
    addRow.appendChild(catalogToggle);
    weaponPanel.appendChild(addRow);

    const catalogBox = document.createElement("div");
    catalogBox.className = "catalog-box";
    catalogBox.style.display = "none";
    weaponPanel.appendChild(catalogBox);

    catalogToggle.addEventListener("click", () => {
      catalogBox.style.display = catalogBox.style.display === "none" ? "block" : "none";
    });

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search weapons (name, category, or trait)...";
    catalogBox.appendChild(searchInput);

    const resultsList = document.createElement("div");
    resultsList.className = "catalog-results";
    catalogBox.appendChild(resultsList);

    function renderCatalogResults() {
      resultsList.innerHTML = "";
      const matches = searchWeaponCatalog(searchInput.value);
      if (matches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No matches.";
        resultsList.appendChild(empty);
        return;
      }
      for (const entry of matches.slice(0, 40)) {
        const row = document.createElement("div");
        row.className = "catalog-result-row";
        const info = document.createElement("span");
        info.textContent = `${entry.name} (${entry.category})`;
        row.appendChild(info);
        const addBtn = document.createElement("button");
        addBtn.className = "btn small";
        addBtn.textContent = "Add";
        addBtn.addEventListener("click", () => {
          sheet.weapons.push(weaponFromCatalog(entry));
          onSave(sheet);
          renderWeapons();
        });
        row.appendChild(addBtn);
        resultsList.appendChild(row);
      }
    }
    searchInput.addEventListener("input", renderCatalogResults);
    renderCatalogResults();
  }

  container.appendChild(weaponPanel);

  // Abilities (name + description list)
  const abilityPanel = document.createElement("div");
  abilityPanel.className = "panel";
  abilityPanel.appendChild(sectionTitle("Abilities"));
  const abilityList = document.createElement("div");
  abilityPanel.appendChild(abilityList);

  function renderAbilities() {
    abilityList.innerHTML = "";
    if (sheet.abilities.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No abilities yet.";
      abilityList.appendChild(empty);
    }
    for (const ability of sheet.abilities) {
      abilityList.appendChild(renderAbilityItem(ability));
    }
  }

  function renderAbilityItem(ability: AbilityEntry): HTMLElement {
    const block = document.createElement("div");
    block.className = "list-item";

    const topRow = document.createElement("div");
    topRow.className = "list-item-top";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Ability name";
    nameInput.value = ability.name;
    nameInput.disabled = locked;
    nameInput.className = "list-item-name";
    nameInput.addEventListener("input", () => {
      ability.name = nameInput.value;
      debounceSave(sheet, onSave);
    });
    topRow.appendChild(nameInput);

    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.placeholder = "Description";
    descInput.value = ability.description;
    descInput.disabled = locked;
    descInput.className = "list-item-desc";
    descInput.addEventListener("input", () => {
      ability.description = descInput.value;
      debounceSave(sheet, onSave);
    });
    topRow.appendChild(descInput);

    if (!locked) {
      const delBtn = document.createElement("button");
      delBtn.className = "btn small danger";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        sheet.abilities = sheet.abilities.filter((a) => a.id !== ability.id);
        onSave(sheet);
        renderAbilities();
      });
      topRow.appendChild(delBtn);
    }
    block.appendChild(topRow);

    // Effects editor - only shown while editing, and only if this ability
    // actually needs to modify the sheet's math (most are flavor-only).
    if (!locked) {
      const hasEffects = abilityHasEffects(ability.effects);
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn secondary small";
      toggleBtn.style.marginTop = "0.3rem";
      toggleBtn.textContent = hasEffects ? "Effects (set)" : "+ Effects";
      const effectsBox = document.createElement("div");
      effectsBox.className = "effects-box";
      effectsBox.style.display = hasEffects ? "block" : "none";
      toggleBtn.addEventListener("click", () => {
        effectsBox.style.display = effectsBox.style.display === "none" ? "block" : "none";
      });
      block.appendChild(toggleBtn);
      block.appendChild(effectsBox);

      const effectFields: { key: keyof AbilityEffects; label: string; type: "number" | "checkbox" }[] = [
        { key: "meleeAtkBonus", label: "Melee ATK Dice", type: "number" },
        { key: "meleeHitBonus", label: "Melee HIT Bonus", type: "number" },
        { key: "rangedAtkBonus", label: "Ranged ATK Dice", type: "number" },
        { key: "rangedHitBonus", label: "Ranged HIT Bonus", type: "number" },
        { key: "dmgBonus", label: "DMG Bonus (all weapons)", type: "number" },
        { key: "savBonus", label: "SAV Bonus", type: "number" },
        { key: "critThreshold", label: "Crit-Hit On D10 ≤", type: "number" },
      ];
      const effGrid = document.createElement("div");
      effGrid.className = "field-row";
      for (const f of effectFields) {
        const wrap = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = f.label;
        wrap.appendChild(label);
        const input = document.createElement("input");
        input.type = "number";
        input.value = String(ability.effects[f.key] ?? (f.key === "critThreshold" ? 1 : 0));
        input.addEventListener("input", () => {
          (ability.effects as any)[f.key] = Number(input.value) || (f.key === "critThreshold" ? 1 : 0);
          debounceSave(sheet, onSave);
        });
        wrap.appendChild(input);
        effGrid.appendChild(wrap);
      }
      effectsBox.appendChild(effGrid);

      const rerollWrap = document.createElement("label");
      rerollWrap.style.display = "flex";
      rerollWrap.style.alignItems = "center";
      rerollWrap.style.gap = "0.3rem";
      rerollWrap.style.textTransform = "none";
      const rerollCheckbox = document.createElement("input");
      rerollCheckbox.type = "checkbox";
      rerollCheckbox.style.width = "auto";
      rerollCheckbox.checked = !!ability.effects.rerollRangedCritFail;
      rerollCheckbox.addEventListener("change", () => {
        ability.effects.rerollRangedCritFail = rerollCheckbox.checked;
        debounceSave(sheet, onSave);
      });
      rerollWrap.appendChild(rerollCheckbox);
      rerollWrap.appendChild(document.createTextNode("Reroll a ranged HIT roll of 0, once"));
      effectsBox.appendChild(rerollWrap);
    }

    return block;
  }

  renderAbilities();

  if (!locked) {
    const addRow = document.createElement("div");
    addRow.style.display = "flex";
    addRow.style.gap = "0.4rem";
    addRow.style.marginTop = "0.4rem";

    const addAbilityBtn = document.createElement("button");
    addAbilityBtn.className = "btn secondary small";
    addAbilityBtn.textContent = "+ Add Blank Ability";
    addAbilityBtn.addEventListener("click", () => {
      sheet.abilities.push({ id: makeId("ab"), name: "", description: "", effects: emptyAbilityEffects() });
      onSave(sheet);
      renderAbilities();
    });
    addRow.appendChild(addAbilityBtn);

    const catalogToggle = document.createElement("button");
    catalogToggle.className = "btn small";
    catalogToggle.textContent = "+ Add From Catalog";
    addRow.appendChild(catalogToggle);
    abilityPanel.appendChild(addRow);

    const catalogBox = document.createElement("div");
    catalogBox.className = "catalog-box";
    catalogBox.style.display = "none";
    abilityPanel.appendChild(catalogBox);

    catalogToggle.addEventListener("click", () => {
      catalogBox.style.display = catalogBox.style.display === "none" ? "block" : "none";
    });

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search abilities (name, role, or effect)...";
    catalogBox.appendChild(searchInput);

    const resultsList = document.createElement("div");
    resultsList.className = "catalog-results";
    catalogBox.appendChild(resultsList);

    function renderCatalogResults() {
      resultsList.innerHTML = "";
      const matches = searchAbilityCatalog(searchInput.value);
      if (matches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No matches.";
        resultsList.appendChild(empty);
        return;
      }
      for (const entry of matches.slice(0, 40)) {
        const row = document.createElement("div");
        row.className = "catalog-result-row";
        const info = document.createElement("span");
        info.textContent = `${entry.name} (${entry.role})`;
        row.appendChild(info);
        const addBtn = document.createElement("button");
        addBtn.className = "btn small";
        addBtn.textContent = "Add";
        addBtn.addEventListener("click", () => {
          sheet.abilities.push(abilityFromCatalog(entry));
          onSave(sheet);
          renderAbilities();
        });
        row.appendChild(addBtn);
        resultsList.appendChild(row);
      }
    }
    searchInput.addEventListener("input", renderCatalogResults);
    renderCatalogResults();
  }

  container.appendChild(abilityPanel);

  // Wargear (name + quantity + description list)
  const wargearPanel = document.createElement("div");
  wargearPanel.className = "panel";
  wargearPanel.appendChild(sectionTitle("Wargear"));
  const wargearList = document.createElement("div");
  wargearPanel.appendChild(wargearList);

  function renderWargear() {
    wargearList.innerHTML = "";
    if (sheet.wargear.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No wargear yet.";
      wargearList.appendChild(empty);
    }
    for (const item of sheet.wargear) {
      wargearList.appendChild(renderWargearItem(item));
    }
  }

  function renderWargearItem(item: WargearEntry): HTMLElement {
    const block = document.createElement("div");
    block.className = "list-item";

    const topRow = document.createElement("div");
    topRow.className = "list-item-top";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Wargear name";
    nameInput.value = item.name;
    nameInput.disabled = locked;
    nameInput.className = "list-item-name";
    nameInput.addEventListener("input", () => {
      item.name = nameInput.value;
      debounceSave(sheet, onSave);
    });
    topRow.appendChild(nameInput);

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.value = String(item.quantity);
    qtyInput.disabled = locked;
    qtyInput.className = "list-item-qty";
    qtyInput.title = "Quantity";
    qtyInput.addEventListener("input", () => {
      item.quantity = Number(qtyInput.value) || 0;
      debounceSave(sheet, onSave);
    });
    topRow.appendChild(qtyInput);

    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.placeholder = "Description";
    descInput.value = item.description;
    descInput.disabled = locked;
    descInput.className = "list-item-desc";
    descInput.addEventListener("input", () => {
      item.description = descInput.value;
      debounceSave(sheet, onSave);
    });
    topRow.appendChild(descInput);

    if (!locked) {
      const delBtn = document.createElement("button");
      delBtn.className = "btn small danger";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        sheet.wargear = sheet.wargear.filter((w) => w.id !== item.id);
        onSave(sheet);
        renderWargear();
      });
      topRow.appendChild(delBtn);
    }
    block.appendChild(topRow);

    return block;
  }

  renderWargear();

  if (!locked) {
    const addRow = document.createElement("div");
    addRow.style.display = "flex";
    addRow.style.gap = "0.4rem";
    addRow.style.marginTop = "0.4rem";

    const addWargearBtn = document.createElement("button");
    addWargearBtn.className = "btn secondary small";
    addWargearBtn.textContent = "+ Add Blank Wargear";
    addWargearBtn.addEventListener("click", () => {
      sheet.wargear.push({ id: makeId("wg"), name: "", quantity: 1, description: "" });
      onSave(sheet);
      renderWargear();
    });
    addRow.appendChild(addWargearBtn);

    const catalogToggle = document.createElement("button");
    catalogToggle.className = "btn small";
    catalogToggle.textContent = "+ Add From Catalog";
    addRow.appendChild(catalogToggle);
    wargearPanel.appendChild(addRow);

    const catalogBox = document.createElement("div");
    catalogBox.className = "catalog-box";
    catalogBox.style.display = "none";
    wargearPanel.appendChild(catalogBox);

    catalogToggle.addEventListener("click", () => {
      catalogBox.style.display = catalogBox.style.display === "none" ? "block" : "none";
    });

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search wargear (name, category, or effect)...";
    catalogBox.appendChild(searchInput);

    const resultsList = document.createElement("div");
    resultsList.className = "catalog-results";
    catalogBox.appendChild(resultsList);

    function renderCatalogResults() {
      resultsList.innerHTML = "";
      const matches = searchWargearCatalog(searchInput.value);
      if (matches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No matches.";
        resultsList.appendChild(empty);
        return;
      }
      for (const entry of matches.slice(0, 40)) {
        const row = document.createElement("div");
        row.className = "catalog-result-row";
        const info = document.createElement("span");
        info.textContent = `${entry.name} (${entry.category})`;
        row.appendChild(info);
        const addBtn = document.createElement("button");
        addBtn.className = "btn small";
        addBtn.textContent = "Add";
        addBtn.addEventListener("click", () => {
          sheet.wargear.push(wargearFromCatalog(entry));
          onSave(sheet);
          renderWargear();
        });
        row.appendChild(addBtn);
        resultsList.appendChild(row);
      }
    }
    searchInput.addEventListener("input", renderCatalogResults);
    renderCatalogResults();
  }

  container.appendChild(wargearPanel);

  // Injuries / Corruption
  const injuryPanel = document.createElement("div");
  injuryPanel.className = "panel";
  injuryPanel.appendChild(sectionTitle("Injuries, Corruption, etc."));
  const injuryArea = document.createElement("textarea");
  injuryArea.value = sheet.injuries;
  injuryArea.disabled = locked;
  injuryArea.addEventListener("input", () => {
    sheet.injuries = injuryArea.value;
    debounceSave(sheet, onSave);
  });
  injuryPanel.appendChild(injuryArea);
  container.appendChild(injuryPanel);

  // Bonds
  const bondPanel = document.createElement("div");
  bondPanel.className = "panel";
  bondPanel.appendChild(sectionTitle("Bonds"));
  const bondArea = document.createElement("textarea");
  bondArea.value = sheet.bonds;
  bondArea.disabled = locked;
  bondArea.addEventListener("input", () => {
    sheet.bonds = bondArea.value;
    debounceSave(sheet, onSave);
  });
  bondPanel.appendChild(bondArea);
  container.appendChild(bondPanel);

  // Gold
  const goldPanel = document.createElement("div");
  goldPanel.className = "panel";
  const goldLabel = document.createElement("label");
  goldLabel.textContent = "Gold";
  goldPanel.appendChild(goldLabel);
  const goldInput = document.createElement("input");
  goldInput.type = "number";
  goldInput.value = String(sheet.gold);
  goldInput.disabled = locked;
  goldInput.addEventListener("input", () => {
    sheet.gold = Number(goldInput.value) || 0;
    debounceSave(sheet, onSave);
  });
  goldPanel.appendChild(goldInput);
  container.appendChild(goldPanel);
}

function sectionTitle(text: string): HTMLElement {
  const h = document.createElement("h2");
  h.textContent = text;
  return h;
}

function abilityHasEffects(effects: AbilityEffects): boolean {
  return (
    effects.meleeAtkBonus !== 0 ||
    effects.meleeHitBonus !== 0 ||
    effects.rangedAtkBonus !== 0 ||
    effects.rangedHitBonus !== 0 ||
    effects.dmgBonus !== 0 ||
    effects.savBonus !== 0 ||
    effects.critThreshold > 1 ||
    effects.rerollRangedCritFail
  );
}
