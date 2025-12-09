#!/usr/bin/env python3
"""MinIO 테스트케이스 다운로드 테스트"""

import subprocess
import json

# MinIO에서 테스트케이스 다운로드 테스트
print("=== MinIO 테스트케이스 다운로드 테스트 ===\n")

# Web 컨테이너에서 MinIO 다운로드 테스트
test_script = """
import asyncio
from lib.storage import downloadFile

async def test():
    try:
        content = await downloadFile('problems/3/testcases/1_input.txt')
        print('Input content:', content.decode('utf-8'))
        
        content2 = await downloadFile('problems/3/testcases/1_output.txt')
        print('Output content:', content2.decode('utf-8'))
    except Exception as e:
        print('Error:', e)

asyncio.run(test())
"""

print("Web 컨테이너에서 테스트케이스 다운로드 테스트:")
result = subprocess.run(
    ['docker', 'exec', 'aoj-web', 'node', '-e', 
     'require("./dist/lib/storage").downloadFile("problems/3/testcases/1_input.txt").then(b => console.log(b.toString()))'],
    capture_output=True,
    text=True
)
print("stdout:", result.stdout)
print("stderr:", result.stderr)




