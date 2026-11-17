#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int nums[n];

    for (int i = 0; i <= n-1; i = i + 1) {
        cin >> nums[i];
    }

    for (int t = 1; t <= n-1; t = t + 1) {
        for (int i = 0; i <= n-2; i = i + 1) {
            if (nums[i] > nums[i+1]) {
                int wang = nums[i];
                nums[i] = nums[i+1];
                nums[i+1] = wang;
            }
        }

        for (int i = 0; i <= n-1; i = i + 1) {
            cout << nums[i] << " ";
        }
        cout << "\n";
    }
}
