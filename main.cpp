#include "compiler.h"
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char* argv[]) {
    if (argc >= 2) {
        std::string expr;
        if (std::string(argv[1]) == "-") {
            if (!std::getline(std::cin, expr)) {
                return 1;
            }
        } else {
            expr = argv[1];
        }
        compileExpression(expr);
        return 0;
    }

    const std::vector<std::string> validTests = {
        "5 + 3",
        "5 + 2.5 * 2",
        "10 / 3",
        "(2 + 3.5) * 4 - 2",
        "5 * (3 + 2.5)",
    };

    const std::vector<std::string> errorTests = {
        "5..5",
        "5 + * 3",
        "(5 + 3",
        "5 / 0",
        "5 + a",
    };

    std::cout << "########## VALID EXPRESSIONS ##########\n\n";
    for (const std::string& expr : validTests) {
        compileExpression(expr);
        std::cout << "\n----------\n\n";
    }

    std::cout << "########## ERROR CASES ##########\n\n";
    for (const std::string& expr : errorTests) {
        compileExpression(expr);
        std::cout << "\n----------\n\n";
    }

    return 0;
}
