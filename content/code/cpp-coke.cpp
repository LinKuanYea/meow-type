#include <iostream>
using namespace std;

int main() {
    int money, coke, bottle;
    cin >> money;
    coke = money / 27;
    bottle = coke;

    while (bottle >= 4) {
        bottle = bottle - 4;
        coke = coke + 1;
        bottle = bottle + 1;
    }

    cout << coke << " " << bottle;
}
