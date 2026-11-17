n = int(input())
scores = list(map(int, input().split()))

total = 0
for score in scores:
    total = total + score

average = total / n

count = 0
for score in scores:
    if score > average:
        count = count + 1

print(f'{total}\n{average:.2f}\n{count}')
