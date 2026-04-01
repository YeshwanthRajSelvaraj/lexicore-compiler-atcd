# LexiCore Compiler ATCD

A full-stack compiler project for **20CYS315 - Automata Theory and Compiler Design**, combining:

- A modular **C++ expression compiler** (lexer → parser → AST → optimization → TAC → assembly)
- An interactive **Flask web dashboard** for pipeline visualization
- Built-in **Automata Generator** (DFA / Regex-to-DFA visualization + JFLAP `.jff` export)
- A standalone **Code Generator module** (Expression/TAC/C++ conversion + `.cpp` export)
- Professional reporting tools, including **Workflow PDF export**

---

## Project Structure

```text
compiler/
├─ dashboard/                 # Flask app + frontend dashboard
│  ├─ app.py
│  ├─ compiler_pipeline.py
│  ├─ templates/
│  └─ static/
├─ *.cpp / *.h                # Core C++ compiler implementation
├─ CMakeLists.txt
├─ Makefile
└─ DOCUMENTATION.md
```

---

## Core Compiler Pipeline (C++)

The native compiler supports arithmetic expressions with `int` and `float`:

1. Lexical Analysis
2. Syntax Analysis (AST)
3. AST Optimization (constant folding)
4. Semantic Analysis (type checking/promotion)
5. Three-Address Code generation
6. Assembly generation
7. Evaluation / runtime checks

### Example input

```txt
5 + 2.5 * 2
```

---

## Dashboard Features

- Light/Dark theme toggle
- Stage-by-stage visual compilation workflow
- Animated AST rendering
- TAC / IR / Assembly / Machine Code visual blocks
- Automata visualization (Cytoscape)
- JFLAP `.jff` export
- Code Generator module
- Professional PDF workflow report export

---

## Build & Run (C++ Compiler)

### Windows (CMake + MSVC)

```powershell
cmake -S . -B build
cmake --build build --config Release
.\build\Release\compiler.exe "5 + 2.5 * 2"
```

### With bundled tests

```powershell
.\build\Release\compiler.exe
```

---

## Run Dashboard (Flask)

```powershell
cd dashboard
python -m pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

---

## Automata Generator

- **Mode 1:** DFA for number tokens (`int`/`float`)
- **Mode 2:** Regex -> NFA -> DFA conversion (supported subset)
- Export compatible **JFLAP `.jff`** automata files

---

## Code Generator Module

- Expression -> C++ generator
- TAC -> C++ generator
- C++ -> Expression extraction (simple assignment patterns)
- Copy to clipboard and download `generated.cpp`

---

## License

This repository is intended for academic and educational use in ATCD coursework.
