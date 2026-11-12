const assert = require("node:assert");
const { test } = require("node:test");

const Parser = require("tree-sitter");

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require(".")));
});

test("parses a media playlist", () => {
  const parser = new Parser();
  parser.setLanguage(require("."));
  const tree = parser.parse("#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:3.84,\nsegment-1.mp4\n");
  assert.equal(tree.rootNode.hasError, false);
  assert.equal(tree.rootNode.descendantsOfType("media_segment").length, 1);
});
