#ifndef OPTIMIZER_H
#define OPTIMIZER_H

#include "ast.h"
#include <memory>

/** Constant folding: collapses binary ops with two numeric leaves. */
class ConstantFolder {
public:
    static std::unique_ptr<ASTNode> fold(std::unique_ptr<ASTNode> root);
};

#endif
