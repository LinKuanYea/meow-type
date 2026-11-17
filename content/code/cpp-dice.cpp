#include <iostream>
using namespace std;

int main() {
    int vote[7] = {0};
    int n;
    cin >> n;
    int a;

    for (int t = 1; t <= n; t = t + 1) {
        cin >> a;
        vote[a] = vote[a] + 1;
    }
    for (int d = 1; d <= 6; d = d + 1) {
        for (int t = 1; t <= vote[d]; t = t + 1) {
            cout << "*";
        }
        cout << "\n";
    }
}
