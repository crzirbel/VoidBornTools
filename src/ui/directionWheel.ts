import { COMPASS_DIRECTIONS, rollDirection, buildDirectionLogEntry } from "../dice";
import type { RollLogEntry } from "../types";

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 100;
const LABEL_RADIUS = 78;
const SECTOR_ANGLE = 360 / COMPASS_DIRECTIONS.length; // 22.5deg
const SPIN_MS = 3200;

function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  // angleDeg is measured clockwise from straight up (N), matching a compass.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function describeSectorPath(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(startAngle, RADIUS);
  const end = polarToCartesian(endAngle, RADIUS);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${CENTER} ${CENTER} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function buildWheelSvg(): { svg: SVGSVGElement; wheelGroup: SVGGElement } {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE + 22}`);
  svg.classList.add("direction-wheel-svg");

  const wheelGroup = document.createElementNS(ns, "g") as SVGGElement;
  wheelGroup.classList.add("direction-wheel-group");
  (wheelGroup.style as any).transformOrigin = `${CENTER}px ${CENTER}px`;
  wheelGroup.style.transform = "rotate(0deg)";

  COMPASS_DIRECTIONS.forEach((label, i) => {
    const startAngle = i * SECTOR_ANGLE;
    const endAngle = startAngle + SECTOR_ANGLE;
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", describeSectorPath(startAngle, endAngle));
    path.setAttribute("fill", i % 2 === 0 ? "#ffffff" : "#111111");
    path.setAttribute("stroke", "#111111");
    path.setAttribute("stroke-width", "1");
    wheelGroup.appendChild(path);

    const centerAngle = startAngle + SECTOR_ANGLE / 2;
    const pos = polarToCartesian(centerAngle, LABEL_RADIUS);
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", pos.x.toFixed(2));
    text.setAttribute("y", pos.y.toFixed(2));
    text.setAttribute("fill", i % 2 === 0 ? "#111111" : "#ffffff");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", label.length > 2 ? "8" : "10");
    text.setAttribute("font-family", "var(--font-heading), sans-serif");
    text.setAttribute("transform", `rotate(${centerAngle} ${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`);
    text.textContent = label;
    wheelGroup.appendChild(text);
  });

  // Hub
  const hub = document.createElementNS(ns, "circle");
  hub.setAttribute("cx", String(CENTER));
  hub.setAttribute("cy", String(CENTER));
  hub.setAttribute("r", "10");
  hub.setAttribute("fill", "#7a1f1f");
  hub.setAttribute("stroke", "#111111");
  hub.setAttribute("stroke-width", "1.5");
  wheelGroup.appendChild(hub);

  svg.appendChild(wheelGroup);

  // Fixed pointer, doesn't rotate - marks which sector is "selected" at top.
  const pointer = document.createElementNS(ns, "path");
  const tipY = CENTER - RADIUS - 2;
  pointer.setAttribute("d", `M ${CENTER - 9} ${tipY - 2} L ${CENTER + 9} ${tipY - 2} L ${CENTER} ${tipY + 16} Z`);
  pointer.setAttribute("fill", "#7a1f1f");
  pointer.setAttribute("stroke", "#111111");
  pointer.setAttribute("stroke-width", "1");
  svg.appendChild(pointer);

  return { svg, wheelGroup };
}

export function buildDirectionWheelPanel(
  playerName: string,
  onRoll: (entry: RollLogEntry) => void
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "panel";

  const title = document.createElement("h2");
  title.textContent = "Scatter Direction";
  panel.appendChild(title);

  const hint = document.createElement("div");
  hint.className = "empty-state";
  hint.style.padding = "0 0 0.5rem";
  hint.style.textAlign = "left";
  hint.textContent = "For blast weapons, ejections, and other scatter effects. Spin for a random direction.";
  panel.appendChild(hint);

  const wheelWrap = document.createElement("div");
  wheelWrap.className = "direction-wheel-wrap";
  const { svg, wheelGroup } = buildWheelSvg();
  wheelWrap.appendChild(svg);
  panel.appendChild(wheelWrap);

  const resultLabel = document.createElement("div");
  resultLabel.className = "direction-wheel-result";
  resultLabel.textContent = "—";
  panel.appendChild(resultLabel);

  const spinBtn = document.createElement("button");
  spinBtn.className = "btn";
  spinBtn.textContent = "Spin";
  panel.appendChild(spinBtn);

  let cumulativeRotation = 0;
  let spinning = false;

  spinBtn.addEventListener("click", () => {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;

    const result = rollDirection();
    const sectorCenterAngle = result.index * SECTOR_ANGLE; // from top, clockwise
    // Rotating the wheel by R moves a point that started at angle A to
    // angle (A + R) mod 360. We want the chosen sector's center to land
    // under the fixed pointer (angle 0), so R must satisfy A + R = 0 (mod 360).
    const targetMod = ((360 - sectorCenterAngle) % 360 + 360) % 360;
    const currentMod = ((cumulativeRotation % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    const EXTRA_SPINS = 5;
    cumulativeRotation += EXTRA_SPINS * 360 + delta;

    wheelGroup.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`;
    wheelGroup.style.transform = `rotate(${cumulativeRotation}deg)`;

    window.setTimeout(() => {
      spinning = false;
      spinBtn.disabled = false;
      resultLabel.textContent = `Direction: ${result.label}`;
      const entry = buildDirectionLogEntry(playerName, result);
      onRoll(entry);
    }, SPIN_MS + 100);
  });

  return panel;
}
