# GNU Make — use: make CXX=g++
CXX ?= g++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -O2
INCLUDES = -I.

SOURCES = main.cpp compiler.cpp lexer.cpp parser.cpp ast.cpp optimizer.cpp type_checker.cpp tac.cpp assembly_gen.cpp evaluator.cpp token.cpp
OBJECTS = $(SOURCES:.cpp=.o)
TARGET = compiler

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $@ $(OBJECTS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)
