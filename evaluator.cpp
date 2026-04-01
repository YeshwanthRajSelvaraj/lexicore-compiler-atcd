#include "evaluator.h"
#include <cctype>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <unordered_map>

namespace {

bool isTempName(const std::string& s) {
    if (s.size() < 2 || s[0] != 't') {
        return false;
    }
    for (std::size_t i = 1; i < s.size(); ++i) {
        if (!std::isdigit(static_cast<unsigned char>(s[i]))) {
            return false;
        }
    }
    return true;
}

Type literalType(const std::string& s) {
    return (s.find('.') != std::string::npos) ? Type::FLOAT : Type::INT;
}

struct Resolved {
    double value{};
    Type type{Type::INT};
};

Resolved resolve(const std::string& name, const std::unordered_map<std::string, double>& values,
                 const std::unordered_map<std::string, Type>& types) {
    if (isTempName(name)) {
        auto it = values.find(name);
        if (it == values.end()) {
            throw std::runtime_error("undefined temporary " + name);
        }
        Type t = types.at(name);
        return Resolved{it->second, t};
    }
    double v = std::stod(name);
    return Resolved{v, literalType(name)};
}

double applyBinary(char op, double l, double r, Type lt, Type rt, Type resType) {
    auto asIntOp = [&](auto intFn) -> double {
        long long li = static_cast<long long>(std::llround(l));
        long long ri = static_cast<long long>(std::llround(r));
        long long out = intFn(li, ri);
        return static_cast<double>(out);
    };

    switch (op) {
    case '+':
        if (resType == Type::INT && lt == Type::INT && rt == Type::INT) {
            return asIntOp([](long long a, long long b) { return a + b; });
        }
        return l + r;
    case '-':
        if (resType == Type::INT && lt == Type::INT && rt == Type::INT) {
            return asIntOp([](long long a, long long b) { return a - b; });
        }
        return l - r;
    case '*':
        if (resType == Type::INT && lt == Type::INT && rt == Type::INT) {
            return asIntOp([](long long a, long long b) { return a * b; });
        }
        return l * r;
    case '/':
        return l / r;
    default:
        return 0.0;
    }
}

std::string formatValue(double v, Type t) {
    if (t == Type::INT) {
        long long iv = static_cast<long long>(std::llround(v));
        return std::to_string(iv);
    }
    std::ostringstream oss;
    oss.setf(std::ios::fmtflags(0), std::ios::floatfield);
    oss << std::setprecision(15) << v;
    std::string s = oss.str();
    if (s.find('.') == std::string::npos && s.find('e') == std::string::npos &&
        s.find('E') == std::string::npos) {
        return s + ".0";
    }
    return s;
}

} // namespace

std::string Evaluator::evaluate(const TacProgram& program, std::string& outError) {
    outError.clear();

    if (program.instructions.empty()) {
        try {
            Resolved r = resolve(program.resultName, {}, {});
            return formatValue(r.value, program.resultType);
        } catch (...) {
            outError = "Runtime error: invalid literal";
            return {};
        }
    }

    std::unordered_map<std::string, double> values;
    std::unordered_map<std::string, Type> types;

    try {
        for (const TAC& tac : program.instructions) {
            Resolved left = resolve(tac.arg1, values, types);
            Resolved right = resolve(tac.arg2, values, types);

            if (tac.op == "/" && right.value == 0.0) {
                outError = "Runtime error: division by zero";
                return {};
            }

            double out =
                applyBinary(tac.op[0], left.value, right.value, left.type, right.type, tac.resultType);
            values[tac.result] = out;
            types[tac.result] = tac.resultType;
        }

        double finalV = values.at(program.resultName);
        return formatValue(finalV, program.resultType);
    } catch (const std::exception& e) {
        outError = std::string("Runtime error: ") + e.what();
        return {};
    }
}
