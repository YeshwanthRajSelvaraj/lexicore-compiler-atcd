#include "token.h"
#include <sstream>

std::string Token::toString() const {
    switch (type) {
    case TokenType::INT:
        return "Token(INT," + std::to_string(static_cast<long long>(value)) + ")";
    case TokenType::FLOAT: {
        std::ostringstream oss;
        oss << value;
        return "Token(FLOAT," + oss.str() + ")";
    }
    case TokenType::PLUS:
        return "Token(PLUS)";
    case TokenType::MINUS:
        return "Token(MINUS)";
    case TokenType::MULTIPLY:
        return "Token(MULTIPLY)";
    case TokenType::DIVIDE:
        return "Token(DIVIDE)";
    case TokenType::LPAREN:
        return "Token(LPAREN)";
    case TokenType::RPAREN:
        return "Token(RPAREN)";
    case TokenType::END_OF_FILE:
        return "Token(EOF)";
    case TokenType::ERROR:
        return "Token(ERROR)";
    }
    return "Token(?)";
}
