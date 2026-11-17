money = int(input())
coke = money // 27
bottle = coke

while bottle >= 4:
    ex = bottle // 4
    bottle = bottle % 4
    bottle += ex
    coke += ex

print(f'{coke} {bottle}')
