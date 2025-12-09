#!/usr/bin/env python3
"""
MinIO 다운로드 테스트 스크립트
Judge 서버가 MinIO에서 파일을 다운로드할 수 있는지 테스트
"""

import subprocess
import json

# Judge 컨테이너에서 환경변수 확인
print("=== Judge 컨테이너 환경변수 확인 ===")
env_cmd = "docker exec aoj-judge env | grep MINIO"
result = subprocess.run(env_cmd, shell=True, capture_output=True, text=True)
print(result.stdout)

# PostgreSQL에서 최근 ANIGMA 제출 확인
print("\n=== 최근 ANIGMA 제출 확인 ===")
sql = "SELECT id, zip_path FROM submissions WHERE zip_path IS NOT NULL ORDER BY id DESC LIMIT 1;"
pg_cmd = f'docker exec aoj-postgres psql -U postgres -d aoj -t -c "{sql}"'
result = subprocess.run(pg_cmd, shell=True, capture_output=True, text=True)
print(result.stdout)

if result.stdout.strip():
    parts = result.stdout.strip().split('|')
    if len(parts) >= 2:
        zip_path = parts[1].strip()
        print(f"ZIP 경로: {zip_path}")
        
        # MinIO에서 직접 다운로드 테스트 (웹 서버 컨테이너에서)
        print("\n=== 웹 서버에서 MinIO 다운로드 테스트 ===")
        test_script = f'''
import os
from aws_sdk_s3 import Client
from aws_config import BehaviorVersion
from aws_sdk_s3.config import Credentials, Region

endpoint = os.getenv("MINIO_ENDPOINT", "minio")
port = os.getenv("MINIO_PORT", "9000")
bucket = os.getenv("MINIO_BUCKET", "aoj-storage")

print(f"Endpoint: http://{{endpoint}}:{{port}}")
print(f"Bucket: {{bucket}}")
print(f"Key: {zip_path}")
'''
        print("(이 스크립트는 실제 실행되지 않습니다 - 참고용)")

print("\n=== MinIO 버킷 내용 확인 ===")
minio_cmd = f"docker exec aoj-minio sh -c 'find /data/aoj-storage/submissions/anigma -name \"*.zip\" -o -name xl.meta' 2>/dev/null | head -20"
result = subprocess.run(minio_cmd, shell=True, capture_output=True, text=True)
print(result.stdout if result.stdout else "파일을 찾을 수 없습니다")




