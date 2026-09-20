import fs from "node:fs";

const inputPath =
  "./public/footer-original.svg";

const outputPath =
  "./public/landzo-bottom-nav.png";

const svg =
  fs.readFileSync(
    inputPath,
    "utf8",
  );

const match =
  svg.match(
    /(?:xlink:href|href)="data:image\/png;base64,([^"]+)"/,
  );

if (!match) {
  throw new Error(
    "Embedded PNG was not found inside the SVG.",
  );
}

const pngBuffer =
  Buffer.from(
    match[1],
    "base64",
  );

fs.writeFileSync(
  outputPath,
  pngBuffer,
);

console.log(
  `Created ${outputPath}`,
);