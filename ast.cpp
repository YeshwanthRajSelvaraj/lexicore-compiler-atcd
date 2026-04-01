#include "ast.h"
#include <cmath>
#include <ostream>
#include <sstream>

void ASTNode::indent(std::ostream& os, int depth) {
    for (int i = 0; i < depth; ++i) {
        os << "  ";
    }
}

static std::string formatNumberTree(double value, bool asInt) {
    if (asInt) {
        return std::to_string(static_cast<long long>(std::llround(value)));
    }
    std::ostringstream oss;
    oss << value;
    std::string s = oss.str();
    if (s.find('.') == std::string::npos && s.find('e') == std::string::npos &&
        s.find('E') == std::string::npos) {
        return s + ".0";
    }
    return s;
}

std::string NumberNode::toString() const {
    if (isInt) {
        return std::to_string(static_cast<long long>(value));
    }
    std::ostringstream oss;
    oss << value;
    return oss.str();
}

void NumberNode::printTree(std::ostream& os, int depth, bool showTypes) const {
    indent(os, depth);
    os << "Number(" << formatNumberTree(value, isInt) << ")";
    if (showTypes) {
        os << " (" << (isInt ? "int" : "float") << ")";
    }
    os << "\n";
}

std::string BinaryOpNode::toString() const {
    return "(" + left->toString() + " " + op + " " + right->toString() + ")";
}

void BinaryOpNode::printTree(std::ostream& os, int depth, bool showTypes) const {
    indent(os, depth);
    os << "BinaryOp(" << op << ")";
    if (showTypes) {
        os << " (" << (resultType == Type::INT ? "int" : "float") << ")";
    }
    os << "\n";
    left->printTree(os, depth + 1, showTypes);
    right->printTree(os, depth + 1, showTypes);
}

std::unique_ptr<ASTNode> cloneAst(const ASTNode* root) {
    if (root == nullptr) {
        return nullptr;
    }
    if (const auto* num = dynamic_cast<const NumberNode*>(root)) {
        return std::make_unique<NumberNode>(num->value, num->isInt);
    }
    if (const auto* bin = dynamic_cast<const BinaryOpNode*>(root)) {
        auto copy = std::make_unique<BinaryOpNode>(cloneAst(bin->left.get()), bin->op, cloneAst(bin->right.get()));
        copy->resultType = bin->resultType;
        return copy;
    }
    return nullptr;
}
