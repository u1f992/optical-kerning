// @ts-check

import fs from "node:fs";

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath("NotoSerifCJKjp-VF.ttf", "Noto Serif JP");

/**
 * @param {import("@napi-rs/canvas").CanvasRenderingContext2D} context
 * @param {string} strokeStyle
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 */
function drawLine(context, strokeStyle, fromX, fromY, toX, toY) {
  const oldStrokeStyle = context.strokeStyle;
  context.strokeStyle = strokeStyle;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.strokeStyle = oldStrokeStyle;
}

const char1 = "丁";
const char2 = "。";

const FONT_SIZE = 32;
const CANVAS_WIDTH = 128;
const CANVAS_HEIGHT = FONT_SIZE * 2 * 1; // 64;
const MARGIN = 16;

const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
const context = canvas.getContext("2d");
context.fillStyle = "#000000";
context.textBaseline = "middle";
context.font = `normal 400 ${FONT_SIZE}px "Noto Serif JP"`;

const { width: char1Width } = context.measureText(char1);
context.fillText(char1, 0, FONT_SIZE);
const center = Math.ceil(char1Width) + MARGIN;
context.fillText(char2, center + MARGIN, FONT_SIZE);

drawLine(context, "red", 0, FONT_SIZE, CANVAS_WIDTH, FONT_SIZE);
drawLine(context, "blue", center, 0, center, CANVAS_HEIGHT);

fs.writeFileSync("original.png", canvas.toBuffer("image/png"));
