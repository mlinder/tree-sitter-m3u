#include "tree_sitter/parser.h"

#include <stdbool.h>

enum TokenType {
  BYTE_RANGE_START,
  RESOLUTION_START,
};

void *tree_sitter_m3u_external_scanner_create(void) { return NULL; }

void tree_sitter_m3u_external_scanner_destroy(void *payload) {}

unsigned tree_sitter_m3u_external_scanner_serialize(void *payload, char *buffer) {
  return 0;
}

void tree_sitter_m3u_external_scanner_deserialize(void *payload, const char *buffer,
                                                  unsigned length) {}

static unsigned skip_digits(TSLexer *lexer) {
  unsigned count = 0;
  while (lexer->lookahead >= '0' && lexer->lookahead <= '9') {
    lexer->advance(lexer, false);
    count++;
  }
  return count;
}

static bool at_value_end(TSLexer *lexer) {
  switch (lexer->lookahead) {
    case ' ':
    case '\t':
    case '\r':
    case '\n':
    case ',':
      return true;
    default:
      return lexer->eof(lexer);
  }
}

// Zero-width token before <digits>@<digits> or <digits>x<digits> when that is
// the whole value; the grammar lexes the parts.
bool tree_sitter_m3u_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
  bool byte_range = valid_symbols[BYTE_RANGE_START];
  bool resolution = valid_symbols[RESOLUTION_START];
  if (!byte_range && !resolution) return false;

  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, true);
  }
  lexer->mark_end(lexer);

  if (skip_digits(lexer) == 0) return false;
  if (lexer->lookahead == '@' && byte_range) {
    lexer->result_symbol = BYTE_RANGE_START;
  } else if (lexer->lookahead == 'x' && resolution) {
    lexer->result_symbol = RESOLUTION_START;
  } else {
    return false;
  }
  lexer->advance(lexer, false);

  return skip_digits(lexer) > 0 && at_value_end(lexer);
}
