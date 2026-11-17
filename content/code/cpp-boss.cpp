#include <iostream>
using namespace std;

int main() {
    int hp = 100;
    int atk;
    cin >> atk;

    while (hp > 0) {
        hp = hp - atk;
        cout << "hp = " << hp << endl;
    }
}
