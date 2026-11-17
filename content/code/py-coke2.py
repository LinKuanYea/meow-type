money = int(input())
coke = money // 27
bottle = coke
cap = coke
money %= 27

while (bottle >= 4) or (cap > 0) or (money >= 27):
    if bottle >= 4:
        bottle -= 4
        coke += 1
        bottle += 1
        cap += 1

    if cap > 0:
        money += cap * 5
        cap = 0

    if money >= 27:
        money -= 27
        coke += 1
        bottle += 1
        cap += 1
print(f'{coke}\n{bottle}\n{money}')
