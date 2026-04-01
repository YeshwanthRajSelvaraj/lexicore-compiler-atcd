#ifndef TOKEN_H
#define TOKEN_H

#include <string>

enum class TokenType {
    INT,
    FLOAT,
    PLUS,
    MINUS,
    MULTIPLY,
    DIVIDE,
    LPAREN,
    RPAREN,
    END_OF_FILE,
    ERROR
};

struct Token {
    TokenType type{TokenType::END_OF_FILE};
    double value{0.0};
    int line{1};
    int column{1};
    std::string errorMessage; // non-empty when type == ERROR

    std::string toString() const;
};

#endif
