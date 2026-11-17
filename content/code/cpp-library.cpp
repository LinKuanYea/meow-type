#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int books[n];
    for (int i = 0; i <= n-1; i = i + 1) {
        cin >> books[i];
    }

    for (int t = 1; t <= n-1; t = t + 1) {
        for (int i = 0; i <= n-2; i = i + 1) {
            if (books[i] > books[i+1]) {
                int temp = books[i];
                books[i] = books[i + 1];
                books[i + 1] = temp;
            }
        }
    }
    int x;
    cin >> x;
    int ans = -1, pre = -1, post = -1;
    for (int i = 0; i <= n-1; i = i + 1) {
        if (x == books[i]) {
            ans = i;
        }
        if (x > books[i]) {
            pre = i;
        }
        if (x < books[i]) {
            post = i;
            break;
        }
    }

    if (ans != -1) {
        if (pre != -1) {
            cout << books[pre] << " ";
        }
        cout << books[ans];
        if (post != -1) {
            cout << " " << books[post];
        }
    }
    else {
        if (pre != -1) {
            cout << books[pre] << " ";
        }
        if (post != -1) {
            cout << books[post];
        }
    }
}
