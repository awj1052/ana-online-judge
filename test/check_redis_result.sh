#!/bin/bash

# Redis에서 ANIGMA 결과 확인
SUBMISSION_ID=${1:-52}

echo "=== ANIGMA 결과 확인: submission_id=$SUBMISSION_ID ==="
echo ""

# Redis에서 결과 가져오기
RESULT=$(docker exec aoj-redis redis-cli GET "anigma:result:$SUBMISSION_ID")

if [ -z "$RESULT" ]; then
    echo "❌ Redis에 결과가 없습니다. DB에서 확인합니다..."
    echo ""
    docker exec aoj-postgres psql -U postgres -d aoj -c "SELECT id, verdict, score, error_message FROM submissions WHERE id = $SUBMISSION_ID;"
else
    echo "✅ Redis 결과:"
    echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data, indent=2, ensure_ascii=False))"
    
    echo ""
    echo "=== 테스트케이스 결과 상세 ==="
    echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for i, tc in enumerate(data.get('testcase_results', []), 1):
    print(f'\\n테스트케이스 {i}:')
    print(f'  Verdict: {tc[\"verdict\"]}')
    print(f'  Time: {tc.get(\"execution_time\")}ms')
    print(f'  Memory: {tc.get(\"memory_used\")}KB')
    if 'output' in tc:
        print(f'  Output: {tc[\"output\"][:200]}...' if len(tc.get('output', '')) > 200 else f'  Output: {tc.get(\"output\", \"\")}')
"
fi




