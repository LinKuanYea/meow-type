def transformInput(x):
    x = float(x)
    if (x % 1 == 0):
        x = int(x)
    return x

x, y = input().split()
x = transformInput(x)
y = transformInput(y)

if (x > y):
    print(x)
else:
    print(y)
