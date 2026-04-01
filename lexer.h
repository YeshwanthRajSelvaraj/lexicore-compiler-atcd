#ifndef LEXER_H
#define LEXER_H

#include "token.h"
#include <string>
#include <vector>

class Lexer {
public:
    explicit Lexer(std::string source);

    /** Tokenize entire input. Stops at first lexical error (ERROR token). */
    std::vector<Token> tokenize();

private:
    std::string src_;
    std::size_t pos_{0};
    int line_{1};
    int column_{1};

    char peek() const;
    char advance();
    void skipWhitespace();

    Token makeErrorToken(const std::string& message, int line, int col);
    Token scanNumber(int startLine, int startCol);
};

#endif
