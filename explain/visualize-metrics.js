// @ts-check

import fs from "node:fs";

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath("NotoSerifCJKjp-VF.ttf", "Noto Serif JP");
GlobalFonts.registerFromPath(
  "ZenKakuGothicAntique-Regular.ttf",
  "Zen Kaku Gothic Antique",
);

/**
 * @param {import("@napi-rs/canvas").Canvas} canvas
 * @param {string} strokeStyle
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 */
function drawLine(canvas, strokeStyle, fromX, fromY, toX, toY) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const oldStrokeStyle = context.strokeStyle;
  context.strokeStyle = strokeStyle;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.strokeStyle = oldStrokeStyle;
}
/**
 * @param {import("@napi-rs/canvas").Canvas} canvas
 * @param {string} strokeStyle
 * @param {number} y
 */
function drawHorizontalLine(canvas, strokeStyle, y) {
  drawLine(canvas, strokeStyle, 0, y, canvas.width, y);
}
/**
 * @param {import("@napi-rs/canvas").Canvas} canvas
 * @param {string} strokeStyle
 * @param {number} x
 */
function drawVerticalLine(canvas, strokeStyle, x) {
  drawLine(canvas, strokeStyle, x, 0, x, canvas.height);
}

const FONT_SIZE = 72 * 2;
const CANVAS_WIDTH = FONT_SIZE * 2;
const CANVAS_HEIGHT = FONT_SIZE * 2;
const START_X = FONT_SIZE * 0.5;
const START_Y = FONT_SIZE * 1.5;

const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
const context = canvas.getContext("2d");
context.fillStyle = "#000000";
// context.font = `normal 400 ${FONT_SIZE}px "Zen Kaku Gothic Antique"`;
context.font = `normal 400 ${FONT_SIZE}px "Noto Serif JP"`;

const text =
  "´・丁。十ニニヨトフトニーダイニングテーブル「ティーポット」くっつく、旅行日記。I'll WARN. Try Office. Y.T. 010C-]";
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
for (const { segment, index } of segmenter.segment(text)) {
  const {
    width,
    actualBoundingBoxLeft,
    actualBoundingBoxRight,
    fontBoundingBoxAscent,
    fontBoundingBoxDescent,
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
    emHeightAscent,
    emHeightDescent,
    hangingBaseline,
    alphabeticBaseline,
    ideographicBaseline,
  } = context.measureText(segment);
  console.log(
    JSON.stringify({
      segment,
      width,
      actualBoundingBoxLeft,
      actualBoundingBoxRight,
      fontBoundingBoxAscent,
      fontBoundingBoxDescent,
      actualBoundingBoxAscent,
      actualBoundingBoxDescent,
      emHeightAscent,
      emHeightDescent,
      hangingBaseline,
      alphabeticBaseline,
      ideographicBaseline,
    }),
  );
  context.fillText(segment, START_X, START_Y);

  const oldLineWidth = context.lineWidth;
  context.lineWidth = 1;

  drawVerticalLine(canvas, "gray", START_X);
  drawHorizontalLine(canvas, "gray", START_Y);

  let dashOffset = 0;
  context.setLineDash([3, 10]);
  drawVerticalLine(canvas, "maroon", START_X + width);
  context.lineDashOffset = dashOffset += 2;
  drawVerticalLine(canvas, "red", START_X - actualBoundingBoxLeft);
  context.lineDashOffset = dashOffset += 2;
  drawVerticalLine(canvas, "purple", START_X + actualBoundingBoxRight);
  context.setLineDash([]);

  dashOffset = 0;
  context.setLineDash([3, 10]);
  drawHorizontalLine(canvas, "fuchsia", START_Y - fontBoundingBoxAscent);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "green", START_Y + fontBoundingBoxDescent);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "lime", START_Y - actualBoundingBoxAscent);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "olive", START_Y + actualBoundingBoxDescent);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "yellow", START_Y - emHeightAscent);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "navy", START_Y + emHeightDescent);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "blue", START_Y - hangingBaseline);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "teal", START_Y - alphabeticBaseline);
  context.lineDashOffset = dashOffset += 2;
  drawHorizontalLine(canvas, "aqua", START_Y - ideographicBaseline);
  context.setLineDash([]);

  context.lineWidth = oldLineWidth;

  fs.writeFileSync(
    "img/" + index.toString() + ".png",
    canvas.toBuffer("image/png"),
  );
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
