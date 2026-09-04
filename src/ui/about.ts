type ChangelogEntry = {
  version: string;
  notes: string[];
};

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v1.1",
    notes: [
      "Added an Inventory section below Wargear on the Sheet tab (same name/quantity/description structure as Wargear, for plain carried items)",
      "Added Equipped checkboxes and an Effects editor to Wargear — armor, fields, and shields now grant real SAV/TGH bonuses while equipped (armor and fields don't stack with each other; shields always stack on top), and items like Holy Water, Laser Sight, and Hellfire Rounds apply their HIT/ATK bonuses automatically (the latter two link to a specific ranged weapon)",
      "Added a Scatter Direction spinner wheel to the Tables tab for blast weapons and vehicle-damage-table ejections — a static compass face with a spinning center needle, holds on the last result until you spin again",
      "The SAV box on the Sheet tab is now auto-set from equipped armor/field/shield (plus the rare ability like Wary) instead of being a manually-typed base stat — an \"Ovr\" checkbox in Edit mode lets the Arbitrator type a manual override when needed (e.g. a custom NPC template)",
      "Fixed a bug where the DMG box could show 0 instead of the number of successful HITs — most noticeable on a popped-out sheet, where every roll synced back from the main window was silently resetting the in-progress attack",
    ],
  },
  {
    version: "v1.0",
    notes: [
      "Added Luck & Chaos tokens (replaces the old Luck Coin) — 8 shared tokens that persist indefinitely; players spend Luck tokens (flipping them to Chaos) for ATK/Test bonuses, canceling a Critical Fail, or rerolling a Wound; the Arbitrator spends Chaos tokens (flipping them back to Luck) to force bad outcomes; a player can Burn a token permanently on a character's death, and the Arbitrator can Grant a Luck token back up to the max of 8",
      "Renamed every \"GM\" reference in the extension to \"Arbitrator\"",
      "Fixed a data-loss bug where importing a JSON sheet (or, in the standalone editor, loading a file / starting a new sheet) could be silently overwritten moments later by a stale auto-save left over from an edit made just before the import",
      "Fixed JSON export — it now triggers a real file download instead of opening the raw JSON in a tab and relying on the browser's Save As, which wasn't reliably writing the file to disk",
    ],
  },
  {
    version: "v0.9",
    notes: [
      "Added a per-weapon \"Extra DMG Dice / Hit\" effect (e.g. the Gnawing Daemon Weapon trait) — rolls that many additional DMG dice for every HIT that lands",
      "Added a Charge button to the Tables tab — rolls MOV + d10/2 (rounded down) and shows your max possible Charge move",
    ],
  },
  {
    version: "v0.8",
    notes: [
      "Added a simple Dice Roller to the Tables tab — tap d4/d6/d8/d10/d12/d20/d100 to build a pool, then Roll (results post to the shared Log)",
      "Fixed weapon row column alignment on the Sheet tab when locked",
    ],
  },
  {
    version: "v0.7",
    notes: [
      "Added the About tab (usage guide, changelog, feedback button)",
      "Deployed to a custom domain (void-born.com) via Cloudflare Workers",
      "Added CORS support so the manifest loads reliably for all players",
    ],
  },
  {
    version: "v0.6",
    notes: [
      "Added JPEG export — render your sheet as an image to share outside Owlbear Rodeo",
      "Added the Arbitrator Roster tab — view-only overview of the party",
    ],
  },
  {
    version: "v0.5",
    notes: [
      "Added searchable catalogs for weapons, wargear, and abilities (\"Add From Catalog\")",
      "Automated bonus engine — abilities like Scalpel, Wary, Master Crafted, Trained, and Blast Away now apply automatically",
      "DMG fields support formulas (e.g. \"STR+2\") evaluated at roll time",
    ],
  },
  {
    version: "v0.4",
    notes: [
      "Added the Pop Out button — open the sheet in its own browser window",
    ],
  },
  {
    version: "v0.3",
    notes: [
      "Added the shared Log tab — every roll in the room is visible to all players",
      "Added the Tables tab — Critical Hit/Fail, Injury, Vehicle Damage, Hallucinations, Perils of the Warp, and Corruption tables",
      "Added the Luck Coin flip",
    ],
  },
  {
    version: "v0.2",
    notes: [
      "Added combat rolling — multi-die ATK pools, D10 attribute tests, situational modifiers, and separate ATK/DMG roll steps",
    ],
  },
  {
    version: "v0.1",
    notes: [
      "Initial character sheet — attributes, weapons, abilities & wargear, background, injuries/bonds/gold, and edit/lock mode",
    ],
  },
];

export function renderAbout(container: HTMLElement) {
  container.innerHTML = "";

  const overview = document.createElement("div");
  overview.className = "panel";

  const title = document.createElement("h2");
  title.textContent = "About Void Born Tools";
  overview.appendChild(title);

  const intro = document.createElement("p");
  intro.textContent =
    "This extension is your character sheet, dice roller, and shared table for Void Born games run on Owlbear Rodeo.";
  overview.appendChild(intro);

  const sections: { heading: string; body: string }[] = [
    {
      heading: "Sheet",
      body: "Your character sheet. Click an attribute box or a weapon's roll button to make a D10 test — a 0 is always a critical success, a 9 is always a critical fail. Use the Edit / Lock toggle to switch between editing fields and rolling safely without bumping something by accident.",
    },
    {
      heading: "Tables",
      body: "Shared resolution tables (Critical Hit, Critical Fail, Injury, Vehicle Damage, Hallucinations, Perils of the Warp, Corruption), a Charge move calculator, the Luck & Chaos token pool, and a simple Dice Roller (d4-d20, d100) for anything off-sheet. Anyone can roll, and results post to the shared Log.",
    },
    {
      heading: "Log",
      body: "A live, shared history of every roll made in the room, visible to all players. The Arbitrator can clear it.",
    },
    {
      heading: "Roster",
      body: "Arbitrator-only. A read-only overview of the connected party.",
    },
    {
      heading: "Catalogs",
      body: "Use \"Add From Catalog\" on the Sheet tab to search and add weapons, wargear, and abilities instead of typing them by hand. Some abilities apply their bonuses automatically once added.",
    },
    {
      heading: "Pop Out & Export",
      body: "Use \"Pop Out\" to open your sheet in its own browser window alongside the Owlbear Rodeo tab. You can also export your sheet as a JPEG to share outside the game.",
    },
  ];

  for (const section of sections) {
    const h3 = document.createElement("h3");
    h3.textContent = section.heading;
    h3.style.marginBottom = "0.15rem";
    overview.appendChild(h3);

    const p = document.createElement("p");
    p.style.marginTop = "0";
    p.textContent = section.body;
    overview.appendChild(p);
  }

  container.appendChild(overview);

  const changelogPanel = document.createElement("div");
  changelogPanel.className = "panel";

  const changelogTitle = document.createElement("h2");
  changelogTitle.textContent = "Change Log";
  changelogPanel.appendChild(changelogTitle);

  for (const entry of CHANGELOG) {
    const versionHeader = document.createElement("h3");
    versionHeader.textContent = entry.version;
    versionHeader.style.marginBottom = "0.15rem";
    changelogPanel.appendChild(versionHeader);

    const list = document.createElement("ul");
    list.style.marginTop = "0";
    list.style.paddingLeft = "1.2rem";
    for (const note of entry.notes) {
      const li = document.createElement("li");
      li.textContent = note;
      list.appendChild(li);
    }
    changelogPanel.appendChild(list);
  }

  container.appendChild(changelogPanel);

  const feedbackPanel = document.createElement("div");
  feedbackPanel.className = "panel";

  const feedbackHint = document.createElement("div");
  feedbackHint.className = "empty-state";
  feedbackHint.style.padding = "0 0 0.5rem";
  feedbackHint.style.textAlign = "left";
  feedbackHint.textContent = "Found a bug or have an idea? Let us know.";
  feedbackPanel.appendChild(feedbackHint);

  const feedbackBtn = document.createElement("button");
  feedbackBtn.className = "btn";
  feedbackBtn.textContent = "Submit Feedback";
  feedbackBtn.addEventListener("click", () => {
    window.open(`${location.origin}/feedback.html`, "_blank");
  });
  feedbackPanel.appendChild(feedbackBtn);

  container.appendChild(feedbackPanel);
}