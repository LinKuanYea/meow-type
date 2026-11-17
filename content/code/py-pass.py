n = int(input())
scores = list(map(int, input().split()))
passed = []
failed = []

for score in scores:
    if score >= 60:
        passed.append(score)
    else:
        failed.append(score)

if passed:
    print(*passed)
else:
    print('none')

if failed:
    print(*failed)
else:
    print('none')
