"""
Compilation pipeline for the Expression Compiler Visualizer API.
Mirrors the C++ compiler behavior (lexer, parser, fold, type-check, TAC, assembly).
"""

from __future__ import annotations

import dataclasses
import math
import re
from typing import Any, Dict, List, Optional, Tuple, Union

# ── AST ───────────────────────────────────────────────────────────────


@dataclasses.dataclass
class Num:
    value: float
    is_int: bool
    result_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "number",
            "value": self.value,
            "isInt": self.is_int,
            "resultType": self.result_type,
        }


@dataclasses.dataclass
class BinOp:
    op: str
    left: "Ast"
    right: "Ast"
    result_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "binary",
            "op": self.op,
            "resultType": self.result_type,
            "children": [self.left.to_dict(), self.right.to_dict()],
        }


Ast = Union[Num, BinOp]


def clone_ast(node: Ast) -> Ast:
    if isinstance(node, Num):
        return Num(node.value, node.is_int, node.result_type)
    return BinOp(node.op, clone_ast(node.left), clone_ast(node.right), node.result_type)


def ast_to_dict(node: Ast) -> Dict[str, Any]:
    return node.to_dict()


# ── Lexer ─────────────────────────────────────────────────────────────


class LexError(Exception):
    def __init__(self, message: str, line: int, col: int):
        super().__init__(message)
        self.line = line
        self.column = col


def _lex_manual(expr: str) -> List[Dict[str, Any]]:
    """Character-level lexer matching C++ behavior (5., 5..5)."""
    tokens: List[Dict[str, Any]] = []
    i, n = 0, len(expr)
    line, col = 1, 1

    def err(msg: str) -> None:
        raise LexError(msg, line, col)

    while i < n:
        c = expr[i]
        if c in " \t\r\n":
            if c == "\n":
                line += 1
                col = 1
            else:
                col += 1
            i += 1
            continue
        start_line, start_col = line, col
        if c.isdigit():
            j = i
            while j < n and expr[j].isdigit():
                j += 1
            if j < n and expr[j] == ".":
                j += 1
                if j < n and expr[j] == ".":
                    raise LexError("invalid number (multiple dots)", line, col + (j - i))
                if j >= n or not expr[j].isdigit():
                    raise LexError("invalid number (digit expected after '.')", line, col + (j - i))
                k = j
                while k < n and expr[k].isdigit():
                    k += 1
                num = float(expr[i:k])
                tokens.append({"kind": "FLOAT", "value": num, "line": start_line, "column": start_col, "lexeme": expr[i:k]})
                col += k - i
                i = k
                continue
            num = int(expr[i:j])
            tokens.append({"kind": "INT", "value": num, "line": start_line, "column": start_col, "lexeme": expr[i:j]})
            col += j - i
            i = j
            continue
        m = {"+": "PLUS", "-": "MINUS", "*": "MULTIPLY", "/": "DIVIDE", "(": "LPAREN", ")": "RPAREN"}.get(c)
        if m:
            tokens.append({"kind": m, "line": line, "column": col, "lexeme": c})
            col += 1
            i += 1
            continue
        err(f"unknown character {c!r}")

    tokens.append({"kind": "EOF", "line": line, "column": col, "lexeme": ""})
    return tokens


def tokenize(expr: str) -> List[Dict[str, Any]]:
    return _lex_manual(expr.strip())


def tokens_to_tags(tokens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for t in tokens:
        if t["kind"] == "EOF":
            break
        k = t["kind"]
        if k == "INT":
            out.append({**t, "tag": f"[INT:{t['value']}]"})
        elif k == "FLOAT":
            out.append({**t, "tag": f"[FLOAT:{_fmt_float(t['value'])}]"})
        elif k == "PLUS":
            out.append({**t, "tag": "[+]"})
        elif k == "MINUS":
            out.append({**t, "tag": "[−]"})
        elif k == "MULTIPLY":
            out.append({**t, "tag": "[*]"})
        elif k == "DIVIDE":
            out.append({**t, "tag": "[/]"})
        elif k == "LPAREN":
            out.append({**t, "tag": "[(]"})
        elif k == "RPAREN":
            out.append({**t, "tag": "[)]"})
        else:
            out.append({**t, "tag": f"[{k}]"})
    return out


# ── Parser ───────────────────────────────────────────────────────────


class ParseError(Exception):
    def __init__(self, message: str, line: int, col: int):
        super().__init__(message)
        self.line = line
        self.column = col


class Parser:
    def __init__(self, tokens: List[Dict[str, Any]]):
        self.toks = tokens
        self.i = 0

    def peek(self) -> Dict[str, Any]:
        return self.toks[self.i] if self.i < len(self.toks) else {"kind": "EOF", "line": 1, "column": 1}

    def advance(self) -> None:
        if self.peek()["kind"] != "EOF":
            self.i += 1

    def parse(self) -> Ast:
        e = self.parse_e()
        if self.peek()["kind"] != "EOF":
            t = self.peek()
            raise ParseError("expected end of expression", t["line"], t["column"])
        return e

    def parse_e(self) -> Ast:
        t = self.parse_t()
        return self.parse_e_prime(t)

    def parse_e_prime(self, lhs: Ast) -> Ast:
        while self.peek()["kind"] in ("PLUS", "MINUS"):
            op = "+" if self.peek()["kind"] == "PLUS" else "-"
            self.advance()
            rhs = self.parse_t()
            lhs = BinOp(op, lhs, rhs)
        return lhs

    def parse_t(self) -> Ast:
        f = self.parse_f()
        return self.parse_t_prime(f)

    def parse_t_prime(self, lhs: Ast) -> Ast:
        while self.peek()["kind"] in ("MULTIPLY", "DIVIDE"):
            op = "*" if self.peek()["kind"] == "MULTIPLY" else "/"
            self.advance()
            rhs = self.parse_f()
            lhs = BinOp(op, lhs, rhs)
        return lhs

    def parse_f(self) -> Ast:
        t = self.peek()
        if t["kind"] == "INT":
            self.advance()
            return Num(float(t["value"]), True)
        if t["kind"] == "FLOAT":
            self.advance()
            return Num(t["value"], False)
        if t["kind"] == "LPAREN":
            self.advance()
            inner = self.parse_e()
            if self.peek()["kind"] != "RPAREN":
                raise ParseError("expected ')'", self.peek()["line"], self.peek()["column"])
            self.advance()
            return inner
        raise ParseError("expected number or '(", t["line"], t["column"])


# ── Type check ───────────────────────────────────────────────────────


def type_check(node: Ast) -> str:
    if isinstance(node, Num):
        node.result_type = "int" if node.is_int else "float"
        return node.result_type
    assert isinstance(node, BinOp)
    lt = type_check(node.left)
    rt = type_check(node.right)
    if node.op == "/":
        node.result_type = "float"
    else:
        node.result_type = "float" if (lt == "float" or rt == "float") else "int"
    return node.result_type


# ── Constant fold (root preserved) ────────────────────────────────────


def _fold_apply(op: str, a: Num, b: Num) -> Num:
    li, ri = int(round(a.value)), int(round(b.value))
    if op == "/":
        return Num(a.value / b.value, False)
    both_int = a.is_int and b.is_int
    if both_int and op in "+-*":
        if op == "+":
            return Num(float(li + ri), True)
        if op == "-":
            return Num(float(li - ri), True)
        return Num(float(li * ri), True)
    if op == "+":
        return Num(a.value + b.value, False)
    if op == "-":
        return Num(a.value - b.value, False)
    return Num(a.value * b.value, False)


def fold_ast(node: Ast, is_root: bool = True) -> Ast:
    if isinstance(node, Num):
        return Num(node.value, node.is_int, node.result_type)
    assert isinstance(node, BinOp)
    left = fold_ast(node.left, False)
    right = fold_ast(node.right, False)
    if (
        not is_root
        and isinstance(left, Num)
        and isinstance(right, Num)
    ):
        return _fold_apply(node.op, left, right)
    return BinOp(node.op, left, right, node.result_type)


# ── TAC ────────────────────────────────────────────────────────────────


@dataclasses.dataclass
class TacInstr:
    result: str
    arg1: str
    op: str
    arg2: str


def _fmt_lit(n: Num) -> str:
    if n.is_int:
        return str(int(round(n.value)))
    s = _fmt_float(n.value)
    if "." not in s.lower():
        return s + ".0"
    return s


def _fmt_float(v: float) -> str:
    if abs(v - round(v)) < 1e-9 and abs(v) < 1e15:
        iv = int(round(v))
        return str(iv)
    return repr(v) if "e" in str(v).lower() else ("%s" % v).rstrip("0").rstrip(".") if "." in ("%s" % v) else str(v)


def gen_tac(node: Ast, out: List[TacInstr], tmp: List[int]) -> str:
    if isinstance(node, Num):
        return _fmt_lit(node)
    assert isinstance(node, BinOp)
    a1 = gen_tac(node.left, out, tmp)
    a2 = gen_tac(node.right, out, tmp)
    tmp[0] += 1
    t = f"t{tmp[0]}"
    out.append(TacInstr(t, a1, node.op, a2))
    return t


def tac_to_lines(instrs: List[TacInstr]) -> List[str]:
    return [f"{i.result} = {i.arg1} {i.op} {i.arg2}" for i in instrs]


# ── Assembly (same pattern as C++) ────────────────────────────────────


def tac_to_assembly(instrs: List[TacInstr]) -> List[str]:
    lines: List[str] = []
    mnem = {"+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV"}
    for ins in instrs:
        lines.append(f"MOV R0, {ins.arg1}")
        lines.append(f"MOV R1, {ins.arg2}")
        lines.append(f"{mnem.get(ins.op, 'OP')} R0, R1")
        lines.append(f"MOV {ins.result}, R0")
    return lines


# ── IR optimization (constant-fold TAC lines where possible) ─────────


def _is_num(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def _parse_tac_line(line: str) -> Optional[Tuple[str, str, str, str]]:
    m = re.match(r"^(t\d+)\s*=\s*(\S+)\s*([+\-*/])\s*(\S+)\s*$", line)
    if not m:
        return None
    return m.group(1), m.group(2), m.group(3), m.group(4)


def optimize_ir_tac(lines: List[str]) -> Tuple[List[str], List[str], List[int]]:
    """Peephole: fold ops whose *syntactic* operands are both literals (no cross-line const prop)."""
    before = lines[:]
    after: List[str] = []
    removed_idx: List[int] = []

    def apply_op(op: str, x: float, y: float) -> float:
        if op == "+":
            return x + y
        if op == "-":
            return x - y
        if op == "*":
            return x * y
        return x / y if y != 0 else float("nan")

    for idx, line in enumerate(before):
        p = _parse_tac_line(line)
        if not p:
            after.append(line)
            continue
        res, a1, op, a2 = p
        if _is_num(a1) and _is_num(a2):
            fv = apply_op(op, float(a1), float(a2))
            if math.isnan(fv):
                after.append(line)
                continue
            is_float = op == "/" or abs(fv - round(fv)) > 1e-9
            if is_float:
                lit = ("%.10g" % fv).replace("e", "e")
                if "." not in lit and "e" not in lit.lower():
                    lit = lit + ".0"
            else:
                lit = str(int(round(fv)))
            after.append(f"{res} = {lit}")
            removed_idx.append(idx)
        else:
            after.append(line)

    return before, after, removed_idx


# ── Instruction selection & scheduling (demo) ────────────────────────


def build_instruction_selection(tac_lines: List[str], asm: List[str]) -> List[Dict[str, Any]]:
    """Group assembly lines per TAC instruction (4 asm per tac)."""
    out: List[Dict[str, Any]] = []
    asm_per_tac = 4
    for i, tac in enumerate(tac_lines):
        chunk = asm[i * asm_per_tac : (i + 1) * asm_per_tac]
        out.append({"tac": tac, "microOps": chunk})
    return out


def build_register_allocation(asm: List[str]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    seen: Dict[str, str] = {}
    for line in asm:
        if line.startswith("MOV R0, ") or line.startswith("MOV R1, "):
            reg = line[4:6]
            val = line.split(", ", 1)[1].strip()
            seen[reg] = val
            rows.append({"register": reg, "value": val, "instruction": line})
    # dedupe final snapshot
    snap: Dict[str, str] = {}
    for r in rows:
        snap[r["register"]] = r["value"]
    return [{"register": k, "value": v} for k, v in snap.items()]


def schedule_instructions(asm: List[str]) -> Tuple[List[str], List[str]]:
    """Mock scheduling: interleave loads from consecutive blocks (visualization only)."""
    if len(asm) < 8:
        return asm, asm[:]
    g0, g1 = asm[0:4], asm[4:8]
    interleaved = [g0[0], g1[0], g0[1], g1[1], g0[2], g1[2], g0[3], g1[3]] + asm[8:]
    return asm, interleaved


def mock_machine_code(asm: List[str]) -> List[str]:
    out: List[str] = []
    for line in asm:
        h = abs(hash(line)) % (256**4)
        bits = f"{h:032b}"
        out.append(" ".join(bits[i : i + 8] for i in range(0, 32, 8)))
    return out


# ── Evaluate TAC (division by zero) ───────────────────────────────────


def eval_tac(lines: List[str]) -> Tuple[Optional[float], Optional[str]]:
    vals: Dict[str, float] = {}

    def val(x: str) -> float:
        if x in vals:
            return vals[x]
        return float(x)

    for line in lines:
        p = _parse_tac_line(line)
        if p:
            res, a1, op, a2 = p
            u, v = val(a1), val(a2)
            if op == "/" and v == 0:
                return None, "Runtime error: division by zero"
            if op == "+":
                vals[res] = u + v
            elif op == "-":
                vals[res] = u - v
            elif op == "*":
                vals[res] = u * v
            else:
                vals[res] = u / v
            continue
        m = re.match(r"^(t\d+)\s*=\s*(\S+)\s*$", line)
        if m:
            vals[m.group(1)] = float(m.group(2))

    if not lines:
        return None, None
    last = lines[-1]
    pm = _parse_tac_line(last)
    if pm:
        return vals.get(pm[0]), None
    m2 = re.match(r"^(t\d+)\s*=\s*(\S+)\s*$", last)
    if m2:
        return vals.get(m2.group(1)), None
    return None, "cannot evaluate"


# ── Public API ────────────────────────────────────────────────────────


def compile_expression(expr: str) -> Dict[str, Any]:
    expr = expr.strip()
    if not expr:
        return {"ok": False, "phase": "input", "message": "Expression is empty"}

    try:
        raw_tokens = tokenize(expr)
    except LexError as e:
        return {
            "ok": False,
            "phase": "lexical",
            "message": str(e),
            "line": e.line,
            "column": e.column,
        }

    token_views = tokens_to_tags(raw_tokens)

    try:
        ast = Parser(raw_tokens).parse()
    except ParseError as e:
        return {
            "ok": False,
            "phase": "syntax",
            "message": str(e),
            "line": e.line,
            "column": e.column,
            "tokens": token_views,
        }

    type_check(ast)
    optimized = fold_ast(clone_ast(ast), True)
    type_check(optimized)

    tmp = [0]
    instrs: List[TacInstr] = []
    gen_tac(ast, instrs, tmp)
    tac_lines = tac_to_lines(instrs)
    asm = tac_to_assembly(instrs)

    before_ir, after_ir, removed = optimize_ir_tac(tac_lines)

    instr_sel = build_instruction_selection(tac_lines, asm)
    reg_alloc = build_register_allocation(asm)
    before_sched, after_sched = schedule_instructions(asm)

    machine = mock_machine_code(after_sched)

    result_val, err = eval_tac(tac_lines)
    root_ty: str
    if isinstance(optimized, BinOp):
        root_ty = optimized.result_type or "float"
    else:
        root_ty = optimized.result_type or "int"

    if err:
        return {
            "ok": False,
            "phase": "runtime",
            "message": err,
            "tokens": token_views,
            "ast": ast_to_dict(ast),
            "optimizedAst": ast_to_dict(optimized),
            "tac": tac_lines,
            "irOptimization": {"before": before_ir, "after": after_ir, "removedIndices": removed},
            "optimizedTac": after_ir,
            "instructionSelection": instr_sel,
            "registerAllocation": reg_alloc,
            "scheduling": {"before": before_sched, "after": after_sched},
            "assembly": asm,
            "machineCode": machine,
            "result": None,
            "type": root_ty,
        }

    assert result_val is not None

    return {
        "ok": True,
        "tokens": token_views,
        "ast": ast_to_dict(ast),
        "optimizedAst": ast_to_dict(optimized),
        "tac": tac_lines,
        "irOptimization": {"before": before_ir, "after": after_ir, "removedIndices": removed},
        "optimizedTac": after_ir,
        "instructionSelection": instr_sel,
        "registerAllocation": reg_alloc,
        "scheduling": {"before": before_sched, "after": after_sched},
        "assembly": asm,
        "machineCode": machine,
        "result": result_val,
        "type": root_ty,
    }
