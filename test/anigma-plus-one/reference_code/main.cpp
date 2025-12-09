#include <iostream>
#include <fstream>

// 이것은 원본 reference code입니다
// 편집 거리 계산용으로 사용됩니다

int main(int argc, char* argv[]) {
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




