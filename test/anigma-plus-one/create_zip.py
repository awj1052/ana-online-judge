#!/usr/bin/env python3

import os
import zipfile
from pathlib import Path

# 현재 스크립트 위치
script_dir = Path(__file__).parent.absolute()

# ZIP 파일 이름
zip_name = "anigma-plus-one.zip"
zip_path = script_dir / zip_name

# 필요한 파일들
files_to_zip = ["main.cpp", "Makefile"]

print(f"ZIP 파일 생성 중: {zip_path}")

# ZIP 파일 생성 (최상위에 Makefile과 main.cpp가 있도록)
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
    for filename in files_to_zip:
        file_path = script_dir / filename
        if file_path.exists():
            # arcname을 사용하여 ZIP 내부에서 파일이 최상위에 위치하도록 함
            zipf.write(file_path, arcname=filename)
            print(f"  ✅ {filename} 추가")
        else:
            print(f"  ❌ {filename} 파일을 찾을 수 없습니다.")

print(f"\n✅ ZIP 파일 생성 완료: {zip_path}")
print("\nZIP 파일 내용:")

# ZIP 파일 내용 확인
with zipfile.ZipFile(zip_path, "r") as zipf:
    for info in zipf.filelist:
        print(f"  - {info.filename} ({info.file_size} bytes)")

print(f"\nZIP 파일 크기: {zip_path.stat().st_size / 1024:.2f} KB")




