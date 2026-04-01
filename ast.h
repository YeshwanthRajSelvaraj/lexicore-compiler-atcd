#ifndef AST_H
#define AST_H

#include "types.h"
#include <iosfwd>
#include <memory>
#include <string>

class ASTNode {
public:
    virtual ~ASTNode() = default;
    virtual std::string toString() const = 0;

    /** Pretty-print indented tree (2 spaces per depth). */
    virtual void printTree(std::ostream& os, int depth = 0, bool showTypes = false) const = 0;

protected:
    static void indent(std::ostream& os, int depth);
};

class NumberNode : public ASTNode {
public:
    NumberNode(double v, bool intLit) : value(v), isInt(intLit) {}

    std::string toString() const override;
    void printTree(std::ostream& os, int depth, bool showTypes) const override;

    double value{};
    bool isInt{false};
};

class BinaryOpNode : public ASTNode {
public:
    BinaryOpNode(std::unique_ptr<ASTNode> l, char o, std::unique_ptr<ASTNode> r)
        : left(std::move(l)), op(o), right(std::move(r)) {}

    std::string toString() const override;
    void printTree(std::ostream& os, int depth, bool showTypes) const override;

    std::unique_ptr<ASTNode> left;
    char op{'+'};
    std::unique_ptr<ASTNode> right;

    /** Filled by semantic analysis */
    Type resultType{Type::INT};
};

/** Deep copy (copies `resultType` on binary nodes when already set). */
std::unique_ptr<ASTNode> cloneAst(const ASTNode* root);

#endif
