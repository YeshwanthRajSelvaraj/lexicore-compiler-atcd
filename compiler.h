#ifndef COMPILER_H
#define COMPILER_H

#include <string>

/** Runs all phases; prints staged output or the first error. */
void compileExpression(const std::string& expression);

#endif
