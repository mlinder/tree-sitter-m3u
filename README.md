# tree-sitter-m3u

[Tree-sitter](https://tree-sitter.github.io/) grammar for
[M3U](https://en.wikipedia.org/wiki/M3U) playlists (`.m3u`, and `.m3u8` for
UTF-8 encoded ones), covering:

- plain M3U (one media path or URL per line)
- Extended M3U: `#EXTM3U`, `#EXTINF`, `#PLAYLIST`, `#EXTGRP`, `#EXTALB`,
  M3A and VLC directives, and IPTV `tvg-*` attributes
- HTTP Live Streaming (HLS), including every tag in
  [draft-pantos-hls-rfc8216bis-22](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-22)
  (1 May 2026; the WWDC 2026 edition adds no tags), such as Low-Latency HLS
  and `{$variable}` substitution

Directives are parsed generically (`#EXT…` name plus attribute list), so tags
added in later revisions of the HLS specification parse without grammar
changes.

## Syntax tree

```
(playlist
  (header)                      ; #EXTM3U
  (tag (tag_name) (tag_content  ; #EXT-X-VERSION:7, #EXT-X-MEDIA:…
    (attribute name: (tag_word)
      value: (unquoted_value | quoted_string | resolution))))
  (tag (tag_name) (tag_content  ; #EXT-X-BYTERANGE:1024@256000
    (byte_range length: (integer) offset: (integer))))
  (variant_stream               ; #EXT-X-STREAM-INF and its URI line
    (tag …)
    uri: (uri))
  (media_segment                ; segment tags, #EXTINF, URI line
    program_date_time: (tag …)  ; #EXT-X-PROGRAM-DATE-TIME
    (tag …)*                    ; #EXT-X-KEY, -MAP, -PART, …
    (extinf duration: (duration) (attribute)* title: (title))
    (tag …)*
    uri: (uri))
  (uri (escape_sequence)*)      ; plain M3U entry, %20 escapes
  (comment))
```

`resolution` (`RESOLUTION=1280x720`) has `width` and `height` fields, also
`integer` nodes. Quoted values (`BYTERANGE="1024@0"`) stay `quoted_string`.

`variant_stream` and `media_segment` group a tag with the URI it applies to,
with any comments and blank lines in between. A media segment is "a series
of Media Segment tags followed by a URI" (draft-pantos-hls-rfc8216bis
4.4.4), so it starts at the first segment tag after the previous URI:
`#EXT-X-PROGRAM-DATE-TIME`, `-BYTERANGE`, `-DISCONTINUITY`, `-KEY`, `-MAP`,
`-GAP`, `-BITRATE` or `-PART` (Low-Latency HLS parts thus sit in their parent
segment). Other tags, such as `#EXT-X-DATERANGE` or `#EXT-X-ENDLIST`, stay
on their own before the `#EXTINF`; after it, any tag up to the URI belongs
to the segment. Without a following URI, a segment ends at its `#EXTINF`,
and segment tags with no `#EXTINF` after them (the last parts of a live
playlist) stay on their own. `#EXT-X-KEY`, `-MAP` and `-BITRATE` also apply
to later segments; the tree only shows where they appear.

Used by the [M3U extension for Zed](https://github.com/mlinder/zed-m3u).
`queries/highlights.scm` is its highlight query, with Zed's capture names,
for other tree-sitter hosts.

## Use

```sh
npm install tree-sitter-m3u
```

In Node, with [`tree-sitter`](https://www.npmjs.com/package/tree-sitter)
0.25 or later:

```js
const Parser = require('tree-sitter')
const M3u = require('tree-sitter-m3u')

const parser = new Parser()
parser.setLanguage(M3u)
const tree = parser.parse('#EXTM3U\n#EXTINF:4,\nsegment.ts\n')
```

The package ships prebuilt binaries for Linux, macOS and Windows (x64 and
arm64), so installing it compiles nothing.

In browsers, with
[`web-tree-sitter`](https://www.npmjs.com/package/web-tree-sitter) 0.25 or
later, load `tree-sitter-m3u.wasm`, also in the package. With Vite:

```js
import { Language, Parser, Query } from 'web-tree-sitter'
import wasmUrl from 'tree-sitter-m3u/tree-sitter-m3u.wasm?url'
import highlights from 'tree-sitter-m3u/queries/highlights.scm?raw'

await Parser.init()
const language = await Language.load(wasmUrl)
const query = new Query(language, highlights)
```

## Development

```sh
pnpm install        # also builds the Node binding
pnpm run generate   # regenerate src/ from grammar.js
pnpm test           # corpus tests, examples/, Node binding
pnpm run build:wasm # tree-sitter-m3u.wasm
```

A `v*` tag builds the binaries and the Wasm file and publishes to npm
(`.github/workflows/release.yml`).

## License

[MIT](LICENSE)
