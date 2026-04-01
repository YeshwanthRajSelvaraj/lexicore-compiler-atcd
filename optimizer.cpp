#include "optimizer.h"
#include <cmath>
#include <memory>

namespace {

bool foldBinaryResultIsInt(char op, const NumberNode& a, const NumberNode& b) {
    if (op == '/') {
        return false;
    }
    return a.isInt && b.isInt;
}

double foldApply(char op, double l, double r, const NumberNode& ln, const NumberNode& rn, bool resultIsInt) {
    if (resultIsInt) {
        long long li = static_cast<long long>(std::llround(l));
        long long ri = static_cast<long long>(std::llround(r));
        switch (op) {
        case '+':
            return static_cast<double>(li + ri);
        case '-':
            return static_cast<double>(li - ri);
        case '*':
            return static_cast<double>(li * ri);
        default:
            break;
        }
    }
    switch (op) {
    case '+':
        return l + r;
    case '-':
        return l - r;
    case '*':
        return l * r;
    case '/':
        return l / r;
    default:
        return 0.0;
    }
}

std::unique_ptr<ASTNode> foldImpl(std::unique_ptr<ASTNode> node, bool isRoot) {
    if (!node) {
        return nullptr;
    }

    if (dynamic_cast<NumberNode*>(node.get()) != nullptr) {
        return node;
    }

    auto* bin = dynamic_cast<BinaryOpNode*>(node.get());
    if (bin == nullptr) {
        return node;
    }

    const char op = bin->op;
    std::unique_ptr<ASTNode> left = foldImpl(std::move(bin->left), false);
    std::unique_ptr<ASTNode> right = foldImpl(std::move(bin->right), false);

    auto* ln = dynamic_cast<NumberNode*>(left.get());
    auto* rn = dynamic_cast<NumberNode*>(right.get());
    if (ln != nullptr && rn != nullptr && !isRoot) {
        const bool resultIsInt = foldBinaryResultIsInt(op, *ln, *rn);
        double v = foldApply(op, ln->value, rn->value, *ln, *rn, resultIsInt);
        return std::make_unique<NumberNode>(v, resultIsInt);
    }

    return std::make_unique<BinaryOpNode>(std::move(left), op, std::move(right));
}

} // namespace

std::unique_ptr<ASTNode> ConstantFolder::fold(std::unique_ptr<ASTNode> node) {
    return foldImpl(std::move(node), true);
}
