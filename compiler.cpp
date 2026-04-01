#include "assembly_gen.h"
#include "ast.h"
#include "compiler.h"
#include "evaluator.h"
#include "lexer.h"
#include "optimizer.h"
#include "parser.h"
#include "tac.h"
#include "type_checker.h"
#include "token.h"
#include <iostream>
#include <memory>
#include <vector>

static const char* typeName(Type t) { return (t == Type::INT) ? "int" : "float"; }

static void printTokensLine(const std::vector<Token>& tokens) {
    std::cout << "Tokens: [";
    bool first = true;
    for (const Token& tok : tokens) {
        if (tok.type == TokenType::END_OF_FILE) {
            break;
        }
        if (!first) {
            std::cout << ", ";
        }
        first = false;
        std::cout << tok.toString();
    }
    std::cout << "]\n";
}

void compileExpression(const std::string& expression) {
    std::cout << "Input: " << expression << "\n\n";

    Lexer lexer(expression);
    std::vector<Token> tokens = lexer.tokenize();

    for (const Token& tok : tokens) {
        if (tok.type == TokenType::ERROR) {
            std::cout << "=== LEXICAL ERROR ===\n";
            std::cout << tok.errorMessage << " at line " << tok.line << ", column " << tok.column << "\n";
            return;
        }
    }

    std::cout << "=== LEXICAL ANALYSIS ===\n";
    printTokensLine(tokens);
    std::cout << "\n";

    std::unique_ptr<ASTNode> ast;
    try {
        Parser parser(tokens);
        ast = parser.parse();
    } catch (const SyntaxError& e) {
        std::cout << "=== SYNTAX ERROR ===\n";
        std::cout << e.what() << " at line " << e.line() << ", column " << e.column() << "\n";
        return;
    } catch (const std::exception& e) {
        std::cout << "=== SYNTAX ERROR ===\n";
        std::cout << e.what() << "\n";
        return;
    }

    std::cout << "=== SYNTAX ANALYSIS ===\n";
    std::cout << "AST:\n";
    ast->printTree(std::cout, 0, false);
    std::cout << "\n";

    TypeChecker::check(ast.get());

    std::unique_ptr<ASTNode> optimized = ConstantFolder::fold(cloneAst(ast.get()));
    Type exprType = TypeChecker::check(optimized.get());

    std::cout << "=== OPTIMIZED AST ===\n";
    optimized->printTree(std::cout, 0, false);
    std::cout << "\n";

    std::cout << "=== SEMANTIC ANALYSIS ===\n";
    std::cout << "Expression type: " << typeName(exprType) << "\n\n";

    TacGenerator gen;
    TacProgram program = gen.generate(ast.get());

    std::cout << "=== THREE-ADDRESS CODE ===\n";
    for (const TAC& tac : program.instructions) {
        std::cout << tac.toLine() << "\n";
    }
    std::cout << "\n";

    std::vector<std::string> asmLines = AssemblyGenerator::generate(program);
    std::cout << "=== ASSEMBLY CODE ===\n";
    for (const std::string& line : asmLines) {
        std::cout << line << "\n";
    }
    std::cout << "\n";

    std::string err;
    std::string resultStr = Evaluator::evaluate(program, err);
    if (!err.empty()) {
        std::cout << "=== RUNTIME ERROR ===\n";
        std::cout << err << "\n";
        return;
    }

    std::cout << "=== EVALUATION ===\n";
    std::cout << "Result: " << resultStr << "\n";
}
