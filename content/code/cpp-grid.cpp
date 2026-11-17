#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    for (int m = 0; m <= a-1; m = m + 1) {
        for (int n = 0; n <= b-1; n = n + 1) {
            cout << "(" << m << " " << n << ")";
        }
        cout << "\n";
    }
}
