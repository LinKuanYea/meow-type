#include <iostream>
using namespace std;

int main() {
    int N;
    cin >> N;
    bool isPrime = true;
    for (int t = 2; t <= N-1; t = t + 1) {
        if (N % t == 0) {
            cout << N << "會被" << t << "整除，所以不是質數。";
            isPrime = false;
            break;
        }
    }

    if (isPrime) {
        cout << N << "是質數！";
    }
}
