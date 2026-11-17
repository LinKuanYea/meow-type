#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    double c = a;
    cout << a << " / " << b << " = " << c/b << endl;
    cout << a << " = " << b << " * " << a/b << " + " << a%b;
}
