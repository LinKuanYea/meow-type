#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int num[n];

    for (int i = 0; i <= n-1; i = i + 1) {
        cin >> num[i];
    }

    int x;
    cin >> x;
    int ans = -1;

    for (int i = 0; i <= n-1; i = i + 1) {
        if (num[i] == x) {
            ans = i + 1;
            break;
        }
    }

    if (ans != -1) {
        cout << ans;
    }
    else {
        cout << "找不到";
    }
}
