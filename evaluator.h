#ifndef EVALUATOR_H
#define EVALUATOR_H

#include "tac.h"
#include <string>

class Evaluator {
public:
    /** Returns formatted result string, or empty string on runtime error (message via outError). */
    static std::string evaluate(const TacProgram& program, std::string& outError);
};

#endif
