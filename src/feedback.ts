import "./style.css";

const app = document.getElementById("app")!;

type FormState = "idle" | "submitting" | "success" | "error";

let state: FormState = "idle";
let errorMessage = "";

function render() {
  app.innerHTML = "";

  const header = document.createElement("div");
  header.style.borderBottom = "3px solid #000000";
  header.style.paddingBottom = "0.4rem";
  header.style.marginBottom = "0.75rem";
  const h1 = document.createElement("h1");
  h1.style.borderBottom = "none";
  h1.style.marginBottom = "0.3rem";
  h1.textContent = "Void Born Tools — Feedback";
  header.appendChild(h1);
  const note = document.createElement("div");
  note.className = "empty-state";
  note.style.textAlign = "left";
  note.style.padding = "0";
  note.textContent = "Found a bug or have an idea? Let us know below.";
  header.appendChild(note);
  app.appendChild(header);

  const panel = document.createElement("div");
  panel.className = "panel";

  if (state === "success") {
    const success = document.createElement("div");
    success.className = "empty-state";
    success.style.padding = "1rem 0";
    success.textContent = "Thanks! Your feedback has been submitted.";
    panel.appendChild(success);

    const again = document.createElement("button");
    again.className = "btn secondary";
    again.textContent = "Submit Another";
    again.addEventListener("click", () => {
      state = "idle";
      render();
    });
    panel.appendChild(again);

    app.appendChild(panel);
    return;
  }

  const form = document.createElement("form");
  form.style.display = "flex";
  form.style.flexDirection = "column";
  form.style.gap = "0.6rem";

  const titleLabel = document.createElement("label");
  titleLabel.textContent = "Title";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.required = true;
  titleInput.maxLength = 120;
  titleInput.placeholder = "Short summary, e.g. \"ATK roll button not working on Firefox\"";
  titleLabel.appendChild(titleInput);
  form.appendChild(titleLabel);

  const descLabel = document.createElement("label");
  descLabel.textContent = "Description";
  const descInput = document.createElement("textarea");
  descInput.required = true;
  descInput.rows = 6;
  descInput.placeholder = "What happened? What did you expect instead? Steps to reproduce if it's a bug.";
  descLabel.appendChild(descInput);
  form.appendChild(descLabel);

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Your Name (optional)";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 60;
  nameLabel.appendChild(nameInput);
  form.appendChild(nameLabel);

  // Honeypot: real users never see or fill this in; bots that
  // auto-fill every field will, and get silently dropped server-side.
  const honeypotLabel = document.createElement("label");
  honeypotLabel.style.position = "absolute";
  honeypotLabel.style.left = "-9999px";
  honeypotLabel.tabIndex = -1;
  const honeypotInput = document.createElement("input");
  honeypotInput.type = "text";
  honeypotInput.autocomplete = "off";
  honeypotInput.tabIndex = -1;
  honeypotLabel.appendChild(honeypotInput);
  form.appendChild(honeypotLabel);

  if (state === "error") {
    const err = document.createElement("div");
    err.className = "empty-state";
    err.style.color = "#a00";
    err.style.textAlign = "left";
    err.style.padding = "0";
    err.textContent = errorMessage || "Something went wrong. Please try again.";
    form.appendChild(err);
  }

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn";
  submitBtn.textContent = state === "submitting" ? "Submitting…" : "Submit Feedback";
  submitBtn.disabled = state === "submitting";
  form.appendChild(submitBtn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    state = "submitting";
    render();

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleInput.value.trim(),
          description: descInput.value.trim(),
          reporter: nameInput.value.trim(),
          honeypot: honeypotInput.value,
        }),
      });

      if (!res.ok) {
        throw new Error("Server rejected the submission");
      }

      state = "success";
      render();
    } catch (err) {
      state = "error";
      errorMessage = String(err);
      render();
    }
  });

  panel.appendChild(form);
  app.appendChild(panel);
}

render();