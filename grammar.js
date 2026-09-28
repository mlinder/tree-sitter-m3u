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

  // Whether the lines after an #EXTINF or #EXT-X-STREAM-INF tag belong to
  // it is only known once a URI (or something else) shows up. Both
  // readings are kept and scored with `prec.dynamic`: +1 for attaching a
  // URI, +1 for every #EXTINF and #EXT-X-STREAM-INF parsed as such. The
  // second rule stops a segment from absorbing the next #EXTINF as an
  // ordinary tag.
  conflicts: $ => [
    [$.media_segment],
    [$.variant_stream],
  ],

  rules: {
    playlist: $ => repeat(choice(
      $.header,
      $.media_segment,
      $.variant_stream,
      $.tag,
      $.comment,
      $.uri,
      $._newline,
    )),

    _newline: _ => /\r?\n/,

    // Keyword tokens share tag_name's precedence, so the longest match wins
    // and e.g. #EXTINFO is an (unknown) tag rather than #EXTINF plus a URI.

    // #EXTM3U — the extended M3U header
    header: _ => token(prec(1, '#EXTM3U')),

    // #EXTINF, the segment tags that follow it, and the URI they describe.
    // Also plain M3U and IPTV entries. Without a URI, just the #EXTINF.
    media_segment: $ => seq(
      $.extinf,
      optional(prec.dynamic(1, seq(
        repeat1(choice($._newline, $.comment, $.tag)),
        field('uri', $.uri),
      ))),
    ),

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
      $.tag_word,
      $.quoted_string,
      ',',
      token(prec(-1, /[^\s\n]+/)),
    )),

    attribute: $ => prec.dynamic(2, seq(
      field('name', $.tag_word),
      '=',
      field('value', choice($.quoted_string, $.unquoted_value)),
    )),

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

    // Media URI, possibly containing {$...} template variables
    uri: $ => prec.right(seq(
      choice($.variable, /[^#\s{]/),
      repeat(choice($.variable, /[^{\n]+/)),
    )),

    variable: _ => token(prec(1, /\{\$[^}\n]*\}/)),
  },
});
