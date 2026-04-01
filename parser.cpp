#include "parser.h"
#include <sstream>

Parser::Parser(const std::vector<Token>& tokens) : tokens_(tokens) {}

const Token& Parser::peek() const {
    if (index_ < tokens_.size()) {
        return tokens_[index_];
    }
    static Token eof;
    eof.type = TokenType::END_OF_FILE;
    return eof;
}

const Token& Parser::current() const { return peek(); }

bool Parser::isAtEnd() const { return peek().type == TokenType::END_OF_FILE; }

void Parser::advance() {
    if (!isAtEnd()) {
        ++index_;
    }
}

std::string Parser::tokenKindString(const Token& t) {
    switch (t.type) {
    case TokenType::INT:
        return "INT";
    case TokenType::FLOAT:
        return "FLOAT";
    case TokenType::PLUS:
        return "PLUS";
    case TokenType::MINUS:
        return "MINUS";
    case TokenType::MULTIPLY:
        return "MULTIPLY";
    case TokenType::DIVIDE:
        return "DIVIDE";
    case TokenType::LPAREN:
        return "LPAREN";
    case TokenType::RPAREN:
        return "RPAREN";
    case TokenType::END_OF_FILE:
        return "EOF";
    case TokenType::ERROR:
        return "ERROR";
    }
    return "?";
}

void Parser::throwUnexpected(const std::string& ctx) const {
    const Token& t = current();
    std::ostringstream oss;
    oss << "unexpected token ";
    switch (t.type) {
    case TokenType::PLUS:
        oss << "'+'";
        break;
    case TokenType::MINUS:
        oss << "'-'";
        break;
    case TokenType::MULTIPLY:
        oss << "'*'";
        break;
    case TokenType::DIVIDE:
        oss << "'/'";
        break;
    case TokenType::LPAREN:
        oss << "'('";
        break;
    case TokenType::RPAREN:
        oss << "')'";
        break;
    case TokenType::INT:
    case TokenType::FLOAT:
        oss << "number";
        break;
    case TokenType::END_OF_FILE:
        oss << "end of input";
        break;
    case TokenType::ERROR:
        oss << "error";
        break;
    default:
        oss << "'" << tokenKindString(t) << "'";
        break;
    }
    if (!ctx.empty()) {
        oss << " (" << ctx << ")";
    }
    throw SyntaxError(oss.str(), t.line, t.column);
}

std::unique_ptr<ASTNode> Parser::parse() {
    auto ast = parseE();
    if (!isAtEnd()) {
        throwUnexpected("expected end of expression");
    }
    return ast;
}

std::unique_ptr<ASTNode> Parser::parseE() {
    auto t = parseT();
    return parseEPrime(std::move(t));
}

std::unique_ptr<ASTNode> Parser::parseEPrime(std::unique_ptr<ASTNode> lhs) {
    while (peek().type == TokenType::PLUS || peek().type == TokenType::MINUS) {
        char op = (peek().type == TokenType::PLUS) ? '+' : '-';
        advance();
        auto rhs = parseT();
        lhs = std::make_unique<BinaryOpNode>(std::move(lhs), op, std::move(rhs));
    }
    return lhs;
}

std::unique_ptr<ASTNode> Parser::parseT() {
    auto f = parseF();
    return parseTPrime(std::move(f));
}

std::unique_ptr<ASTNode> Parser::parseTPrime(std::unique_ptr<ASTNode> lhs) {
    while (peek().type == TokenType::MULTIPLY || peek().type == TokenType::DIVIDE) {
        char op = (peek().type == TokenType::MULTIPLY) ? '*' : '/';
        advance();
        auto rhs = parseF();
        lhs = std::make_unique<BinaryOpNode>(std::move(lhs), op, std::move(rhs));
    }
    return lhs;
}

std::unique_ptr<ASTNode> Parser::parseF() {
    const Token& t = peek();
    if (t.type == TokenType::INT) {
        advance();
        return std::make_unique<NumberNode>(t.value, true);
    }
    if (t.type == TokenType::FLOAT) {
        advance();
        return std::make_unique<NumberNode>(t.value, false);
    }
    if (t.type == TokenType::LPAREN) {
        advance();
        auto inner = parseE();
        if (peek().type != TokenType::RPAREN) {
            throwUnexpected("expected ')'");
        }
        advance();
        return inner;
    }
    throwUnexpected("expected number or '('");
}
