left = int(input())

for t in range(4):
    right = int(input())
    if right > left:
        left, right = right, left

print(left)
