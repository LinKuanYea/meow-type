nums = map(int, input().split())

max_num = '?'
for n in nums:
    if max_num == '?' or n > max_num:
        max_num = n

print(max_num)
