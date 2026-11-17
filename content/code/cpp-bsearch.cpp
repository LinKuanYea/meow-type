#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int nums[n];
    for (int i = 0; i <= n-1; i = i + 1) {
        cin >> nums[i];
    }
    int x;
    cin >> x;

    int left = 0, right = n-1;
    bool found = false;
    while (right - left >= 0) {
        int mid = (left + right) / 2;
        cout << left << " " << right << " " << mid << " " << nums[mid];
        cout << "\n";
        if (nums[mid] == x) {
            cout << "找到";
            found = true;
            break;
        }
        else if (nums[mid] < x) {
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }
    if (!found) {
        cout << "找不到";
    }
}
