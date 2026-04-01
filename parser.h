#ifndef PARSER_H
#define PARSER_H

#include "ast.h"
#include "token.h"
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

class SyntaxError : public std::runtime_error {
public:
    SyntaxError(std::string msg, int line, int col)
        : std::runtime_error(std::move(msg)), line_(line), column_(col) {}

    int line() const { return line_; }
    int column() const { return column_; }

private:
    int line_;
    int column_;
};

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);

    std::unique_ptr<ASTNode> parse();

private:
    const std::vector<Token>& tokens_;
    std::size_t index_{0};

    const Token& peek() const;
    const Token& current() const;
    bool isAtEnd() const;
    void advance();

    std::unique_ptr<ASTNode> parseE();
    std::unique_ptr<ASTNode> parseEPrime(std::unique_ptr<ASTNode> lhs);
    std::unique_ptr<ASTNode> parseT();
    std::unique_ptr<ASTNode> parseTPrime(std::unique_ptr<ASTNode> lhs);
    std::unique_ptr<ASTNode> parseF();

    [[noreturn]] void throwUnexpected(const std::string& what) const;
    static std::string tokenKindString(const Token& t);
};

#endif
