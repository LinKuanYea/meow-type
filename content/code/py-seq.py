a1, a2, n = input().split()
a1 = int(a1)
a2 = int(a2)
n = int(n)

a = a1
d = a2 - a1

for i in range(n-1):
    print(a, end=',')
    a += d

print(a, end='')
