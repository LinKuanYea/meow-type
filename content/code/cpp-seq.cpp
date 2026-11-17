#include <iostream>
using namespace std;

int main() {
    int a1, a2, n, a;
    cin >> a1 >> a2 >> n;
    int d = a2 - a1;

    a = a1;
    cout << a;

    for (int t = 1; t <= n-1; t = t + 1) {
        a = a + d;
        cout << "," << a;
    }
}
