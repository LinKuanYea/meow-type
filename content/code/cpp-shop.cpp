#include <iostream>
using namespace std;

int main() {
    int a, b, c, d;
    cin >> a >> b >> c >> d;
    int price = a*b + c*d;

    if (price <= 100) {
        cout << price;
    }
    else if (price % 10 == 9) {
        int result = price * 0.9;
        cout << result;
    }
    else if (price % 8 == 0) {
        int a = price * 0.85;
        if (price * 0.85 - a > 0) {
            int result = price * 0.85 + 1;
            cout << result;
        }
        else {
            cout << price * 0.85;
        }
    }
    else if (price % 100 == 77) {
        int result = (price - 100) * 0.5 + 100 + 0.5;
        cout << result;
    }
    else {
        cout << price - 5;
    }
}
