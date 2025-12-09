#!/bin/bash

# ANIGMA 제출용 ZIP 파일 생성 스크립트

# 현재 스크립트 위치
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ZIP 파일 이름
ZIP_NAME="anigma-plus-one.zip"

# 임시 디렉토리 생성
TMP_DIR=$(mktemp -d)
echo "임시 디렉토리 생성: $TMP_DIR"

# 필요한 파일들을 임시 디렉토리의 최상위에 복사
cp "$SCRIPT_DIR/main.cpp" "$TMP_DIR/"
cp "$SCRIPT_DIR/Makefile" "$TMP_DIR/"

# ZIP 파일 생성 (최상위에 Makefile과 main.cpp가 있도록)
cd "$TMP_DIR"
zip -r "$ZIP_NAME" main.cpp Makefile

# ZIP 파일을 원래 위치로 복사
mv "$ZIP_NAME" "$SCRIPT_DIR/"

# 임시 디렉토리 정리
cd "$SCRIPT_DIR"
rm -rf "$TMP_DIR"

echo "✅ ZIP 파일 생성 완료: $SCRIPT_DIR/$ZIP_NAME"
echo ""
echo "ZIP 파일 내용:"
unzip -l "$SCRIPT_DIR/$ZIP_NAME"




