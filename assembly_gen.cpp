#include "assembly_gen.h"

static const char* tacOpToMnemonic(const std::string& op) {
    if (op == "+") {
        return "ADD";
    }
    if (op == "-") {
        return "SUB";
    }
    if (op == "*") {
        return "MUL";
    }
    if (op == "/") {
        return "DIV";
    }
    return "OP";
}

std::vector<std::string> AssemblyGenerator::generate(const TacProgram& program) {
    std::vector<std::string> lines;

    if (program.instructions.empty()) {
        if (!program.resultName.empty()) {
            lines.push_back("MOV R0, " + program.resultName);
        }
        return lines;
    }

    for (const TAC& tac : program.instructions) {
        lines.push_back("MOV R0, " + tac.arg1);
        lines.push_back("MOV R1, " + tac.arg2);
        lines.push_back(std::string(tacOpToMnemonic(tac.op)) + " R0, R1");
        lines.push_back("MOV " + tac.result + ", R0");
    }

    return lines;
}
