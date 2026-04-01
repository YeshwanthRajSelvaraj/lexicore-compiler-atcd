# Expression Compiler — Design Notes

## Number lexer (DFA-style)

States can be viewed as:

1. **Start** — skip whitespace; on digit, enter **integer** accumulators and remain in **whole**; on `.` without a leading digit, treat as invalid (not used here; `.` alone is unknown char).
2. **Whole** — consume digits. On end or non-`.` delimiter, emit **INT** and reset.
3. After consuming `.` from a whole number:
   - If next char is `.` → **error** (multiple dots).
   - If next char is not a digit → **error** (trailing dot / `5.`).
   - Else enter **fraction**, consume digits with place value \(0.1, 0.01, …\), then emit **FLOAT**.

Invalid characters produce an **ERROR** token with line/column of the offending character.

## AST structure

- `NumberNode` — `double value`, `bool isInt` (literal kind after lexing / folding).
- `BinaryOpNode` — `std::unique_ptr<ASTNode> left, right`, `char op` in `{ '+', '-', '*', '/' }`, `Type resultType` filled by the type checker.

`cloneAst()` performs a deep copy and copies `resultType` on `BinaryOpNode` so the optimizer can fold a clone while the original stays available for TAC generation.

## Pipeline order

1. **Lex** → token list (stop on first lexical error).
2. **Parse** → AST; print **SYNTAX** tree (`printTree`).
3. **Type-check** the parsed AST (annotates `resultType` for codegen).
4. **Optimize** — `ConstantFolder::fold(cloneAst(ast))`; inner `BinaryOpNode`s whose children are both literals are replaced by a `NumberNode`. The **root** `BinaryOpNode` is never folded so the top-level form of the expression is preserved (matches the reference optimized-tree examples such as `5 + 5.0`).
5. Print **OPTIMIZED AST**.
6. **Type-check** the optimized AST to report the final **expression type** (same as the original for all current tests).
7. **TAC** is generated from the **original, type-annotated** AST so instruction order follows the pre-fold structure (e.g. `t1 = 2.5 * 2` then `t2 = 5 + t1`), while the optimized tree still shows constant folding of subexpressions.
8. **Assembly** — each TAC line becomes `MOV R0, arg1`; `MOV R1, arg2`; `ADD|SUB|MUL|DIV R0, R1`; `MOV result, R0`.
9. **Evaluation** interprets TAC for a numeric result or division-by-zero.

## Type rules

- `+`, `-`, `*`: if either operand is `FLOAT`, result `FLOAT`; else `INT`.
- `/`: result is always `FLOAT` (including `int / int`).

## Assembly model

Target is a textual register machine: operands load into `R0` and `R1`, the ALU opcode leaves the result in `R0`, then the temporary or result name is updated. No global register allocator; temporaries (`t1`, `t2`, …) are named storage slots in the printed listing, consistent with the sample output format.
