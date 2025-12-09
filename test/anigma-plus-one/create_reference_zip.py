#!/usr/bin/env python3

import zipfile
from pathlib import Path

# 현재 스크립트 위치
script_dir = Path(__file__).parent.absolute()
reference_dir = script_dir / "reference_code"

# ZIP 파일 이름
zip_name = "reference_code.zip"
zip_path = script_dir / zip_name

# 필요한 파일들
files_to_zip = ["main.cpp", "Makefile"]

print(f"Reference code ZIP 파일 생성 중: {zip_path}")

# ZIP 파일 생성
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
    for filename in files_to_zip:
        file_path = reference_dir / filename
        if file_path.exists():
            zipf.write(file_path, arcname=filename)
            print(f"  ✅ {filename} 추가")
        else:
            print(f"  ❌ {filename} 파일을 찾을 수 없습니다.")

print(f"\n✅ Reference code ZIP 파일 생성 완료: {zip_path}")
print("\nZIP 파일 내용:")

with zipfile.ZipFile(zip_path, "r") as zipf:
    for info in zipf.filelist:
        print(f"  - {info.filename} ({info.file_size} bytes)")

print(f"\nZIP 파일 크기: {zip_path.stat().st_size / 1024:.2f} KB")




