#include <iostream>
using namespace std;

int main() {
    int money, coke, bottle, cap;
    cin >> money;
    coke = money / 27;
    money = money % 27;
    bottle = coke;
    cap = bottle;

    while (bottle >= 4 || cap > 0 || money >= 27) {
        if (bottle >= 4) {
            bottle = bottle - 4;
            coke = coke + 1;
            bottle = bottle + 1;
            cap = cap + 1;
        }
        if (cap > 0) {
            money = money + cap * 5;
            cap = 0;
        }
        if (money >= 27) {
            int buy = money / 27;
            coke = coke + buy;
            bottle = bottle + buy;
            cap = cap + buy;
            money = money % 27;
        }
    }

    cout << coke << "\n" << bottle << "\n" << money;
}
