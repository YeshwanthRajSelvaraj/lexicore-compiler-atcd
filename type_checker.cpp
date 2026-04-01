#include "type_checker.h"

static Type promote(Type a, Type b) {
    if (a == Type::FLOAT || b == Type::FLOAT) {
        return Type::FLOAT;
    }
    return Type::INT;
}

static Type checkNode(ASTNode* node) {
    auto* num = dynamic_cast<NumberNode*>(node);
    if (num != nullptr) {
        return num->isInt ? Type::INT : Type::FLOAT;
    }

    auto* bin = dynamic_cast<BinaryOpNode*>(node);
    if (bin != nullptr) {
        Type lt = checkNode(bin->left.get());
        Type rt = checkNode(bin->right.get());

        if (bin->op == '/') {
            bin->resultType = Type::FLOAT;
        } else {
            bin->resultType = promote(lt, rt);
        }
        return bin->resultType;
    }

    return Type::INT;
}

Type TypeChecker::check(ASTNode* root) { return checkNode(root); }
