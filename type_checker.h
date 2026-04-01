#ifndef TYPE_CHECKER_H
#define TYPE_CHECKER_H

#include "ast.h"
#include "types.h"

class TypeChecker {
public:
    /** Post-order traversal: annotates BinaryOpNode::resultType; returns root type. */
    static Type check(ASTNode* root);
};

#endif
