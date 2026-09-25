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

  // A directive value is ambiguous until we see whether the first word
  // is followed by '=': either an attribute list or bare words. The
  // one-token lookahead resolves this, and `prec.dynamic` on `attribute`
  // picks the structured reading whenever both survive.
  conflicts: $ => [],

  rules: {
    playlist: $ => repeat(choice($.header, $.extinf, $.tag, $.comment, $.uri, /\r?\n/)),

    // #EXTM3U — the extended M3U header
    header: _ => token(prec(3, '#EXTM3U')),

    // #EXTINF:<duration>[ <iptv attributes>][,<title>]
    // `prec.right` makes the trailing title greedy: a `{$...}` variable
    // after the comma belongs to the title rather than starting a new
    // (newline-less) playlist entry.
    extinf: $ => prec.right(seq(
      token(prec(2, '#EXTINF')),
      optional(seq(
        ':',
        field('duration', $.duration),
        optional(repeat1(choice($.attribute, $.tag_word))),
        optional(seq(',', optional(field('title', $.title)))),
      )),
    )),

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
