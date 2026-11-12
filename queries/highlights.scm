; Tags and attribute names the specifications don't define get no capture,
; so they show as plain text: typos such as BANDWDTH or
; #EXT-X-TARGETDURATON stand out, and so do vendor tags. The lists follow
; draft-pantos-hls-rfc8216bis-22 plus tags from older protocol versions and
; the Extended M3U dialects. Value patterns are mutually exclusive, so every
; value gets exactly one highlight.

; #EXTM3U
(header) @tag.doctype

; --- Tags ---

(extinf "#EXTINF" @keyword @tag)

((tag_name) @keyword @tag
 (#any-of? @tag
   ; HLS
   "#EXT-X-BITRATE" "#EXT-X-BYTERANGE" "#EXT-X-CONTENT-STEERING"
   "#EXT-X-DATERANGE" "#EXT-X-DEFINE" "#EXT-X-DISCONTINUITY"
   "#EXT-X-DISCONTINUITY-SEQUENCE" "#EXT-X-ENDLIST" "#EXT-X-GAP"
   "#EXT-X-I-FRAME-STREAM-INF" "#EXT-X-I-FRAMES-ONLY"
   "#EXT-X-INDEPENDENT-SEGMENTS" "#EXT-X-KEY" "#EXT-X-MAP" "#EXT-X-MEDIA"
   "#EXT-X-MEDIA-SEQUENCE" "#EXT-X-PART" "#EXT-X-PART-INF"
   "#EXT-X-PLAYLIST-TYPE" "#EXT-X-PRELOAD-HINT" "#EXT-X-PROGRAM-DATE-TIME"
   "#EXT-X-RENDITION-REPORT" "#EXT-X-SERVER-CONTROL" "#EXT-X-SESSION-DATA"
   "#EXT-X-SESSION-KEY" "#EXT-X-SKIP" "#EXT-X-START" "#EXT-X-STREAM-INF"
   "#EXT-X-TARGETDURATION" "#EXT-X-VERSION"
   ; HLS, removed in protocol version 7
   "#EXT-X-ALLOW-CACHE"
   ; Extended M3U, M3A, IPTV and VLC
   "#EXTALB" "#EXTALBUMARTURL" "#EXTART" "#EXTBIN" "#EXTBYT" "#EXTGENRE"
   "#EXTGRP" "#EXTM3A" "#EXTVLCOPT" "#PLAYLIST"))

; --- Attribute names ---

((attribute name: (tag_word) @property @attribute)
 (#any-of? @attribute
   "ALLOWED-CPC" "ASSOC-LANGUAGE" "AUDIO" "AUTOSELECT" "AVERAGE-BANDWIDTH"
   "BANDWIDTH" "BIT-DEPTH" "BYTERANGE" "BYTERANGE-LENGTH" "BYTERANGE-START"
   "CAN-BLOCK-RELOAD" "CAN-SKIP-DATERANGES" "CAN-SKIP-UNTIL" "CHANNELS"
   "CHARACTERISTICS" "CLASS" "CLOSED-CAPTIONS" "CODECS" "CUE" "DATA-ID"
   "DEFAULT" "DURATION" "END-DATE" "END-ON-NEXT" "FORCED" "FORMAT"
   "FRAME-RATE" "GAP" "GROUP-ID" "HDCP-LEVEL" "HOLD-BACK" "ID" "IMPORT"
   "INDEPENDENT" "INSTREAM-ID" "IV" "KEYFORMAT" "KEYFORMATVERSIONS"
   "LANGUAGE" "LAST-MSN" "LAST-PART" "METHOD" "NAME" "PART-HOLD-BACK"
   "PART-TARGET" "PATHWAY-ID" "PLANNED-DURATION" "PRECISE" "QUERYPARAM"
   "RECENTLY-REMOVED-DATERANGES" "REQ-VIDEO-LAYOUT" "RESOLUTION"
   "SAMPLE-RATE" "SCORE" "SCTE35-CMD" "SCTE35-IN" "SCTE35-OUT" "SERVER-URI"
   "SKIPPED-SEGMENTS" "STABLE-RENDITION-ID" "STABLE-VARIANT-ID" "START-DATE"
   "SUBTITLES" "SUPPLEMENTAL-CODECS" "TIME-OFFSET" "TYPE" "URI" "VALUE"
   "VIDEO" "VIDEO-RANGE"
   ; removed in protocol version 6
   "PROGRAM-ID"))

; Client-defined attributes (X-COM-EXAMPLE-AD-ID, X-ASSET-URI), which the
; spec reserves the X- prefix for
((attribute name: (tag_word) @property @attribute)
 (#match? @attribute "^X-"))

; Lowercase names come from other dialects (IPTV tvg-id, VLC start-time);
; HLS attribute names are always uppercase
((attribute name: (tag_word) @property @attribute)
 (#match? @attribute "[a-z]"))

(attribute "=" @operator)

; --- Values ---

; Numbers, including hexadecimal (0x9c7d…)
(extinf duration: (duration) @number)

((attribute value: (unquoted_value) @number)
 (#match? @number "^(-?[0-9]+(\\.[0-9]+)?|0[xX][0-9A-Fa-f]+)$"))

((tag_content (tag_word) @number)
 (#match? @number "^(-?[0-9]+(\\.[0-9]+)?|0[xX][0-9A-Fa-f]+)$"))

; Byte ranges (1024@256000) and resolutions (1280x720)
(byte_range (integer) @number)
(byte_range "@" @punctuation.delimiter)
; One capture for the whole value: Zed shapes each highlight span on its
; own, so a separately coloured x would lose the font's 416×234 ligature
(resolution) @number

; Enumerated strings: AUDIO, YES, PQ, AES-128, VOD, …
((attribute value: (unquoted_value) @constant @variant)
 (#match? @variant "^[A-Z][A-Z0-9-]*$"))

((tag_content (tag_word) @constant @variant)
 (#match? @variant "^[A-Z][A-Z0-9-]*$"))

; IPTV booleans (radio=true)
((attribute value: (unquoted_value) @boolean)
 (#any-of? @boolean "true" "false"))

; Any other unquoted value
((attribute value: (unquoted_value) @string @string.special)
 (#not-match? @string
   "^(-?[0-9]+(\\.[0-9]+)?|0[xX][0-9A-Fa-f]+|[A-Z][A-Z0-9-]*|true|false)$"))

; Timestamps (#EXT-X-PROGRAM-DATE-TIME)
((tag_content (tag_word) @string.special)
 (#match? @string.special "^[0-9]{4}-[0-9]{2}-[0-9]{2}T"))

(attribute value: (quoted_string) @string)
(extinf title: (title) @string)

; --- Everything else ---

(comment) @comment

; Media URIs and {$...} template variables
(uri) @string.special @link_uri
(escape_sequence) @string.escape
(variable) @variable @variable.special

("," @punctuation.delimiter)
