#include <iostream>
#include <fstream>

int main(int argc, char* argv[]) {
    // args로 입력 파일 경로 받기
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <input_file>" << std::endl;
        return 1;
    }

    std::ifstream input_file(argv[1]);
    if (!input_file.is_open()) {
        std::cerr << "Error: Cannot open file " << argv[1] << std::endl;
        return 1;
    }

    int num;
    input_file >> num;
    input_file.close();

    // 정수 + 1 출력
    std::cout << num + 1 << std::endl;

    return 0;
}




