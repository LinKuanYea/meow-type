height, weight = input().split()
height = float(height) / 100
weight = float(weight)

bmi = weight / (height ** 2)

print(f'BMI:{bmi:.1f}')

if (bmi < 18):
    print('Underweight')

else:
    if (bmi < 24):
        print('Normal')
    else:
        print('Overweight')
