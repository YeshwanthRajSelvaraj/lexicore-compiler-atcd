#include "tac.h"
#include <cmath>
#include <sstream>

std::string TAC::toLine() const { return result + " = " + arg1 + " " + op + " " + arg2; }

std::string TacGenerator::formatLiteral(double value, bool isInt) {
    if (isInt) {
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

TacGenerator::Operand TacGenerator::emitExpr(const ASTNode* node, std::vector<TAC>& out) {
    const auto* num = dynamic_cast<const NumberNode*>(node);
    if (num != nullptr) {
        return Operand{formatLiteral(num->value, num->isInt),
                       num->isInt ? Type::INT : Type::FLOAT};
    }

    const auto* bin = dynamic_cast<const BinaryOpNode*>(node);
    if (bin == nullptr) {
        return Operand{"0", Type::INT};
    }

    Operand left = emitExpr(bin->left.get(), out);
    Operand right = emitExpr(bin->right.get(), out);

    ++tempCounter_;
    std::string temp = "t" + std::to_string(tempCounter_);

    TAC instr;
    instr.op = std::string(1, bin->op);
    instr.arg1 = left.name;
    instr.arg2 = right.name;
    instr.result = temp;
    instr.resultType = bin->resultType;
    instr.arg1Type = left.type;
    instr.arg2Type = right.type;
    out.push_back(std::move(instr));

    return Operand{temp, bin->resultType};
}

TacProgram TacGenerator::generate(const ASTNode* root) {
    TacProgram prog;
    tempCounter_ = 0;
    Operand fin = emitExpr(root, prog.instructions);
    prog.resultName = fin.name;
    prog.resultType = fin.type;
    return prog;
}
