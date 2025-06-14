// @ts-check

import fs from "node:fs";

import { calculateKerning, _exportSpacingCache } from "../dist/new.js";
import { pairwise } from "../dist/util.js";

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath("NotoSerifCJKjp-VF.ttf", "Noto Serif JP");
GlobalFonts.registerFromPath(
  "ZenKakuGothicAntique-Regular.ttf",
  "Zen Kaku Gothic Antique",
);
const font = {
  fontFamily: "Noto Serif JP", // "Zen Kaku Gothic Antique",
  fontStyle: "normal",
  fontWeight: "400",
};
const text =
  "´・丁。十ニニヨトフトニーダイニングテーブル「ティーポット」くっつく、旅行日記。I'll WARN. Try Office. Y.T. 010C-]";
const factor = 0.5;

const segments = new Intl.Segmenter("ja").segment(text);
const html =
  Array.from(pairwise(segments)).reduce(
    (html, [{ segment: g0 }, { segment: g1 }]) => {
      const kerning = calculateKerning(
        g0,
        g1,
        font,
        // @ts-ignore
        () => createCanvas(0, 0),
      );
      return (
        html +
        `<span style="letter-spacing: ${kerning === null ? "normal" : "-" + kerning * factor + "em"}">${g0}</span>`
      );
    },
    `<html lang="ja">
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200..900&display=swap" rel="stylesheet">
</head>
<body>
  <p style="font-family: 'Noto Serif JP'">${text}</p>
  <p style="font-family: 'Noto Serif JP'">`,
  ) +
  [...segments].at(-1)?.segment +
  "</p></body></html>";

fs.writeFileSync("example.html", html, { encoding: "utf-8" });
fs.writeFileSync("cache.json", _exportSpacingCache());
