type ChangelogEntry = {
  version: string;
  notes: string[];
};

const CHANGELOG: ChangelogEntry[] = [
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
      "Added the GM Roster tab — view-only overview of the party",
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
      body: "Shared resolution tables (Critical Hit, Critical Fail, Injury, Vehicle Damage, Hallucinations, Perils of the Warp, Corruption) plus the Luck Coin flip. Anyone can roll on these, and results post to the shared Log.",
    },
    {
      heading: "Log",
      body: "A live, shared history of every roll made in the room, visible to all players. The GM can clear it.",
    },
    {
      heading: "Roster",
      body: "GM-only. A read-only overview of the connected party.",
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