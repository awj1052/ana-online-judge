# Reference code Makefile
CXX = g++
CXXFLAGS = -std=c++17 -O2 -Wall
TARGET = solution

build:
	@$(CXX) $(CXXFLAGS) -o $(TARGET) main.cpp

run:
	@./$(TARGET) $(INPUT)

clean:
	rm -f $(TARGET)

.PHONY: build run clean

