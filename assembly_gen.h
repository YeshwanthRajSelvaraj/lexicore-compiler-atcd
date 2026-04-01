#ifndef ASSEMBLY_GEN_H
#define ASSEMBLY_GEN_H

#include "tac.h"
#include <string>
#include <vector>

/** Translate TAC to simple MOV / ALU / MOV text for R0–R3 style machine. */
class AssemblyGenerator {
public:
    static std::vector<std::string> generate(const TacProgram& program);
};

#endif
