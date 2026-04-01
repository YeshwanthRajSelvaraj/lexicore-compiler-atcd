#include "lexer.h"
#include <cctype>
#include <sstream>

Lexer::Lexer(std::string source) : src_(std::move(source)) {}

char Lexer::peek() const {
    if (pos_ >= src_.size()) {
        return '\0';
    }
    return src_[pos_];
}

char Lexer::advance() {
    if (pos_ >= src_.size()) {
        return '\0';
    }
    char c = src_[pos_++];
    if (c == '\n') {
        ++line_;
        column_ = 1;
    } else {
        ++column_;
    }
    return c;
}

void Lexer::skipWhitespace() {
    while (true) {
        char c = peek();
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
            advance();
        } else {
            break;
        }
    }
}

Token Lexer::makeErrorToken(const std::string& message, int line, int col) {
    Token t;
    t.type = TokenType::ERROR;
    t.line = line;
    t.column = col;
    t.errorMessage = message;
    return t;
}

Token Lexer::scanNumber(int startLine, int startCol) {
    double intPart = 0.0;
    while (std::isdigit(static_cast<unsigned char>(peek()))) {
        intPart = intPart * 10.0 + (advance() - '0');
    }

    if (peek() != '.') {
        Token t;
        t.type = TokenType::INT;
        t.value = intPart;
        t.line = startLine;
        t.column = startCol;
        return t;
    }

    advance(); // consume '.'

    if (peek() == '.') {
        // `line_` / `column_` point at the second dot.
        return makeErrorToken("invalid number (multiple dots)", line_, column_);
    }

    if (!std::isdigit(static_cast<unsigned char>(peek()))) {
        return makeErrorToken("invalid number (digit expected after '.')", line_, column_);
    }

    double frac = 0.0;
    double place = 0.1;
    while (std::isdigit(static_cast<unsigned char>(peek()))) {
        frac += place * (advance() - '0');
        place *= 0.1;
    }

    Token t;
    t.type = TokenType::FLOAT;
    t.value = intPart + frac;
    t.line = startLine;
    t.column = startCol;
    return t;
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    pos_ = 0;
    line_ = 1;
    column_ = 1;

    while (true) {
        skipWhitespace();
        if (peek() == '\0') {
            Token eof;
            eof.type = TokenType::END_OF_FILE;
            eof.line = line_;
            eof.column = column_;
            tokens.push_back(eof);
            break;
        }

        int tokLine = line_;
        int tokCol = column_;
        char c = peek();

        if (std::isdigit(static_cast<unsigned char>(c))) {
            Token num = scanNumber(tokLine, tokCol);
            if (num.type == TokenType::ERROR) {
                tokens.push_back(num);
                break;
            }
            tokens.push_back(num);
            continue;
        }

        advance();
        Token t;
        t.line = tokLine;
        t.column = tokCol;

        switch (c) {
        case '+':
            t.type = TokenType::PLUS;
            tokens.push_back(t);
            break;
        case '-':
            t.type = TokenType::MINUS;
            tokens.push_back(t);
            break;
        case '*':
            t.type = TokenType::MULTIPLY;
            tokens.push_back(t);
            break;
        case '/':
            t.type = TokenType::DIVIDE;
            tokens.push_back(t);
            break;
        case '(':
            t.type = TokenType::LPAREN;
            tokens.push_back(t);
            break;
        case ')':
            t.type = TokenType::RPAREN;
            tokens.push_back(t);
            break;
        default: {
            std::string msg = "unknown character '";
            msg += c;
            msg += '\'';
            tokens.push_back(makeErrorToken(msg, tokLine, tokCol));
            return tokens;
        }
        }
    }

    return tokens;
}
