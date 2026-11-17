N = int(input())

isPrime = True
for i in range(2, N):
    if N % i == 0:
        print(f'{N}會被{i}整除，所以不是質數。')
        isPrime = False
        break

if isPrime:
    print(f'{N}是質數！')
