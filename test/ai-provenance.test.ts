import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  serializeXmp,
  parseXmp,
  writeMetadata,
  readMetadata,
  DIGITAL_SOURCE_TYPE,
} from "../src/index.ts";

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))),
  );

const AI = {
  description: "A neon-lit street market at night in the rain",
  digitalSourceType: DIGITAL_SOURCE_TYPE.trainedAlgorithmicMedia,
  ai: {
    prompt:
      "neon street market, rain reflections, cinematic 35mm, negative prompt: people",
    promptWriter: "Jane Doe",
    system: "DALL-E via Bing Image Creator",
    systemVersion: "3",
  },
};

test("serialize→parse round-trips all AI provenance fields", () => {
  assert.deepEqual(parseXmp(serializeXmp(AI)), AI);
});

test("emits the exact IPTC 2025.1 property names and Extension namespace", () => {
  const xmp = serializeXmp(AI);
  assert.match(
    xmp,
    /xmlns:Iptc4xmpExt="http:\/\/iptc\.org\/std\/Iptc4xmpExt\/2008-02-29\/"/,
  );
  assert.match(xmp, /<Iptc4xmpExt:AIPromptInformation>.*<\/Iptc4xmpExt:AIPromptInformation>/);
  assert.match(xmp, /<Iptc4xmpExt:AIPromptWriterName>Jane Doe<\/Iptc4xmpExt:AIPromptWriterName>/);
  assert.match(xmp, /<Iptc4xmpExt:AISystemUsed>DALL-E via Bing Image Creator<\/Iptc4xmpExt:AISystemUsed>/);
  assert.match(xmp, /<Iptc4xmpExt:AISystemVersionUsed>3<\/Iptc4xmpExt:AISystemVersionUsed>/);
  assert.match(
    xmp,
    /<Iptc4xmpExt:DigitalSourceType>http:\/\/cv\.iptc\.org\/newscodes\/digitalsourcetype\/trainedAlgorithmicMedia<\/Iptc4xmpExt:DigitalSourceType>/,
  );
});

test("partial ai object round-trips (system only)", () => {
  const meta = { ai: { system: "Google Gemini" } };
  assert.deepEqual(parseXmp(serializeXmp(meta)), meta);
});

test("digitalSourceType works without ai fields (non-AI images too)", () => {
  const meta = { digitalSourceType: DIGITAL_SOURCE_TYPE.digitalCapture };
  assert.deepEqual(parseXmp(serializeXmp(meta)), meta);
});

test("prompts with XML special characters are escaped and round-trip", () => {
  const meta = {
    ai: {
      prompt: 'a "cat & dog" poster, <bold> typography, aspect 16:9',
    },
  };
  assert.deepEqual(parseXmp(serializeXmp(meta)), meta);
});

test("AI fields survive a real WebP write/read round-trip", () => {
  const out = writeMetadata(fixture("simple.webp"), AI);
  assert.deepEqual(readMetadata(out), AI);
});

test("AI fields survive a real AVIF write/read round-trip", () => {
  const out = writeMetadata(fixture("sample.avif"), AI);
  assert.deepEqual(readMetadata(out), AI);
});

test("AI fields survive a real HEIC write/read round-trip", () => {
  const out = writeMetadata(fixture("sample.heic"), AI);
  assert.deepEqual(readMetadata(out), AI);
});

test("AI fields survive a real JPEG write/read round-trip", () => {
  const out = writeMetadata(fixture("sample.jpg"), AI);
  assert.deepEqual(readMetadata(out), AI);
});

test("AI fields survive a real PNG write/read round-trip", () => {
  const out = writeMetadata(fixture("sample.png"), AI);
  assert.deepEqual(readMetadata(out), AI);
});

test("no AI fields → none emitted, no `ai` key on read (backward compatible)", () => {
  const xmp = serializeXmp({ description: "plain" });
  assert.ok(!/Iptc4xmpExt:AI/.test(xmp));
  assert.ok(!/Iptc4xmpExt:DigitalSourceType/.test(xmp));
  const out = parseXmp(xmp);
  assert.deepEqual(out, { description: "plain" });
  assert.ok(!("ai" in out));
});
