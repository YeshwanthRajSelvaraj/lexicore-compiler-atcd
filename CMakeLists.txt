cmake_minimum_required(VERSION 3.14)
project(expr_compiler LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(compiler
    main.cpp
    compiler.cpp
    lexer.cpp
    parser.cpp
    ast.cpp
    optimizer.cpp
    type_checker.cpp
    tac.cpp
    assembly_gen.cpp
    evaluator.cpp
    token.cpp
)

target_include_directories(compiler PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
