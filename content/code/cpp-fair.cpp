#include <iostream>
using namespace std;

int main() {
    int score[7];

    for (int i = 0; i <= 6; i = i + 1) {
        cin >> score[i];
    }

    int max, min = score[0];
    max = score[0];
    for (int i = 1; i <= 6; i = i + 1) {
        if (score[i] > max) {
            max = score[i];
        }
    }

    for (int i = 1; i <= 6; i = i + 1) {
        if (score[i] < min) {
            min = score[i];
        }
    }

    float average = 0;
    for (int i = 0; i <= 6; i = i + 1) {
        average = average + score[i];
    }
    average = (average - max - min)/5.0;
    cout << average;
}
