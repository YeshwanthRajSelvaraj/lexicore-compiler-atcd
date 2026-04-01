#ifndef TAC_H
#define TAC_H

#include "ast.h"
#include "types.h"
#include <memory>
#include <string>
#include <vector>

struct TAC {
    std::string op; // "+", "-", "*", "/"
    std::string arg1;
    std::string arg2;
    std::string result;
    Type resultType{Type::INT};
    Type arg1Type{Type::INT};
    Type arg2Type{Type::INT};

    std::string toLine() const;
};

struct TacProgram {
    std::vector<TAC> instructions;
    /** Name of the final value (temp or literal). */
    std::string resultName;
    Type resultType{Type::INT};
};

class TacGenerator {
public:
    TacProgram generate(const ASTNode* root);

private:
    int tempCounter_{0};

    struct Operand {
        std::string name;
        Type type{Type::INT};
    };

    static std::string formatLiteral(double value, bool isInt);
    Operand emitExpr(const ASTNode* node, std::vector<TAC>& out);
};

#endif
