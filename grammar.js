/// <reference types="tree-sitter-cli/dsl" />

/**
 * @file Tree-sitter grammar for M3U / Extended M3U / HLS playlists
 * @author Marcus Linder <mlinder@gmail.com>
 * @license MIT
 *
 * Covers plain M3U, Extended M3U, HTTP Live Streaming and the IPTV
 * dialects that use space-separated tvg-* attributes and {$...} template
 * variables.
 */

module.exports = grammar({
  name: 'm3u',

  // Whitespace between tokens, but never newlines: the grammar is
  // line-oriented and consumes line breaks explicitly in `playlist`.
  extras: _ => [/[\t ]/],

  // Zero-width tokens from src/scanner.c that look ahead for a whole
  // byte range or resolution, so that a plain number or word doesn't
  // start one.
  externals: $ => [$._byte_range_start, $._resolution_start],

  // Whether lines belong to a segment or variant is only known once an
  // #EXTINF or URI (or something else) shows up. Both readings are kept
  // and scored with `prec.dynamic`: +1 for attaching a URI, +1 for every
  // segment tag that leads up to an #EXTINF, +1 for every #EXTINF and
  // #EXT-X-STREAM-INF parsed as such. The last rule stops a segment from
  // absorbing the next #EXTINF as an ordinary tag.
  conflicts: $ => [
    [$.media_segment],
    [$.variant_stream],
    [$.playlist, $._segment_tag],
  ],

  rules: {
    playlist: $ => repeat(choice(
      $.header,
      $.media_segment,
      $.variant_stream,
      $.tag,
      alias($._program_date_time, $.tag),
      alias($._other_segment_tag, $.tag),
      $.comment,
      $.uri,
      $._newline,
    )),

    _newline: _ => /\r?\n/,

    // Keyword tokens share tag_name's precedence, so the longest match wins
    // and e.g. #EXTINFO is an (unknown) tag rather than #EXTINF plus a URI.

    // #EXTM3U — the extended M3U header
    header: _ => token(prec(1, '#EXTM3U')),

    // A media segment: its Media Segment tags in any order, one of them
    // #EXTINF, and the URI they describe. Also plain M3U and IPTV entries.
    // Segment tags before the #EXTINF (#EXT-X-PROGRAM-DATE-TIME, -KEY,
    // -MAP, -PART, ...) belong to it; playlist tags never do. Without a
    // URI, the segment ends at its #EXTINF.
    media_segment: $ => seq(
      repeat(prec.dynamic(1, seq(
        $._segment_tag,
        repeat1(choice($._newline, $.comment)),
      ))),
      $.extinf,
      optional(prec.dynamic(1, seq(
        repeat1(choice($._newline, $.comment, $.tag, $._segment_tag)),
        field('uri', $.uri),
      ))),
    ),

    // The Media Segment tags other than #EXTINF (draft-pantos-hls-rfc8216bis
    // 4.4.4), as ordinary `tag` nodes. #EXT-X-PROGRAM-DATE-TIME is also a
    // field, so that queries can show a segment's time.
    _segment_tag: $ => choice(
      field('program_date_time', alias($._program_date_time, $.tag)),
      alias($._other_segment_tag, $.tag),
    ),

    _program_date_time: $ => prec.right(seq(
      alias(token(prec(1, '#EXT-X-PROGRAM-DATE-TIME')), $.tag_name),
      optional(seq(':', optional($.tag_content))),
    )),

    _other_segment_tag: $ => prec.right(seq(
      alias(choice(
        token(prec(1, '#EXT-X-BYTERANGE')),
        token(prec(1, '#EXT-X-DISCONTINUITY')),
        token(prec(1, '#EXT-X-KEY')),
        token(prec(1, '#EXT-X-MAP')),
        token(prec(1, '#EXT-X-GAP')),
        token(prec(1, '#EXT-X-BITRATE')),
        token(prec(1, '#EXT-X-PART')),
      ), $.tag_name),
      optional(seq(':', optional($.tag_content))),
    )),

    // #EXT-X-STREAM-INF and the next URI line, the variant's Media Playlist.
    // Without a URI, just the tag.
    variant_stream: $ => seq(
      alias($._stream_inf, $.tag),
      optional(prec.dynamic(1, seq(
        repeat1(choice($._newline, $.comment, $.tag)),
        field('uri', $.uri),
      ))),
    ),

    _stream_inf: $ => prec.dynamic(1, prec.right(seq(
      alias(token(prec(1, '#EXT-X-STREAM-INF')), $.tag_name),
      optional(seq(':', optional($.tag_content))),
    ))),

    // #EXTINF:<duration>[ <iptv attributes>][,<title>]
    // `prec.right` makes the trailing title greedy: a `{$...}` variable
    // after the comma belongs to the title rather than starting a new
    // (newline-less) playlist entry.
    extinf: $ => prec.dynamic(1, prec.right(seq(
      token(prec(1, '#EXTINF')),
      optional(seq(
        ':',
        field('duration', $.duration),
        optional(repeat1(choice($.attribute, $.tag_word))),
        optional(seq(',', optional(field('title', $.title)))),
      )),
    ))),

    duration: _ => token(prec(2, /-?[0-9]+(\.[0-9]+)?/)),

    // Empty after the comma (`#EXTINF:7.975,`) is common, so the title
    // is optional once the comma is present.
    title: $ => prec.right(repeat1(choice($.variable, /[^{\n]+/))),

    // Any other directive, known or not. The value may be empty
    // (`#EXTBIN:`, `#EXT-X-SESSION-KEY:`). `prec.right` keeps the
    // content greedy: words after ':' belong to the directive rather
    // than starting a (newline-less) playlist entry.
    tag: $ => prec.right(seq(
      $.tag_name,
      optional(seq(':', optional($.tag_content))),
    )),

    // All standard directives start with #EXT; #PLAYLIST (IPTV) is the
    // one widespread exception. Anything else starting with '#' is a
    // comment.
    tag_name: _ => token(prec(1, choice(
      seq('#EXT', repeat(/[A-Z0-9-]/)),
      '#PLAYLIST',
    ))),

    tag_content: $ => repeat1(choice(
      $.attribute,
      $.byte_range,
      $.resolution,
      $.tag_word,
      $.quoted_string,
      ',',
      token(prec(-1, /[^\s\n]+/)),
    )),

    attribute: $ => prec.dynamic(2, seq(
      field('name', $.tag_word),
      '=',
      field('value', choice($.quoted_string, $.resolution, $.unquoted_value)),
    )),

    // #EXT-X-BYTERANGE:<length>@<offset>
    byte_range: $ => seq(
      $._byte_range_start,
      field('length', $.integer),
      '@',
      field('offset', $.integer),
    ),

    // RESOLUTION=<width>x<height>
    resolution: $ => seq(
      $._resolution_start,
      field('width', $.integer),
      'x',
      field('height', $.integer),
    ),

    integer: _ => /[0-9]+/,

    // Bare word in a directive value: EVENT, VOD, AES-128, 416x234...
    tag_word: _ => token(/[^\s"=,]+/),

    // Unquoted attribute value; may contain '=' (URI query strings)
    // but must not start with one.
    unquoted_value: _ => token(prec(1, seq(/[^\s"=,]/, repeat(/[^\s",]/)))),

    // Quoted attribute value; commas inside are literal
    // (e.g. CODECS="avc1.42e00a,mp4a.40.2").
    quoted_string: _ => token(seq('"', repeat(choice(/[^"\\\n]/, /\\./)), '"')),

    // Any other line starting with '#'
    comment: _ => token(seq('#', /[^\n]*/)),

    // Media URI, possibly containing {$...} template variables and
    // percent-encoded characters (%20)
    uri: $ => prec.right(seq(
      choice($.variable, $.escape_sequence, /[^#\s{%]/, '%'),
      repeat(choice($.variable, $.escape_sequence, /[^{%\n]+/, '%')),
    )),

    escape_sequence: _ => /%[0-9A-Fa-f]{2}/,

    variable: _ => token(prec(1, /\{\$[^}\n]*\}/)),
  },
});
