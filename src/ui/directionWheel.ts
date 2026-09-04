import { COMPASS_DIRECTIONS, rollDirection, buildDirectionLogEntry } from "../dice";
import type { DirectionResult } from "../dice";
import type { RollLogEntry } from "../types";

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 100;
const LABEL_RADIUS = 78;
const NEEDLE_LENGTH = 88;
const SECTOR_ANGLE = 360 / COMPASS_DIRECTIONS.length; // 22.5deg
const SPIN_MS = 3200;
const EXTRA_SPINS = 5;

// Persisted at module scope (not inside buildDirectionWheelPanel) so the
// needle's resting position and the last result survive a fresh call to
// this function - e.g. switching away from the Tables tab and back, which
// tears down and rebuilds the whole panel's DOM.
let cumulativeRotation = 0;
let lastResult: DirectionResult | null = null;

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

function buildWheelSvg(): { svg: SVGSVGElement; needleGroup: SVGGElement } {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
  svg.classList.add("direction-wheel-svg");

  // Static compass face - sectors and labels never move. Only the needle
  // (added below) rotates to point at the result.
  COMPASS_DIRECTIONS.forEach((label, i) => {
    const startAngle = i * SECTOR_ANGLE;
    const endAngle = startAngle + SECTOR_ANGLE;
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", describeSectorPath(startAngle, endAngle));
    path.setAttribute("fill", i % 2 === 0 ? "#ffffff" : "#111111");
    path.setAttribute("stroke", "#111111");
    path.setAttribute("stroke-width", "1");
    svg.appendChild(path);

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
    svg.appendChild(text);
  });

  // Needle - a single group, pivoted at the center, that rotates to point
  // at the spun result. Starts wherever it last landed (see cumulativeRotation).
  const needleGroup = document.createElementNS(ns, "g") as SVGGElement;
  needleGroup.classList.add("direction-wheel-needle");
  (needleGroup.style as any).transformOrigin = `${CENTER}px ${CENTER}px`;
  needleGroup.style.transform = `rotate(${cumulativeRotation}deg)`;

  const needleTipY = CENTER - NEEDLE_LENGTH;
  const needle = document.createElementNS(ns, "path");
  needle.setAttribute(
    "d",
    `M ${CENTER - 7} ${CENTER} L ${CENTER} ${needleTipY} L ${CENTER + 7} ${CENTER} Z`
  );
  needle.setAttribute("fill", "#7a1f1f");
  needle.setAttribute("stroke", "#111111");
  needle.setAttribute("stroke-width", "1");
  needleGroup.appendChild(needle);

  // Short tail on the opposite side, purely decorative (typical compass-needle look).
  const tail = document.createElementNS(ns, "path");
  const tailY = CENTER + NEEDLE_LENGTH * 0.28;
  tail.setAttribute("d", `M ${CENTER - 4} ${CENTER} L ${CENTER} ${tailY} L ${CENTER + 4} ${CENTER} Z`);
  tail.setAttribute("fill", "#3a3a3a");
  tail.setAttribute("stroke", "#111111");
  tail.setAttribute("stroke-width", "1");
  needleGroup.appendChild(tail);

  svg.appendChild(needleGroup);

  // Hub, drawn last so it sits on top of the needle's pivot point.
  const hub = document.createElementNS(ns, "circle");
  hub.setAttribute("cx", String(CENTER));
  hub.setAttribute("cy", String(CENTER));
  hub.setAttribute("r", "8");
  hub.setAttribute("fill", "#111111");
  hub.setAttribute("stroke", "#7a1f1f");
  hub.setAttribute("stroke-width", "1.5");
  svg.appendChild(hub);

  return { svg, needleGroup };
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
  const { svg, needleGroup } = buildWheelSvg();
  wheelWrap.appendChild(svg);
  panel.appendChild(wheelWrap);

  const resultLabel = document.createElement("div");
  resultLabel.className = "direction-wheel-result";
  // Rehydrate the last result on re-render instead of resetting to "-".
  resultLabel.textContent = lastResult ? `Direction: ${lastResult.label}` : "-";
  panel.appendChild(resultLabel);

  const spinBtn = document.createElement("button");
  spinBtn.className = "btn";
  spinBtn.textContent = "Spin";
  panel.appendChild(spinBtn);

  let spinning = false;

  spinBtn.addEventListener("click", () => {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;

    const result = rollDirection();
    const targetAngle = result.index * SECTOR_ANGLE; // needle's resting angle, from top, clockwise
    const currentMod = ((cumulativeRotation % 360) + 360) % 360;
    let delta = targetAngle - currentMod;
    if (delta <= 0) delta += 360;
    cumulativeRotation += EXTRA_SPINS * 360 + delta;

    needleGroup.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`;
    needleGroup.style.transform = `rotate(${cumulativeRotation}deg)`;

    window.setTimeout(() => {
      spinning = false;
      spinBtn.disabled = false;
      lastResult = result;
      resultLabel.textContent = `Direction: ${result.label}`;
      const entry = buildDirectionLogEntry(playerName, result);
      onRoll(entry);
    }, SPIN_MS + 100);
  });

  return panel;
}
