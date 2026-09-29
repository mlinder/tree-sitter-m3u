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
    (attribute name: (tag_word) value: (unquoted_value | quoted_string))))
  (variant_stream               ; #EXT-X-STREAM-INF and its URI line
    (tag …)
    uri: (uri))
  (media_segment                ; #EXTINF, following tags, URI line
    (extinf duration: (duration) (attribute)* title: (title))
    (tag …)*
    uri: (uri))
  (uri)                         ; plain M3U entry
  (comment))
```

`variant_stream` and `media_segment` group a tag with the URI it applies to,
with any comments and blank lines (and, for segments, tags such as
`#EXT-X-BYTERANGE`) in between. Without a following URI they contain only the
tag, and `uri` is absent.

Used by the [M3U extension for Zed](https://github.com/mlinder/zed-m3u).

## Development

```sh
pnpm install
pnpm run generate   # regenerate src/ from grammar.js
pnpm test           # corpus tests + error-free parse of examples/
```

## License

[MIT](LICENSE)
