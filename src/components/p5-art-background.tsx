"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

// Curated generative color palettes
const PALETTES: string[][] = [
  ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"], // Sunset Warm
  ["#606c38", "#283618", "#fefae0", "#dda15e", "#bc6c25"], // Earth Forest
  ["#003049", "#d62828", "#f77f00", "#fcbf49", "#eae2b7"], // Retro Pop
  ["#ffbe0b", "#fb5607", "#ff006e", "#8338ec", "#3a86ff"], // Cyber Neon
  ["#0d1b2a", "#1b263b", "#415a77", "#778da9", "#e0e1dd"], // Midnight Steel
  ["#001219", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6"], // Oceanic Aqua
  ["#590d22", "#800f2f", "#a4133c", "#c9184a", "#ff4d6d"], // Velvet Berry
  ["#10002b", "#240046", "#3c096c", "#5a189a", "#7b2cbf"], // Deep Purple
  ["#d8f3dc", "#b7e4c7", "#95d5b2", "#74c69d", "#52b788"], // Mint Garden
  ["#f72585", "#b5179e", "#7209b7", "#560bad", "#480ca8"], // Synthwave
  ["#ccd5ae", "#e9edc9", "#fefae0", "#faedcd", "#d4a373"], // Organic Sage
  ["#012a4a", "#013a63", "#01497c", "#014f86", "#2a6f97"], // Deep Sea Blue
  ["#7f5539", "#9c6644", "#b08968", "#c9a87c", "#ddb892"], // Desert Clay
  ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2"], // Pine Greens
  ["#ff0a54", "#ff477e", "#ff7096", "#ff85a1", "#fbb1bd"], // Rose Quartz
  ["#3d348b", "#7678ed", "#f7b801", "#f18701", "#f35b04"], // Solar Flare
];

function hexToHSB(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const br = max * 100;
  return [h, s, br];
}

// p5.js 2.3.4 splineVertex helper with fallback
function addCurveVertex(p: any, x: number, y: number) {
  if (typeof p.splineVertex === "function") {
    p.splineVertex(x, y);
  } else if (typeof p.curveVertex === "function") {
    p.curveVertex(x, y);
  } else {
    p.vertex(x, y);
  }
}

export function P5ArtBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let destroyed = false;

    async function loadAndStart() {
      if (destroyed || !containerRef.current) return;

      let P5Constructor: any = null;

      try {
        const p5Module = await import("p5");
        P5Constructor = p5Module.default || p5Module;
      } catch {
        if (typeof window !== "undefined" && (window as any).p5) {
          P5Constructor = (window as any).p5;
        } else {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.min.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load p5 from CDN"));
            document.head.appendChild(script);
          });
          P5Constructor = (window as any).p5;
        }
      }

      if (destroyed || !containerRef.current || !P5Constructor) return;

      const sketch = (p: any) => {
        let noiseTime = Math.random() * 10000;

        function generateArt() {
          const W = p.width;
          const H = p.height;
          if (W <= 0 || H <= 0) return;

          // Pick two distinct random palettes
          const pal1 = PALETTES[Math.floor(p.random(PALETTES.length))];
          let pal2 = PALETTES[Math.floor(p.random(PALETTES.length))];
          if (pal1 === pal2) {
            pal2 = PALETTES[(PALETTES.indexOf(pal1) + 1) % PALETTES.length];
          }
          const allColors = [...pal1, ...pal2];

          // Precompute HSB values once
          const hsbColors = allColors.map(hexToHSB);
          const pal1HSB = pal1.map(hexToHSB);
          const pal2HSB = pal2.map(hexToHSB);

          // Flow field & color noise resolutions
          const rez1 = p.random(0.001, 0.0028);
          const rez2 = p.random(0.001, 0.0035);
          noiseTime += 10000;

          // Set HSB color mode once for the entire render
          p.colorMode(p.HSB, 360, 100, 100, 255);

          // 1. Dark background
          const bgHSB = pal1HSB[Math.floor(p.random(pal1HSB.length))];
          p.background(bgHSB[0], bgHSB[1] * 0.45, Math.max(8, bgHSB[2] * 0.22));

          // 2. Layered flowing background waves
          p.noStroke();
          const numWaves = Math.floor(p.random(2, 4));
          for (let i = 0; i < numWaves; i++) {
            const wHSB = pal1HSB[Math.floor(p.random(pal1HSB.length))];
            p.fill(wHSB[0], wHSB[1] * 0.55, Math.max(12, wHSB[2] * 0.35), 65);
            p.push();
            p.translate(W / 2, H / 2);
            p.rotate(p.random(Math.PI * 2));
            p.beginShape();
            addCurveVertex(p, -W, H);
            addCurveVertex(p, -W, H);
            addCurveVertex(p, -W, p.random(-H * 0.35, H * 0.35));
            addCurveVertex(p, -W / 3, p.random(-H * 0.4, H * 0.4));
            addCurveVertex(p, W / 3, p.random(-H * 0.4, H * 0.4));
            addCurveVertex(p, W, p.random(-H * 0.35, H * 0.35));
            addCurveVertex(p, W, H);
            addCurveVertex(p, W, H);
            p.endShape(p.CLOSE);
            p.pop();
          }

          // 3. Ambient soft accent circles
          const numCircles = Math.floor(p.random(2, 4));
          for (let i = 0; i < numCircles; i++) {
            const cHSB = pal2HSB[Math.floor(p.random(pal2HSB.length))];
            p.fill(cHSB[0], cHSB[1] * 0.75, cHSB[2] * 0.7, 40);
            p.noStroke();
            const minDim = Math.min(W, H);
            const diam = p.random(minDim * 0.2, minDim * 0.45);
            p.circle(p.random(W), p.random(H), diam);
          }

          // 4. Centers of rotation for vortex flow influence
          const centers = [
            { x: p.random(W * 0.2, W * 0.8), y: p.random(H * 0.2, H * 0.8), weight: p.random(0.4, 0.8) },
            { x: p.random(W * 0.1, W * 0.9), y: p.random(H * 0.1, H * 0.9), weight: p.random(0.3, 0.6) },
          ];

          // 5. Balanced shape count (650 shapes - fast and dense)
          const baseScale = Math.min(W, H) / 750;
          const sclStart = p.random(1.2, 2.2) * baseScale;
          const tries = 650;
          const minScale = 0.25 * baseScale;
          const sclReduct = (sclStart / tries) * 1.2;
          let currentScale = sclStart;
          const midLeaf = p.random(-1.4, 1.4);

          // Stroke setup
          const strokeType = p.random(3);
          if (strokeType < 1.0) {
            p.noStroke();
          } else if (strokeType < 2.3) {
            p.stroke(0, 0, 0, 30);
            p.strokeWeight(0.5);
          } else {
            p.stroke(0, 0, 100, 20);
            p.strokeWeight(0.5);
          }

          // 6. Draw flow-field shapes
          for (let i = 0; i < tries; i++) {
            currentScale -= sclReduct;
            if (currentScale < minScale) currentScale = minScale;

            const x = p.random(W);
            const y = p.random(H);

            const n1 = p.noise(x * rez1 + noiseTime, y * rez1 + noiseTime);
            const n2 = p.noise(x * rez2 + noiseTime + 10000, y * rez2 + noiseTime + 10000);

            let ang = n1 * Math.PI * 2;
            for (const c of centers) {
              ang += Math.atan2(y - c.y, x - c.x) * c.weight * 0.5;
            }

            const maxDim = Math.min(W, H) * 0.25;
            const w = Math.min(p.random(18, 52) * currentScale, maxDim);
            const h = Math.min(p.random(36, 100) * currentScale, maxDim);

            const colorIdx = Math.floor(n2 * hsbColors.length) % hsbColors.length;
            const [hBase, sBase, bBase] = hsbColors[colorIdx];

            p.fill(
              (hBase + p.random(-8, 8) + 360) % 360,
              Math.min(100, sBase * p.random(1.05, 1.25)),
              Math.min(100, bBase * p.random(0.75, 0.95)),
              p.random(160, 230)
            );

            p.push();
            p.translate(x, y);
            p.rotate(ang);

            const shapeChoice = p.random(1);
            if (shapeChoice < 0.2) {
              p.circle(0, 0, Math.min(w, h));
            } else if (shapeChoice < 0.5) {
              p.rectMode(p.CENTER);
              p.rect(0, 0, w, h, 4);
            } else {
              // Steve's Makerspace organic petal / leaf curve using p5 2.3.4 splineVertex
              p.beginShape();
              addCurveVertex(p, 0, h / 2);
              addCurveVertex(p, 0, h / 2);
              addCurveVertex(p, -w / 2, (h / 10) * midLeaf);
              addCurveVertex(p, 0, -h / 2);
              addCurveVertex(p, w / 2, (h / 10) * midLeaf);
              addCurveVertex(p, 0, h / 2);
              addCurveVertex(p, 0, h / 2);
              p.endShape(p.CLOSE);
            }

            p.pop();
          }

          p.colorMode(p.RGB);
        }

        p.setup = () => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const w = Math.max(rect.width, window.innerWidth);
          const h = Math.max(rect.height, window.innerHeight);

          const canvas = p.createCanvas(w, h);
          canvas.parent(containerRef.current);
          p.pixelDensity(1);
          p.noLoop();
          generateArt();
        };

        p.windowResized = () => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const w = Math.max(rect.width, window.innerWidth);
          const h = Math.max(rect.height, window.innerHeight);
          p.resizeCanvas(w, h);
          generateArt();
        };

        (p as any)._generateArt = generateArt;
      };

      p5InstanceRef.current = new P5Constructor(sketch);

      // Recursive self-scheduling timer that guarantees no frame queueing
      function scheduleNext() {
        if (destroyed) return;
        timerRef.current = setTimeout(() => {
          if (!destroyed && p5InstanceRef.current?._generateArt) {
            p5InstanceRef.current._generateArt();
          }
          scheduleNext();
        }, 500);
      }

      scheduleNext();
    }

    loadAndStart();

    return () => {
      destroyed = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (p5InstanceRef.current) {
        try {
          p5InstanceRef.current.remove();
        } catch {
          // ignore cleanup errors
        }
        p5InstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-[100dvh] overflow-hidden pointer-events-none select-none z-0"
    >
      {!mounted && <div className="absolute inset-0 bg-zinc-950" />}
    </div>
  );
}
