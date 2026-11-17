#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int scores[n];

    for (int i = 0; i <= n-1; i = i + 1) {
        cin >> scores[i];
    }

    int x;
    cin >> x;

    int ming = 1;
    bool found = false;
    for (int i = 0; i <= n-1; i = i + 1) {
        if (scores[i] > x) {
            ming = ming + 1;
        }
        if (scores[i] == x) {
            found = true;
        }
    }
    if (found) {
        cout << ming;
    }
    else {
        cout << "輸入無效";
    }
}
