// 自動產生，不要手動改：改 content/code/ 之後執行 python3 scripts/build-code-bank.py
// 程式來自林老師在 MeowJudge 115-1 的作答（C++：110 班；Python：Python 班），預測輸出的答案由實際執行產生。
export const CODE_UNITS = {"cpp": ["Basic Input and Output", "Operators", "Selection Structure", "Conditional Loop", "Counting Loop", "Array and Search", "Sort"], "py": ["Basic Input and Output", "Selection Structure", "Conditional Loop", "Counting Loop", "List and Iteration"]};
export const CODE = {
 "cpp": [
  {
   "id": "cpp-shop",
   "title": "鳳新福利社大拍賣",
   "unit": "Selection Structure",
   "summary": "讀入兩樣商品的數量和單價，算出總價後，依照五條優惠規則由上往下判斷，只套用第一條符合的規則。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b, c, d;\n    cin >> a >> b >> c >> d;\n    int price = a*b + c*d;\n\n    if (price <= 100) {\n        cout << price;\n    }\n    else if (price % 10 == 9) {\n        int result = price * 0.9;\n        cout << result;\n    }\n    else if (price % 8 == 0) {\n        int a = price * 0.85;\n        if (price * 0.85 - a > 0) {\n            int result = price * 0.85 + 1;\n            cout << result;\n        }\n        else {\n            cout << price * 0.85;\n        }\n    }\n    else if (price % 100 == 77) {\n        int result = (price - 100) * 0.5 + 100 + 0.5;\n        cout << result;\n    }\n    else {\n        cout << price - 5;\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "兩行的「數量 × 單價」加起來就是總價。",
    "8": "規則一：100 元以內不打折。",
    "11": "規則二：個位數是 9，打 9 折。",
    "12": "小數存進 int 會直接捨去，等於「無條件捨去」。",
    "15": "規則三：8 的倍數，打 85 折後無條件進位。",
    "17": "打折後的金額減掉整數部分還大於 0，代表有小數，就要進位（加 1）。",
    "25": "規則四：最後兩位是 77，只有超過 100 元的部分打 5 折。",
    "26": "最後加 0.5 再存進 int，就是四捨五入。",
    "29": "規則五：前面都不符合，就折 5 元。else if 一條成立後，後面的就不會再檢查。"
   },
   "quiz": {
    "input": "3 30 2 20",
    "out": "125",
    "wrong": [
     "130",
     "117",
     "110.5"
    ]
   }
  },
  {
   "id": "cpp-coke",
   "title": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop",
   "summary": "一瓶可樂 27 元，4 個空瓶可以換 1 瓶新的。用 while 迴圈一直換，算出總共喝幾瓶、最後剩幾個空瓶。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int money, coke, bottle;\n    cin >> money;\n    coke = money / 27;\n    bottle = coke;\n\n    while (bottle >= 4) {\n        bottle = bottle - 4;\n        coke = coke + 1;\n        bottle = bottle + 1;\n    }\n\n    cout << coke << \" \" << bottle;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "整數除法：錢能買幾瓶。",
    "7": "喝完的可樂都變成空瓶。",
    "9": "只要空瓶還夠 4 個，就繼續換。",
    "10": "拿 4 個空瓶去換，",
    "11": "多喝了一瓶，",
    "12": "喝完又多一個空瓶。"
   },
   "quiz": {
    "input": "270",
    "out": "13 1",
    "wrong": [
     "10 10",
     "13 2",
     "12 2"
    ]
   }
  },
  {
   "id": "cpp-coke2",
   "title": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop",
   "summary": "進階版：除了 4 個空瓶換 1 瓶，每個瓶蓋還能退 5 元，錢夠 27 元就再買。三件事輪流做，直到都不能做為止。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int money, coke, bottle, cap;\n    cin >> money;\n    coke = money / 27;\n    money = money % 27;\n    bottle = coke;\n    cap = bottle;\n\n    while (bottle >= 4 || cap > 0 || money >= 27) {\n        if (bottle >= 4) {\n            bottle = bottle - 4;\n            coke = coke + 1;\n            bottle = bottle + 1;\n            cap = cap + 1;\n        }\n        if (cap > 0) {\n            money = money + cap * 5;\n            cap = 0;\n        }\n        if (money >= 27) {\n            int buy = money / 27;\n            coke = coke + buy;\n            bottle = bottle + buy;\n            cap = cap + buy;\n            money = money % 27;\n        }\n    }\n\n    cout << coke << \"\\n\" << bottle << \"\\n\" << money;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "7": "買完後剩下的零錢。",
    "11": "|| 是「或」：三件事只要有一件還能做，就繼續迴圈。",
    "12": "第一件事：空瓶換可樂，換到的可樂喝完也會多一個瓶子和瓶蓋。",
    "18": "第二件事：瓶蓋全部拿去退錢，每個 5 元。",
    "22": "第三件事：錢夠就買，買幾瓶就多幾個瓶子和瓶蓋。",
    "31": "依序印出喝了幾瓶、剩幾個空瓶、剩多少錢。"
   },
   "quiz": {
    "input": "100",
    "out": "5\n1\n17",
    "wrong": [
     "3\n3\n19",
     "4\n0\n14",
     "5\n2\n0"
    ]
   }
  },
  {
   "id": "cpp-max5",
   "title": "五數最大值",
   "unit": "Conditional Loop",
   "summary": "讀入五個數，用「擂台」的方式找最大值：left 是目前的擂台主，每讀一個新的數 right 就比一次，大的留在 left。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int left, right;\n    cin >> left >> right;\n    if (left > right) {\n\n    }\n    else {\n        left = right;\n    }\n\n    cin >> right;\n    if (left > right) {\n\n    }\n    else {\n        left = right;\n    }\n\n    cin >> right;\n    if (left > right) {\n\n    }\n    else {\n        left = right;\n    }\n\n    cin >> right;\n    if (left > right) {\n\n    }\n    else {\n        left = right;\n    }\n\n    cout << left;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "left 存「目前最大的數」，right 存「剛讀進來的數」。",
    "5": "先讀前兩個數。",
    "6": "left 比較大就什麼都不用做，所以這個大括號是空的。",
    "10": "right 比較大（或一樣大），就讓 right 成為新的擂台主。",
    "13": "再讀下一個數，重複同樣的比較。",
    "37": "比完四次，left 就是五個數裡最大的。"
   },
   "quiz": {
    "input": "4 9 2 7 5",
    "out": "9",
    "wrong": [
     "5",
     "4",
     "7"
    ]
   }
  },
  {
   "id": "cpp-prime",
   "title": "質數判斷",
   "unit": "Conditional Loop",
   "summary": "從 2 試到 N-1，只要有一個數能整除 N，N 就不是質數，印出原因後用 break 提早離開迴圈。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int N;\n    cin >> N;\n    bool isPrime = true;\n    for (int t = 2; t <= N-1; t = t + 1) {\n        if (N % t == 0) {\n            cout << N << \"會被\" << t << \"整除，所以不是質數。\";\n            isPrime = false;\n            break;\n        }\n    }\n\n    if (isPrime) {\n        cout << N << \"是質數！\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "先假設 N 是質數，找到反例再改成 false。bool 只能存 true 或 false。",
    "7": "t 從 2 試到 N-1。",
    "8": "餘數是 0 代表 t 能整除 N。",
    "11": "找到一個因數就夠了，break 直接跳出迴圈，不再試後面的數。",
    "15": "整個迴圈都沒找到因數，isPrime 還是 true，才印出「是質數」。"
   },
   "quiz": {
    "input": "91",
    "out": "91會被7整除，所以不是質數。",
    "wrong": [
     "91是質數！",
     "91會被13整除，所以不是質數。",
     "91會被7整除，所以不是質數。91是質數！"
    ]
   }
  },
  {
   "id": "cpp-seq",
   "title": "等差數列-for版",
   "unit": "Counting Loop",
   "summary": "讀入首項、第二項和項數 n，算出公差後用 for 迴圈印出整個數列，中間用逗號隔開。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a1, a2, n, a;\n    cin >> a1 >> a2 >> n;\n    int d = a2 - a1;\n\n    a = a1;\n    cout << a;\n\n    for (int t = 1; t <= n-1; t = t + 1) {\n        a = a + d;\n        cout << \",\" << a;\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "公差＝第二項減第一項。",
    "9": "先印第一項，後面每一項前面才加逗號，這樣最後不會多一個逗號。",
    "11": "第一項已經印了，所以只要再跑 n-1 次。",
    "12": "每次加上公差，得到下一項。"
   },
   "quiz": {
    "input": "3 7 5",
    "out": "3,7,11,15,19",
    "wrong": [
     "3,7,11,15",
     "3,7,11,15,19,",
     "3 7 11 15 19"
    ]
   }
  },
  {
   "id": "cpp-dice",
   "title": "骰子點數統計與長條圖",
   "unit": "Array and Search",
   "summary": "讀入 n 次擲骰子的結果，用陣列統計 1～6 點各出現幾次，再印出星號長條圖。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int vote[7] = {0};\n    int n;\n    cin >> n;\n    int a;\n\n    for (int t = 1; t <= n; t = t + 1) {\n        cin >> a;\n        vote[a] = vote[a] + 1;\n    }\n    for (int d = 1; d <= 6; d = d + 1) {\n        for (int t = 1; t <= vote[d]; t = t + 1) {\n            cout << \"*\";\n        }\n        cout << \"\\n\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "7 格全部設成 0。用 vote[1]～vote[6] 記錄 1～6 點的次數，vote[0] 不用。",
    "11": "擲出幾點，就讓那一格加 1。點數直接當成陣列的編號。",
    "13": "外層：每一種點數一行。",
    "14": "內層：出現幾次就印幾顆星。出現 0 次就是空行。"
   },
   "quiz": {
    "input": "8\n3 1 3 6 3 2 6 1",
    "out": "**\n*\n***\n\n\n**",
    "wrong": [
     "**\n*\n***\n**",
     "2\n1\n3\n0\n0\n2",
     "***\n**\n**\n*"
    ]
   }
  },
  {
   "id": "cpp-fair",
   "title": "公平成績",
   "unit": "Array and Search",
   "summary": "七位評審打分數，去掉一個最高分和一個最低分，剩下五個分數取平均。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int score[7];\n\n    for (int i = 0; i <= 6; i = i + 1) {\n        cin >> score[i];\n    }\n\n    int max, min = score[0];\n    max = score[0];\n    for (int i = 1; i <= 6; i = i + 1) {\n        if (score[i] > max) {\n            max = score[i];\n        }\n    }\n\n    for (int i = 1; i <= 6; i = i + 1) {\n        if (score[i] < min) {\n            min = score[i];\n        }\n    }\n\n    float average = 0;\n    for (int i = 0; i <= 6; i = i + 1) {\n        average = average + score[i];\n    }\n    average = (average - max - min)/5.0;\n    cout << average;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "一個可以放 7 個整數的陣列，編號從 score[0] 到 score[6]。",
    "6": "用迴圈把 7 個分數依序讀進陣列。",
    "10": "先把第一個分數當成目前的最大值和最小值。",
    "13": "遇到更大的就更新最大值。",
    "19": "遇到更小的就更新最小值。",
    "24": "float 是小數，先當成總和用。",
    "28": "總和扣掉最高和最低，再除以 5.0（寫成小數才是小數除法）。"
   },
   "quiz": {
    "input": "80 95 70 88 60 90 85",
    "out": "82.6",
    "wrong": [
     "81.1429",
     "82",
     "413"
    ]
   }
  },
  {
   "id": "cpp-lottery",
   "title": "抽獎箱",
   "unit": "Array and Search",
   "summary": "線性搜尋：從頭到尾一個一個找，找到 x 就印出它是第幾個，找不到就印「找不到」。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int num[n];\n\n    for (int i = 0; i <= n-1; i = i + 1) {\n        cin >> num[i];\n    }\n\n    int x;\n    cin >> x;\n    int ans = -1;\n\n    for (int i = 0; i <= n-1; i = i + 1) {\n        if (num[i] == x) {\n            ans = i + 1;\n            break;\n        }\n    }\n\n    if (ans != -1) {\n        cout << ans;\n    }\n    else {\n        cout << \"找不到\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "依照讀進來的 n 開一個陣列。",
    "14": "-1 代表「還沒找到」，因為正常的位置不會是 -1。",
    "17": "找到了。",
    "18": "陣列編號從 0 開始，人數數從 1 開始，所以要加 1。",
    "19": "找到第一個就停，不會繼續找後面重複的。",
    "23": "ans 被改過，代表有找到。"
   },
   "quiz": {
    "input": "6\n15 8 42 8 23 4\n8",
    "out": "2",
    "wrong": [
     "4",
     "1",
     "2 4"
    ]
   }
  },
  {
   "id": "cpp-rank",
   "title": "我是第幾名",
   "unit": "Array and Search",
   "summary": "讀入全班成績和自己的分數 x，數有幾個人比 x 高，名次就是「比我高的人數 + 1」；x 不在名單上就是輸入無效。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int scores[n];\n\n    for (int i = 0; i <= n-1; i = i + 1) {\n        cin >> scores[i];\n    }\n\n    int x;\n    cin >> x;\n\n    int ming = 1;\n    bool found = false;\n    for (int i = 0; i <= n-1; i = i + 1) {\n        if (scores[i] > x) {\n            ming = ming + 1;\n        }\n        if (scores[i] == x) {\n            found = true;\n        }\n    }\n    if (found) {\n        cout << ming;\n    }\n    else {\n        cout << \"輸入無效\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "15": "名次從第 1 名開始算。",
    "18": "每遇到一個比我高的人，名次就往後一名。",
    "21": "順便檢查 x 有沒有出現在名單上。",
    "25": "有找到 x 才印名次。"
   },
   "quiz": {
    "input": "5\n70 92 85 92 60\n85",
    "out": "3",
    "wrong": [
     "2",
     "4",
     "輸入無效"
    ]
   }
  },
  {
   "id": "cpp-bsearch",
   "title": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort",
   "summary": "在排好序的陣列裡用二分搜尋找 x：每次看中間那個數，比 x 小就只找右半邊，比 x 大就只找左半邊。每一步都印出 left、right、mid 和中間的數。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int nums[n];\n    for (int i = 0; i <= n-1; i = i + 1) {\n        cin >> nums[i];\n    }\n    int x;\n    cin >> x;\n\n    int left = 0, right = n-1;\n    bool found = false;\n    while (right - left >= 0) {\n        int mid = (left + right) / 2;\n        cout << left << \" \" << right << \" \" << mid << \" \" << nums[mid];\n        cout << \"\\n\";\n        if (nums[mid] == x) {\n            cout << \"找到\";\n            found = true;\n            break;\n        }\n        else if (nums[mid] < x) {\n            left = mid + 1;\n        }\n        else {\n            right = mid - 1;\n        }\n    }\n    if (!found) {\n        cout << \"找不到\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "13": "一開始的搜尋範圍是整個陣列。",
    "15": "範圍裡還有數字就繼續找。",
    "16": "中間的位置；整數除法會自動捨去小數。",
    "17": "印出這一步的搜尋範圍、中間位置和中間的數。",
    "19": "剛好找到。",
    "24": "中間的數太小，答案一定在右半邊，所以 left 移到 mid + 1。",
    "27": "中間的數太大，答案在左半邊，right 移到 mid - 1。",
    "31": "! 是「不是」：沒有找到才印「找不到」。"
   },
   "quiz": {
    "input": "7\n2 5 8 12 16 23 38\n23",
    "out": "0 6 3 12\n4 6 5 23\n找到",
    "wrong": [
     "0 6 3 12\n3 6 4 16\n4 6 5 23\n找到",
     "0 6 3 12\n4 6 5 23",
     "0 7 3 12\n4 7 5 23\n找到"
    ]
   }
  },
  {
   "id": "cpp-bubble",
   "title": "氣泡排序法",
   "unit": "Sort",
   "summary": "氣泡排序：每一輪從頭到尾比較相鄰的兩個數，前面比較大就交換，大的數會像氣泡一樣浮到後面。每一輪結束都印出目前的樣子。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int nums[n];\n\n    for (int i = 0; i <= n-1; i = i + 1) {\n        cin >> nums[i];\n    }\n\n    for (int t = 1; t <= n-1; t = t + 1) {\n        for (int i = 0; i <= n-2; i = i + 1) {\n            if (nums[i] > nums[i+1]) {\n                int wang = nums[i];\n                nums[i] = nums[i+1];\n                nums[i+1] = wang;\n            }\n        }\n\n        for (int i = 0; i <= n-1; i = i + 1) {\n            cout << nums[i] << \" \";\n        }\n        cout << \"\\n\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "12": "外層：n 個數最多需要 n-1 輪。",
    "13": "內層：比較 nums[i] 和 nums[i+1]，i 只到 n-2，不然 i+1 會超出陣列。",
    "14": "前面比後面大，順序錯了，要交換。",
    "15": "交換三步驟：先把 nums[i] 存到暫存變數，",
    "16": "再把後面的搬到前面，",
    "17": "最後把暫存的放到後面。少了暫存變數，其中一個值會被蓋掉。",
    "21": "每一輪結束印出整個陣列，可以看到大的數一輪一輪浮到後面。"
   },
   "quiz": {
    "input": "4\n5 3 8 1",
    "out": "3 5 1 8\n3 1 5 8\n1 3 5 8",
    "wrong": [
     "1 3 5 8",
     "3 5 8 1\n3 5 1 8\n3 1 5 8",
     "3 5 1 8\n1 3 5 8"
    ]
   }
  },
  {
   "id": "cpp-library",
   "title": "鳳新圖書搜尋器",
   "unit": "Sort",
   "summary": "先用氣泡排序把書號由小到大排好，再找 x 和它前後的書號：x 在架上就印出前一本、x、後一本；不在架上就印出它應該插進去的位置兩邊的書號。",
   "len": "para",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int books[n];\n    for (int i = 0; i <= n-1; i = i + 1) {\n        cin >> books[i];\n    }\n\n    for (int t = 1; t <= n-1; t = t + 1) {\n        for (int i = 0; i <= n-2; i = i + 1) {\n            if (books[i] > books[i+1]) {\n                int temp = books[i];\n                books[i] = books[i + 1];\n                books[i + 1] = temp;\n            }\n        }\n    }\n    int x;\n    cin >> x;\n    int ans = -1, pre = -1, post = -1;\n    for (int i = 0; i <= n-1; i = i + 1) {\n        if (x == books[i]) {\n            ans = i;\n        }\n        if (x > books[i]) {\n            pre = i;\n        }\n        if (x < books[i]) {\n            post = i;\n            break;\n        }\n    }\n\n    if (ans != -1) {\n        if (pre != -1) {\n            cout << books[pre] << \" \";\n        }\n        cout << books[ans];\n        if (post != -1) {\n            cout << \" \" << books[post];\n        }\n    }\n    else {\n        if (pre != -1) {\n            cout << books[pre] << \" \";\n        }\n        if (post != -1) {\n            cout << books[post];\n        }\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "11": "這兩層迴圈就是氣泡排序，把書號由小到大排好。",
    "22": "ans：x 的位置；pre：比 x 小的最後一本；post：比 x 大的第一本。-1 代表沒有。",
    "27": "書號比 x 小，一直往後更新，最後留下的就是「x 前面那本」。",
    "30": "第一本比 x 大的書就是「x 後面那本」，找到就 break。",
    "36": "x 在架上：前一本、x、後一本，有的才印。",
    "45": "x 不在架上：只印前後兩本。"
   },
   "quiz": {
    "input": "6\n40 12 33 7 25 18\n30",
    "out": "25 33",
    "wrong": [
     "25 30 33",
     "33 25",
     "25"
    ]
   }
  },
  {
   "id": "cpp-circle",
   "title": "圓面積",
   "unit": "Basic Input and Output",
   "summary": "讀入半徑 r，用「半徑 × 半徑 × 圓周率」算出圓面積並印出來。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int r;\n    cin >> r;\n    cout << r*r*3.1415926;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "宣告一個整數變數 r，用來存半徑。",
    "5": "從鍵盤讀一個整數，存進 r。",
    "6": "int 乘上小數會變成小數計算；cout 預設最多印 6 位有效數字。"
   },
   "quiz": {
    "input": "3",
    "out": "28.2743",
    "wrong": [
     "28",
     "9.42478",
     "28.2743334"
    ]
   }
  },
  {
   "id": "cpp-escape",
   "title": "><\"\\\\",
   "unit": "Basic Input and Output",
   "summary": "只用一行 cout 印出兩行符號，練習「跳脫字元」：想印出 \" 和 \\ 這種有特殊意義的字，前面要多加一個反斜線。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \">\\\"<\\\\\\\\\\n\\\\|/\";\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "字串裡 \\\" 會印出 \"，\\\\ 會印出一個 \\，\\n 會換行。所以 \\\\\\\\ 印出兩個反斜線 \\\\。"
   },
   "quiz": {
    "input": "",
    "out": ">\"<\\\\\n\\|/",
    "wrong": [
     ">\"<\\\n\\|/",
     ">\"<\\\\\\\\\n\\\\|/",
     ">\"<\\\\ \\|/"
    ]
   }
  },
  {
   "id": "cpp-intro",
   "title": "美國親戚的自我介紹",
   "unit": "Basic Input and Output",
   "summary": "讀入名字和西元出生年，把西元換成民國（減 1911），再加上一串需要跳脫的符號印出來。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    string name;\n    int year;\n    cin >> name >> year;\n    cout << \"\\\"您好，我的名字是\" << name << \"！民國\" << year-1911 << \"年出生 ><\\\"\\\\\\\\\\\"\";\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "string 是「字串」型態，可以存一串文字，例如名字。",
    "6": "一次讀兩個值：先讀名字，再讀年份，中間用空白隔開。",
    "7": "year-1911 會先算出民國年再印出來；\\\" 印出雙引號，\\\\ 印出反斜線。"
   },
   "quiz": {
    "input": "Amy 2010",
    "out": "\"您好，我的名字是Amy！民國99年出生 ><\"\\\\\"",
    "wrong": [
     "\"您好，我的名字是Amy！民國2010年出生 ><\"\\\\\"",
     "\"您好，我的名字是Amy！民國99年出生 ><\"\\\"",
     "您好，我的名字是Amy！民國99年出生 ><\"\\\\"
    ]
   }
  },
  {
   "id": "cpp-arith",
   "title": "整數的五則運算",
   "unit": "Operators",
   "summary": "讀入兩個整數，印出加、減、乘、除、取餘數五種運算的算式和結果。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a << \" + \" << b << \" = \" << a + b << endl;\n    cout << a << \" - \" << b << \" = \" << a - b << endl;\n    cout << a << \" * \" << b << \" = \" << a * b << endl;\n    cout << a << \" / \" << b << \" = \" << a / b << endl;\n    cout << a << \" % \" << b << \" = \" << a % b << endl;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "兩個整數變數。整數相除時，小數部分會被直接捨去。",
    "6": "用 << 把文字和數字接在一起印出；endl 代表換行。",
    "9": "兩個 int 相除是「整數除法」：17 / 5 = 3，不是 3.4。",
    "10": "% 是取餘數：17 除以 5 商 3 餘 2。"
   },
   "quiz": {
    "input": "17 5",
    "out": "17 + 5 = 22\n17 - 5 = 12\n17 * 5 = 85\n17 / 5 = 3\n17 % 5 = 2",
    "wrong": [
     "17 + 5 = 22\n17 - 5 = 12\n17 * 5 = 85\n17 / 5 = 3.4\n17 % 5 = 2",
     "17 + 5 = 22\n17 - 5 = 12\n17 * 5 = 85\n17 / 5 = 3\n17 % 5 = 3",
     "17 + 5 = 22\n17 - 5 = 12\n17 * 5 = 85\n17 / 5 = 3.4\n17 % 5 = 3.4"
    ]
   }
  },
  {
   "id": "cpp-division",
   "title": "除法原理",
   "unit": "Operators",
   "summary": "讀入 a、b，先印出真正的小數除法結果，再用「被除數 = 除數 × 商 + 餘數」驗證整數除法。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    double c = a;\n    cout << a << \" / \" << b << \" = \" << c/b << endl;\n    cout << a << \" = \" << b << \" * \" << a/b << \" + \" << a%b;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "把 a 複製到小數變數 c，等一下用 c/b 才會得到小數結果。",
    "7": "c 是 double，所以 c/b 是小數除法，7 / 2 會得到 3.5。",
    "8": "a/b 是整數除法（商），a%b 是餘數。"
   },
   "quiz": {
    "input": "7 2",
    "out": "7 / 2 = 3.5\n7 = 2 * 3 + 1",
    "wrong": [
     "7 / 2 = 3\n7 = 2 * 3 + 1",
     "7 / 2 = 3.5\n7 = 2 * 3.5 + 1",
     "7 / 2 = 3.5\n7 = 2 * 3 + 0"
    ]
   }
  },
  {
   "id": "cpp-round",
   "title": "四捨五入到個位數",
   "unit": "Operators",
   "summary": "讀入一個小數，加上 0.5 之後存進整數變數，小數部分被捨去，就得到四捨五入的結果。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    double a;\n    cin >> a;\n    int b = a + 0.5;\n    cout << b;\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "double 可以存小數。",
    "6": "把小數存進 int 時，小數部分會直接被捨去。先加 0.5 再捨去，就等於四捨五入：2.6 + 0.5 = 3.1 → 3。"
   },
   "quiz": {
    "input": "2.6",
    "out": "3",
    "wrong": [
     "2",
     "3.1",
     "2.6"
    ]
   }
  },
  {
   "id": "cpp-multiple",
   "title": "倍數判斷",
   "unit": "Selection Structure",
   "summary": "讀入 x 和 y，用取餘數判斷 x 是不是 y 的倍數：餘數是 0 就是倍數。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int x, y;\n    cin >> x >> y;\n    if (x % y == 0) {\n        cout << \"Yes\";\n    }\n    else {\n        cout << \"No\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "x 除以 y 的餘數等於 0，代表整除，x 就是 y 的倍數。注意比較相等要用兩個等號 ==。",
    "9": "上面的條件不成立時，才會跑 else 裡面的程式。"
   },
   "quiz": {
    "input": "12 5",
    "out": "No",
    "wrong": [
     "Yes",
     "2",
     "Yes\nNo"
    ]
   }
  },
  {
   "id": "cpp-boss",
   "title": "魔王勇者",
   "unit": "Conditional Loop",
   "summary": "魔王有 100 點血，勇者每次攻擊扣 atk 點；用 while 迴圈一直攻擊，直到魔王的血小於等於 0。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int hp = 100;\n    int atk;\n    cin >> atk;\n\n    while (hp > 0) {\n        hp = hp - atk;\n        cout << \"hp = \" << hp << endl;\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "魔王一開始的血量。",
    "8": "只要魔王還有血，就一直重複大括號裡的事。每一輪開始前都會重新檢查條件。",
    "9": "每次攻擊扣掉 atk 點血。",
    "10": "扣完血就印出來，所以最後一行會是 0 或負數。"
   },
   "quiz": {
    "input": "30",
    "out": "hp = 70\nhp = 40\nhp = 10\nhp = -20",
    "wrong": [
     "hp = 70\nhp = 40\nhp = 10",
     "hp = 100\nhp = 70\nhp = 40\nhp = 10",
     "hp = -20"
    ]
   }
  },
  {
   "id": "cpp-grid",
   "title": "格子點",
   "unit": "Counting Loop",
   "summary": "用兩層 for 迴圈印出所有格子點座標：外層決定第幾列，內層印出這一列的每一個點。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    for (int m = 0; m <= a-1; m = m + 1) {\n        for (int n = 0; n <= b-1; n = n + 1) {\n            cout << \"(\" << m << \" \" << n << \")\";\n        }\n        cout << \"\\n\";\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "6": "外層迴圈：m 從 0 到 a-1，每一個 m 是一列。",
    "7": "內層迴圈：外層每跑一次，內層就從頭跑完一輪。",
    "10": "內層跑完（一列印完）才換行，所以這行在內層迴圈外面。"
   },
   "quiz": {
    "input": "2 3",
    "out": "(0 0)(0 1)(0 2)\n(1 0)(1 1)(1 2)",
    "wrong": [
     "(0 0)(0 1)(0 2)(1 0)(1 1)(1 2)",
     "(0 0)(1 0)\n(0 1)(1 1)\n(0 2)(1 2)",
     "(1 1)(1 2)(1 3)\n(2 1)(2 2)(2 3)"
    ]
   }
  },
  {
   "id": "cpp-repeat",
   "title": "字串重複",
   "unit": "Counting Loop",
   "summary": "讀入一個字串 S 和次數 N，用 for 迴圈把 S 連續印 N 次。",
   "len": "sent",
   "t": "#include <iostream>\nusing namespace std;\n\nint main() {\n    string S;\n    int N;\n    cin >> S >> N;\n\n    for (int t = 1; t <= N; t = t + 1) {\n        cout << S;\n    }\n}",
   "notes": {
    "0": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "1": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "3": "程式從 main 開始執行。",
    "4": "字串變數，存要重複的文字。",
    "8": "t 從 1 數到 N，迴圈剛好跑 N 次。",
    "9": "沒有空白也沒有換行，所以會黏在一起。"
   },
   "quiz": {
    "input": "meow 3",
    "out": "meowmeowmeow",
    "wrong": [
     "meow meow meow",
     "meow\nmeow\nmeow",
     "meowmeow"
    ]
   }
  }
 ],
 "py": [
  {
   "id": "py-bmi",
   "title": "BMI Result",
   "unit": "Selection Structure",
   "summary": "讀入身高（公分）和體重，算出 BMI 並判斷是過輕、正常還是過重。",
   "len": "para",
   "t": "height, weight = input().split()\nheight = float(height) / 100\nweight = float(weight)\n\nbmi = weight / (height ** 2)\n\nprint(f'BMI:{bmi:.1f}')\n\nif (bmi < 18):\n    print('Underweight')\n\nelse:\n    if (bmi < 24):\n        print('Normal')\n    else:\n        print('Overweight')",
   "notes": {
    "0": "split() 用空白把一行切成兩段，分別給 height 和 weight。",
    "1": "轉成小數，再把公分換成公尺。",
    "4": "** 是次方：體重除以身高的平方。",
    "6": "印到小數點後 1 位。",
    "8": "小於 18 是過輕。",
    "11": "不是過輕，再用一個 if 分正常和過重（巢狀 if）。"
   },
   "quiz": {
    "input": "160 50",
    "out": "BMI:19.5\nNormal",
    "wrong": [
     "BMI:19.5\nUnderweight",
     "BMI:19.53\nNormal",
     "BMI:0.0\nUnderweight"
    ]
   }
  },
  {
   "id": "py-grade",
   "title": "資訊成績",
   "unit": "Selection Structure",
   "summary": "讀入期中考、期末考、作業成績，依比例算出學期總分，再用 if / elif 判斷落在哪個區間。Python 的變數名稱也可以用中文。",
   "len": "para",
   "t": "期中考, 期末考, 作業 = input().split()\n期中考 = int(期中考)\n期末考 = int(期末考)\n作業 = int(作業)\n學期總分 = 期中考*0.25 + 期末考*0.30 + 作業*0.45\n\nif 學期總分 % 1 == 0:\n    學期總分 = int(學期總分)\nprint(f'總分：{學期總分}。', end='')\n\nif 學期總分 < 40:\n    print('死當QQ')\n\nelif 學期總分 < 60:\n    print('可以補考！')\n\nelif 學期總分 < 70:\n    print('低空飛過><')\n\nelif 學期總分 >= 90:\n    print('簡直是神。')\n\nelse:\n    print('過了～')",
   "notes": {
    "4": "期中 25%、期末 30%、作業 45%。",
    "6": "總分剛好是整數的話，轉成 int，印出來就不會有 .0。",
    "8": "end='' 讓 print 印完不要換行，下一個 print 會接在同一行。",
    "10": "elif 由上往下檢查，第一個成立的就執行，後面的都不看。",
    "19": "這行放在 < 70 後面也沒問題，因為能走到這裡的都已經 >= 70。"
   },
   "quiz": {
    "input": "50 60 70",
    "out": "總分：62。低空飛過><",
    "wrong": [
     "總分：62.0。低空飛過><",
     "總分：62。過了～",
     "總分：62。可以補考！"
    ]
   }
  },
  {
   "id": "py-larger",
   "title": "Larger Number",
   "unit": "Selection Structure",
   "summary": "讀入兩個數（可能是整數或小數），印出比較大的那一個；整數就印成整數，不要多出 .0。",
   "len": "para",
   "t": "def transformInput(x):\n    x = float(x)\n    if (x % 1 == 0):\n        x = int(x)\n    return x\n\nx, y = input().split()\nx = transformInput(x)\ny = transformInput(y)\n\nif (x > y):\n    print(x)\nelse:\n    print(y)",
   "notes": {
    "0": "自己定義一個函式，把「轉成數字」這件事包起來，下面可以重複使用。",
    "1": "先一律轉成小數。",
    "2": "除以 1 的餘數是 0，代表它其實是整數。",
    "3": "轉回整數，印出來就不會有 .0。",
    "4": "把處理好的數字交回去給呼叫它的地方。",
    "7": "呼叫上面的函式。"
   },
   "quiz": {
    "input": "3.0 2.5",
    "out": "3",
    "wrong": [
     "3.0",
     "2.5",
     "3.0 2.5"
    ]
   }
  },
  {
   "id": "py-coke",
   "title": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop",
   "summary": "一瓶 27 元，4 個空瓶換 1 瓶。這個版本每一輪把能換的空瓶一次換完，算出總共喝幾瓶、剩幾個空瓶。",
   "len": "para",
   "t": "money = int(input())\ncoke = money // 27\nbottle = coke\n\nwhile bottle >= 4:\n    ex = bottle // 4\n    bottle = bottle % 4\n    bottle += ex\n    coke += ex\n\nprint(f'{coke} {bottle}')",
   "notes": {
    "1": "整數除法：錢能買幾瓶。",
    "4": "空瓶夠 4 個就繼續換。",
    "5": "這一輪一次能換幾瓶。",
    "6": "換完剩下湊不滿 4 個的空瓶，",
    "7": "換來的可樂喝完又變成空瓶。+= 是「加上」的簡寫。"
   },
   "quiz": {
    "input": "300",
    "out": "14 2",
    "wrong": [
     "11 11",
     "14 3",
     "13 1"
    ]
   }
  },
  {
   "id": "py-coke2",
   "title": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop",
   "summary": "進階版：4 個空瓶換 1 瓶、每個瓶蓋退 5 元、錢夠 27 元就再買，三件事輪流做，直到都不能做為止。",
   "len": "para",
   "t": "money = int(input())\ncoke = money // 27\nbottle = coke\ncap = coke\nmoney %= 27\n\nwhile (bottle >= 4) or (cap > 0) or (money >= 27):\n    if bottle >= 4:\n        bottle -= 4\n        coke += 1\n        bottle += 1\n        cap += 1\n\n    if cap > 0:\n        money += cap * 5\n        cap = 0\n\n    if money >= 27:\n        money -= 27\n        coke += 1\n        bottle += 1\n        cap += 1\nprint(f'{coke}\\n{bottle}\\n{money}')",
   "notes": {
    "4": "買完剩下的零錢。%= 是「取餘數後存回去」的簡寫。",
    "6": "三件事只要有一件還能做就繼續。",
    "7": "空瓶換一瓶，喝完多一個瓶子和瓶蓋。",
    "13": "瓶蓋全部退錢。",
    "17": "錢夠就買一瓶。",
    "22": "\\n 是換行，所以會印成三行。"
   },
   "quiz": {
    "input": "54",
    "out": "2\n2\n10",
    "wrong": [
     "2\n2\n0",
     "3\n3\n19",
     "2\n0\n10"
    ]
   }
  },
  {
   "id": "py-prime",
   "title": "質數判斷",
   "unit": "Counting Loop",
   "summary": "從 2 試到 N-1，有任何一個數能整除 N，就不是質數；全部都不能整除才是質數。",
   "len": "para",
   "t": "N = int(input())\n\nisPrime = True\nfor i in range(2, N):\n    if N % i == 0:\n        print(f'{N}會被{i}整除，所以不是質數。')\n        isPrime = False\n        break\n\nif isPrime:\n    print(f'{N}是質數！')",
   "notes": {
    "2": "先假設是質數。Python 的 True、False 開頭要大寫。",
    "3": "range(2, N) 是 2、3、…、N-1，不包含 N。",
    "4": "能整除就找到因數了。",
    "7": "找到一個就夠，直接跳出迴圈。",
    "9": "迴圈結束後還是 True，代表沒有任何因數。"
   },
   "quiz": {
    "input": "49",
    "out": "49會被7整除，所以不是質數。",
    "wrong": [
     "49是質數！",
     "49會被2整除，所以不是質數。",
     "49會被7整除，所以不是質數。\n49是質數！"
    ]
   }
  },
  {
   "id": "py-seq",
   "title": "等差數列-for版",
   "unit": "Counting Loop",
   "summary": "讀入首項、第二項和項數 n，算出公差，用 for 迴圈印出數列，數字之間用逗號隔開，最後一個後面沒有逗號。",
   "len": "para",
   "t": "a1, a2, n = input().split()\na1 = int(a1)\na2 = int(a2)\nn = int(n)\n\na = a1\nd = a2 - a1\n\nfor i in range(n-1):\n    print(a, end=',')\n    a += d\n\nprint(a, end='')",
   "notes": {
    "6": "公差可以是負的，例如 7 - 10 = -3。",
    "8": "先印前 n-1 項，每項後面都接逗號。",
    "9": "end=',' 讓 print 結尾印逗號而不是換行。",
    "12": "最後一項單獨印，後面不加逗號。"
   },
   "quiz": {
    "input": "10 7 4",
    "out": "10,7,4,1",
    "wrong": [
     "10,7,4,1,",
     "10,13,16,19",
     "10,7,4"
    ]
   }
  },
  {
   "id": "py-pass",
   "title": "及格與不及格",
   "unit": "List and Iteration",
   "summary": "把成績分成及格和不及格兩個 list，分兩行印出來；某一組沒有人就印 none。",
   "len": "para",
   "t": "n = int(input())\nscores = list(map(int, input().split()))\npassed = []\nfailed = []\n\nfor score in scores:\n    if score >= 60:\n        passed.append(score)\n    else:\n        failed.append(score)\n\nif passed:\n    print(*passed)\nelse:\n    print('none')\n\nif failed:\n    print(*failed)\nelse:\n    print('none')",
   "notes": {
    "2": "先準備兩個空的 list。",
    "6": "60 分也算及格。",
    "7": "append 把一個值加到 list 的最後面。",
    "11": "list 裡面有東西就是 True，空的 list 是 False。",
    "12": "* 會把 list 拆開，印成用空白隔開的數字，不會有中括號。"
   },
   "quiz": {
    "input": "5\n55 80 60 42 99",
    "out": "80 60 99\n55 42",
    "wrong": [
     "80 99\n55 60 42",
     "[80, 60, 99]\n[55, 42]",
     "80 60 99 55 42"
    ]
   }
  },
  {
   "id": "py-stats",
   "title": "全班成績統計",
   "unit": "List and Iteration",
   "summary": "讀入 n 個成績存進 list，算出總分、平均（印到小數點後 2 位），以及高於平均的人數。",
   "len": "para",
   "t": "n = int(input())\nscores = list(map(int, input().split()))\n\ntotal = 0\nfor score in scores:\n    total = total + score\n\naverage = total / n\n\ncount = 0\nfor score in scores:\n    if score > average:\n        count = count + 1\n\nprint(f'{total}\\n{average:.2f}\\n{count}')",
   "notes": {
    "1": "一行讀進所有成績，轉成整數後放進 list。",
    "4": "走訪 list：score 依序是每一個成績。",
    "5": "累加總分。",
    "7": "/ 會得到小數。",
    "11": "再走訪一次，數有幾個人高於平均（等於平均不算）。",
    "14": ":.2f 印到小數點後 2 位。"
   },
   "quiz": {
    "input": "4\n60 90 75 80",
    "out": "305\n76.25\n2",
    "wrong": [
     "305\n76.25\n3",
     "305\n76.3\n2",
     "305\n76\n2"
    ]
   }
  },
  {
   "id": "py-circle",
   "title": "圓面積",
   "unit": "Basic Input and Output",
   "summary": "讀入半徑，算出圓面積，用 f-string 印到小數點後 4 位。",
   "len": "sent",
   "t": "pi = 3.1415926\nr = input()\nr = int(r)\nprint(f'{r*r*pi:.4f}')",
   "notes": {
    "0": "Python 的變數不用先宣告型態，直接給值就好。",
    "1": "input() 讀進來的一定是字串，例如 '2'。",
    "2": "用 int() 把字串轉成整數才能計算。",
    "3": "f-string 裡用大括號放算式；:.4f 表示印到小數點後 4 位（會四捨五入）。"
   },
   "quiz": {
    "input": "2",
    "out": "12.5664",
    "wrong": [
     "12.566370",
     "12.56637",
     "12"
    ]
   }
  },
  {
   "id": "py-hello",
   "title": "Hello Kitty",
   "unit": "Basic Input and Output",
   "summary": "第一支 Python 程式：用 print 印出一行文字。",
   "len": "sent",
   "t": "print('Hello, Kitty!')",
   "notes": {
    "0": "print 會把括號裡的東西印出來；單引號只是用來標示「這是字串」，不會被印出來。"
   },
   "quiz": {
    "input": "",
    "out": "Hello, Kitty!",
    "wrong": [
     "'Hello, Kitty!'",
     "Hello Kitty",
     "print('Hello, Kitty!')"
    ]
   }
  },
  {
   "id": "py-leap",
   "title": "文文的求婚--續集 (1 行版)",
   "unit": "Selection Structure",
   "summary": "用一行條件判斷閏年：能被 4 整除但不能被 100 整除，或者能被 400 整除。",
   "len": "sent",
   "t": "year = int(input())\n\nif ((year % 4 == 0) and (year % 100 != 0)) or (year % 400 == 0):\n    print('a leap year')\nelse:\n    print('a normal year')",
   "notes": {
    "2": "and 是「而且」、or 是「或者」、!= 是「不等於」。1900 能被 4 和 100 整除，但不能被 400 整除，所以不是閏年。"
   },
   "quiz": {
    "input": "1900",
    "out": "a normal year",
    "wrong": [
     "a leap year",
     "True",
     "a normal year\na leap year"
    ]
   }
  },
  {
   "id": "py-multiple",
   "title": "倍數判斷",
   "unit": "Selection Structure",
   "summary": "讀入 x 和 y，用取餘數判斷 x 是不是 y 的倍數。",
   "len": "sent",
   "t": "x, y = input().split(' ')\nx = int(x)\ny = int(y)\n\nif x % y == 0:\n    print('Yes')\nelse:\n    print('No')",
   "notes": {
    "0": "用空白切開一行輸入，分給 x 和 y（這時還是字串）。",
    "1": "轉成整數才能做數學運算。",
    "4": "餘數是 0 就是倍數。Python 的 if 後面要加冒號，下一行要縮排。"
   },
   "quiz": {
    "input": "21 7",
    "out": "Yes",
    "wrong": [
     "No",
     "0",
     "3"
    ]
   }
  },
  {
   "id": "py-boss",
   "title": "魔王勇者",
   "unit": "Conditional Loop",
   "summary": "魔王有 100 點血，勇者每次攻擊扣 atk 點；用 while 迴圈一直攻擊，直到血量小於等於 0。",
   "len": "sent",
   "t": "hp = 100\natk = int(input())\n\nwhile hp > 0:\n    hp = hp - atk\n    print(f'hp = {hp}')",
   "notes": {
    "3": "條件成立就重複執行下面縮排的那幾行。",
    "4": "每次攻擊扣血。",
    "5": "f-string：大括號裡的變數會換成它的值。"
   },
   "quiz": {
    "input": "45",
    "out": "hp = 55\nhp = 10\nhp = -35",
    "wrong": [
     "hp = 55\nhp = 10",
     "hp = 55\nhp = 10\nhp = -35\nhp = -80",
     "hp = -35"
    ]
   }
  },
  {
   "id": "py-collatz",
   "title": "考拉茲猜想 Collatz Conjecture",
   "unit": "Conditional Loop",
   "summary": "偶數就除以 2，奇數就乘 3 加 1，一直重複到變成 1 為止，印出過程中的每一個數。",
   "len": "sent",
   "t": "n = int(input())\n\nwhile n != 1:\n    if n % 2 == 0:\n        n = n // 2\n\n    else:\n        n = 3*n + 1\n\n    print(n, end=' ')",
   "notes": {
    "2": "還沒變成 1 就繼續。",
    "3": "偶數。",
    "4": "// 是整數除法，結果還是整數（/ 會變成小數）。",
    "7": "奇數就乘 3 加 1。",
    "9": "end=' ' 讓每個數後面接一個空白，而不是換行。"
   },
   "quiz": {
    "input": "6",
    "out": "3 10 5 16 8 4 2 1",
    "wrong": [
     "6 3 10 5 16 8 4 2 1",
     "3 10 5 16 8 4 2",
     "3 5 16 8 4 2 1"
    ]
   }
  },
  {
   "id": "py-max5-a",
   "title": "五數最大值",
   "unit": "Conditional Loop",
   "summary": "一行讀一個數，共五個。left 是目前最大的數，每讀一個新的就比一次，比較大的就交換到 left。",
   "len": "sent",
   "t": "left = int(input())\n\nfor t in range(4):\n    right = int(input())\n    if right > left:\n        left, right = right, left\n\nprint(left)",
   "notes": {
    "0": "先讀第一個數，當作目前最大的。",
    "2": "range(4) 是 0、1、2、3，迴圈跑 4 次，讀剩下的四個數。",
    "4": "新讀的數比較大，",
    "5": "Python 可以一行交換兩個變數，不用暫存變數。"
   },
   "quiz": {
    "input": "3\n8\n6\n12\n1",
    "out": "12",
    "wrong": [
     "1",
     "8",
     "3"
    ]
   }
  },
  {
   "id": "py-max5-b",
   "title": "五數最大值（一行輸入）",
   "unit": "Counting Loop",
   "summary": "五個數在同一行，用 map 轉成整數後逐一比較。一開始用 '?' 代表「還沒有最大值」。",
   "len": "sent",
   "t": "nums = map(int, input().split())\n\nmax_num = '?'\nfor n in nums:\n    if max_num == '?' or n > max_num:\n        max_num = n\n\nprint(max_num)",
   "notes": {
    "0": "split() 切開後，map(int, …) 把每一段都轉成整數。",
    "2": "用 '?' 標記「還沒有比過」，這樣全部是負數也不會出錯（如果一開始設成 0 就會錯）。",
    "3": "一個一個拿出來比。",
    "4": "第一個數直接當最大值，之後比較大才更新。"
   },
   "quiz": {
    "input": "-3 -8 -1 -6 -2",
    "out": "-1",
    "wrong": [
     "?",
     "-8",
     "0"
    ]
   }
  },
  {
   "id": "py-repeat",
   "title": "字串重複",
   "unit": "Counting Loop",
   "summary": "讀入字串 S 和次數 N，用 while 迴圈加計數器 t，把 S 連續印 N 次。",
   "len": "sent",
   "t": "S, N = input().split(' ')\nN = int(N)\n\nt = 0\nwhile t < N:\n    print(f'{S}', end='')\n    t = t + 1",
   "notes": {
    "0": "用空白切開，S 是字串，N 還要轉成整數。",
    "3": "計數器，記錄已經印了幾次。",
    "4": "t 從 0 到 N-1，共 N 次。",
    "5": "end='' 不換行，所以會黏在一起。",
    "6": "記得讓計數器加 1，不然會變成無窮迴圈。"
   },
   "quiz": {
    "input": "cat 4",
    "out": "catcatcatcat",
    "wrong": [
     "cat cat cat cat",
     "catcatcat",
     "cat\ncat\ncat\ncat"
    ]
   }
  },
  {
   "id": "py-rail",
   "title": "柵欄密碼加密",
   "unit": "List and Iteration",
   "summary": "把字串的第 0、2、4… 個字放前面，第 1、3、5… 個字放後面，接起來就是柵欄密碼。",
   "len": "sent",
   "t": "plain = input()\n\nfirst = plain[0::2]\nsecond = plain[1::2]\ncypher = first + second\nprint(cypher)",
   "notes": {
    "2": "切片 [開始:結束:間隔]：從第 0 個開始，每隔 2 個拿一個。",
    "3": "從第 1 個開始，每隔 2 個拿一個。",
    "4": "字串用 + 接起來。"
   },
   "quiz": {
    "input": "meowmeow",
    "out": "momoewew",
    "wrong": [
     "mwmwoeoe",
     "eoeomwmw",
     "mowemowe"
    ]
   }
  }
 ]
};
export const CODE_WORDS = {
 "cpp": [
  {
   "t": "int r;",
   "note": "宣告一個整數變數 r，用來存半徑。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "cin >> r;",
   "note": "從鍵盤讀一個整數，存進 r。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "cout << r*r*3.1415926;",
   "note": "int 乘上小數會變成小數計算；cout 預設最多印 6 位有效數字。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "cout << \">\\\"<\\\\\\\\\\n\\\\|/\";",
   "note": "字串裡 \\\" 會印出 \"，\\\\ 會印出一個 \\，\\n 會換行。所以 \\\\\\\\ 印出兩個反斜線 \\\\。",
   "from": "><\"\\\\",
   "unit": "Basic Input and Output"
  },
  {
   "t": "string name;",
   "note": "string 是「字串」型態，可以存一串文字，例如名字。",
   "from": "美國親戚的自我介紹",
   "unit": "Basic Input and Output"
  },
  {
   "t": "cin >> name >> year;",
   "note": "一次讀兩個值：先讀名字，再讀年份，中間用空白隔開。",
   "from": "美國親戚的自我介紹",
   "unit": "Basic Input and Output"
  },
  {
   "t": "cout << \"\\\"您好，我的名字是\" << name << \"！民國\" << year-1911 << \"年出生 ><\\\"\\\\\\\\\\\"\";",
   "note": "year-1911 會先算出民國年再印出來；\\\" 印出雙引號，\\\\ 印出反斜線。",
   "from": "美國親戚的自我介紹",
   "unit": "Basic Input and Output"
  },
  {
   "t": "int a, b;",
   "note": "兩個整數變數。整數相除時，小數部分會被直接捨去。",
   "from": "整數的五則運算",
   "unit": "Operators"
  },
  {
   "t": "cout << a << \" + \" << b << \" = \" << a + b << endl;",
   "note": "用 << 把文字和數字接在一起印出；endl 代表換行。",
   "from": "整數的五則運算",
   "unit": "Operators"
  },
  {
   "t": "cout << a << \" / \" << b << \" = \" << a / b << endl;",
   "note": "兩個 int 相除是「整數除法」：17 / 5 = 3，不是 3.4。",
   "from": "整數的五則運算",
   "unit": "Operators"
  },
  {
   "t": "cout << a << \" % \" << b << \" = \" << a % b << endl;",
   "note": "% 是取餘數：17 除以 5 商 3 餘 2。",
   "from": "整數的五則運算",
   "unit": "Operators"
  },
  {
   "t": "double c = a;",
   "note": "把 a 複製到小數變數 c，等一下用 c/b 才會得到小數結果。",
   "from": "除法原理",
   "unit": "Operators"
  },
  {
   "t": "cout << a << \" / \" << b << \" = \" << c/b << endl;",
   "note": "c 是 double，所以 c/b 是小數除法，7 / 2 會得到 3.5。",
   "from": "除法原理",
   "unit": "Operators"
  },
  {
   "t": "cout << a << \" = \" << b << \" * \" << a/b << \" + \" << a%b;",
   "note": "a/b 是整數除法（商），a%b 是餘數。",
   "from": "除法原理",
   "unit": "Operators"
  },
  {
   "t": "double a;",
   "note": "double 可以存小數。",
   "from": "四捨五入到個位數",
   "unit": "Operators"
  },
  {
   "t": "int b = a + 0.5;",
   "note": "把小數存進 int 時，小數部分會直接被捨去。先加 0.5 再捨去，就等於四捨五入：2.6 + 0.5 = 3.1 → 3。",
   "from": "四捨五入到個位數",
   "unit": "Operators"
  },
  {
   "t": "if (x % y == 0) {",
   "note": "x 除以 y 的餘數等於 0，代表整除，x 就是 y 的倍數。注意比較相等要用兩個等號 ==。",
   "from": "倍數判斷",
   "unit": "Selection Structure"
  },
  {
   "t": "int price = a*b + c*d;",
   "note": "兩行的「數量 × 單價」加起來就是總價。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "if (price <= 100) {",
   "note": "規則一：100 元以內不打折。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "else if (price % 10 == 9) {",
   "note": "規則二：個位數是 9，打 9 折。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "int result = price * 0.9;",
   "note": "小數存進 int 會直接捨去，等於「無條件捨去」。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "else if (price % 8 == 0) {",
   "note": "規則三：8 的倍數，打 85 折後無條件進位。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "if (price * 0.85 - a > 0) {",
   "note": "打折後的金額減掉整數部分還大於 0，代表有小數，就要進位（加 1）。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "else if (price % 100 == 77) {",
   "note": "規則四：最後兩位是 77，只有超過 100 元的部分打 5 折。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "int result = (price - 100) * 0.5 + 100 + 0.5;",
   "note": "最後加 0.5 再存進 int，就是四捨五入。",
   "from": "鳳新福利社大拍賣",
   "unit": "Selection Structure"
  },
  {
   "t": "int hp = 100;",
   "note": "魔王一開始的血量。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "while (hp > 0) {",
   "note": "只要魔王還有血，就一直重複大括號裡的事。每一輪開始前都會重新檢查條件。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "hp = hp - atk;",
   "note": "每次攻擊扣掉 atk 點血。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "cout << \"hp = \" << hp << endl;",
   "note": "扣完血就印出來，所以最後一行會是 0 或負數。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "coke = money / 27;",
   "note": "整數除法：錢能買幾瓶。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "bottle = coke;",
   "note": "喝完的可樂都變成空瓶。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "while (bottle >= 4) {",
   "note": "只要空瓶還夠 4 個，就繼續換。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "bottle = bottle - 4;",
   "note": "拿 4 個空瓶去換，",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "coke = coke + 1;",
   "note": "多喝了一瓶，",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "bottle = bottle + 1;",
   "note": "喝完又多一個空瓶。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "money = money % 27;",
   "note": "買完後剩下的零錢。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "while (bottle >= 4 || cap > 0 || money >= 27) {",
   "note": "|| 是「或」：三件事只要有一件還能做，就繼續迴圈。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "if (bottle >= 4) {",
   "note": "第一件事：空瓶換可樂，換到的可樂喝完也會多一個瓶子和瓶蓋。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "if (cap > 0) {",
   "note": "第二件事：瓶蓋全部拿去退錢，每個 5 元。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "if (money >= 27) {",
   "note": "第三件事：錢夠就買，買幾瓶就多幾個瓶子和瓶蓋。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "cout << coke << \"\\n\" << bottle << \"\\n\" << money;",
   "note": "依序印出喝了幾瓶、剩幾個空瓶、剩多少錢。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "int left, right;",
   "note": "left 存「目前最大的數」，right 存「剛讀進來的數」。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "cin >> left >> right;",
   "note": "先讀前兩個數。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "if (left > right) {",
   "note": "left 比較大就什麼都不用做，所以這個大括號是空的。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "left = right;",
   "note": "right 比較大（或一樣大），就讓 right 成為新的擂台主。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "cin >> right;",
   "note": "再讀下一個數，重複同樣的比較。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "cout << left;",
   "note": "比完四次，left 就是五個數裡最大的。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "bool isPrime = true;",
   "note": "先假設 N 是質數，找到反例再改成 false。bool 只能存 true 或 false。",
   "from": "質數判斷",
   "unit": "Conditional Loop"
  },
  {
   "t": "for (int t = 2; t <= N-1; t = t + 1) {",
   "note": "t 從 2 試到 N-1。",
   "from": "質數判斷",
   "unit": "Conditional Loop"
  },
  {
   "t": "if (N % t == 0) {",
   "note": "餘數是 0 代表 t 能整除 N。",
   "from": "質數判斷",
   "unit": "Conditional Loop"
  },
  {
   "t": "break;",
   "note": "找到一個因數就夠了，break 直接跳出迴圈，不再試後面的數。",
   "from": "質數判斷",
   "unit": "Conditional Loop"
  },
  {
   "t": "if (isPrime) {",
   "note": "整個迴圈都沒找到因數，isPrime 還是 true，才印出「是質數」。",
   "from": "質數判斷",
   "unit": "Conditional Loop"
  },
  {
   "t": "for (int m = 0; m <= a-1; m = m + 1) {",
   "note": "外層迴圈：m 從 0 到 a-1，每一個 m 是一列。",
   "from": "格子點",
   "unit": "Counting Loop"
  },
  {
   "t": "for (int n = 0; n <= b-1; n = n + 1) {",
   "note": "內層迴圈：外層每跑一次，內層就從頭跑完一輪。",
   "from": "格子點",
   "unit": "Counting Loop"
  },
  {
   "t": "cout << \"\\n\";",
   "note": "內層跑完（一列印完）才換行，所以這行在內層迴圈外面。",
   "from": "格子點",
   "unit": "Counting Loop"
  },
  {
   "t": "string S;",
   "note": "字串變數，存要重複的文字。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "for (int t = 1; t <= N; t = t + 1) {",
   "note": "t 從 1 數到 N，迴圈剛好跑 N 次。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "cout << S;",
   "note": "沒有空白也沒有換行，所以會黏在一起。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "int d = a2 - a1;",
   "note": "公差＝第二項減第一項。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "cout << a;",
   "note": "先印第一項，後面每一項前面才加逗號，這樣最後不會多一個逗號。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "for (int t = 1; t <= n-1; t = t + 1) {",
   "note": "第一項已經印了，所以只要再跑 n-1 次。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "a = a + d;",
   "note": "每次加上公差，得到下一項。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "int vote[7] = {0};",
   "note": "7 格全部設成 0。用 vote[1]～vote[6] 記錄 1～6 點的次數，vote[0] 不用。",
   "from": "骰子點數統計與長條圖",
   "unit": "Array and Search"
  },
  {
   "t": "vote[a] = vote[a] + 1;",
   "note": "擲出幾點，就讓那一格加 1。點數直接當成陣列的編號。",
   "from": "骰子點數統計與長條圖",
   "unit": "Array and Search"
  },
  {
   "t": "for (int d = 1; d <= 6; d = d + 1) {",
   "note": "外層：每一種點數一行。",
   "from": "骰子點數統計與長條圖",
   "unit": "Array and Search"
  },
  {
   "t": "for (int t = 1; t <= vote[d]; t = t + 1) {",
   "note": "內層：出現幾次就印幾顆星。出現 0 次就是空行。",
   "from": "骰子點數統計與長條圖",
   "unit": "Array and Search"
  },
  {
   "t": "int score[7];",
   "note": "一個可以放 7 個整數的陣列，編號從 score[0] 到 score[6]。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "for (int i = 0; i <= 6; i = i + 1) {",
   "note": "用迴圈把 7 個分數依序讀進陣列。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "int max, min = score[0];",
   "note": "先把第一個分數當成目前的最大值和最小值。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "if (score[i] > max) {",
   "note": "遇到更大的就更新最大值。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "if (score[i] < min) {",
   "note": "遇到更小的就更新最小值。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "float average = 0;",
   "note": "float 是小數，先當成總和用。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "average = (average - max - min)/5.0;",
   "note": "總和扣掉最高和最低，再除以 5.0（寫成小數才是小數除法）。",
   "from": "公平成績",
   "unit": "Array and Search"
  },
  {
   "t": "int num[n];",
   "note": "依照讀進來的 n 開一個陣列。",
   "from": "抽獎箱",
   "unit": "Array and Search"
  },
  {
   "t": "int ans = -1;",
   "note": "-1 代表「還沒找到」，因為正常的位置不會是 -1。",
   "from": "抽獎箱",
   "unit": "Array and Search"
  },
  {
   "t": "if (num[i] == x) {",
   "note": "找到了。",
   "from": "抽獎箱",
   "unit": "Array and Search"
  },
  {
   "t": "ans = i + 1;",
   "note": "陣列編號從 0 開始，人數數從 1 開始，所以要加 1。",
   "from": "抽獎箱",
   "unit": "Array and Search"
  },
  {
   "t": "if (ans != -1) {",
   "note": "ans 被改過，代表有找到。",
   "from": "抽獎箱",
   "unit": "Array and Search"
  },
  {
   "t": "int ming = 1;",
   "note": "名次從第 1 名開始算。",
   "from": "我是第幾名",
   "unit": "Array and Search"
  },
  {
   "t": "if (scores[i] > x) {",
   "note": "每遇到一個比我高的人，名次就往後一名。",
   "from": "我是第幾名",
   "unit": "Array and Search"
  },
  {
   "t": "if (scores[i] == x) {",
   "note": "順便檢查 x 有沒有出現在名單上。",
   "from": "我是第幾名",
   "unit": "Array and Search"
  },
  {
   "t": "if (found) {",
   "note": "有找到 x 才印名次。",
   "from": "我是第幾名",
   "unit": "Array and Search"
  },
  {
   "t": "int left = 0, right = n-1;",
   "note": "一開始的搜尋範圍是整個陣列。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "while (right - left >= 0) {",
   "note": "範圍裡還有數字就繼續找。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "int mid = (left + right) / 2;",
   "note": "中間的位置；整數除法會自動捨去小數。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "cout << left << \" \" << right << \" \" << mid << \" \" << nums[mid];",
   "note": "印出這一步的搜尋範圍、中間位置和中間的數。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "if (nums[mid] == x) {",
   "note": "剛好找到。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "else if (nums[mid] < x) {",
   "note": "中間的數太小，答案一定在右半邊，所以 left 移到 mid + 1。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "if (!found) {",
   "note": "! 是「不是」：沒有找到才印「找不到」。",
   "from": "二分搜尋實驗 A：追蹤每一步",
   "unit": "Sort"
  },
  {
   "t": "for (int i = 0; i <= n-2; i = i + 1) {",
   "note": "內層：比較 nums[i] 和 nums[i+1]，i 只到 n-2，不然 i+1 會超出陣列。",
   "from": "氣泡排序法",
   "unit": "Sort"
  },
  {
   "t": "if (nums[i] > nums[i+1]) {",
   "note": "前面比後面大，順序錯了，要交換。",
   "from": "氣泡排序法",
   "unit": "Sort"
  },
  {
   "t": "int wang = nums[i];",
   "note": "交換三步驟：先把 nums[i] 存到暫存變數，",
   "from": "氣泡排序法",
   "unit": "Sort"
  },
  {
   "t": "nums[i] = nums[i+1];",
   "note": "再把後面的搬到前面，",
   "from": "氣泡排序法",
   "unit": "Sort"
  },
  {
   "t": "nums[i+1] = wang;",
   "note": "最後把暫存的放到後面。少了暫存變數，其中一個值會被蓋掉。",
   "from": "氣泡排序法",
   "unit": "Sort"
  },
  {
   "t": "for (int i = 0; i <= n-1; i = i + 1) {",
   "note": "每一輪結束印出整個陣列，可以看到大的數一輪一輪浮到後面。",
   "from": "氣泡排序法",
   "unit": "Sort"
  },
  {
   "t": "int ans = -1, pre = -1, post = -1;",
   "note": "ans：x 的位置；pre：比 x 小的最後一本；post：比 x 大的第一本。-1 代表沒有。",
   "from": "鳳新圖書搜尋器",
   "unit": "Sort"
  },
  {
   "t": "if (x > books[i]) {",
   "note": "書號比 x 小，一直往後更新，最後留下的就是「x 前面那本」。",
   "from": "鳳新圖書搜尋器",
   "unit": "Sort"
  },
  {
   "t": "if (x < books[i]) {",
   "note": "第一本比 x 大的書就是「x 後面那本」，找到就 break。",
   "from": "鳳新圖書搜尋器",
   "unit": "Sort"
  }
 ],
 "py": [
  {
   "t": "pi = 3.1415926",
   "note": "Python 的變數不用先宣告型態，直接給值就好。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "r = input()",
   "note": "input() 讀進來的一定是字串，例如 '2'。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "r = int(r)",
   "note": "用 int() 把字串轉成整數才能計算。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "print(f'{r*r*pi:.4f}')",
   "note": "f-string 裡用大括號放算式；:.4f 表示印到小數點後 4 位（會四捨五入）。",
   "from": "圓面積",
   "unit": "Basic Input and Output"
  },
  {
   "t": "print('Hello, Kitty!')",
   "note": "print 會把括號裡的東西印出來；單引號只是用來標示「這是字串」，不會被印出來。",
   "from": "Hello Kitty",
   "unit": "Basic Input and Output"
  },
  {
   "t": "height, weight = input().split()",
   "note": "split() 用空白把一行切成兩段，分別給 height 和 weight。",
   "from": "BMI Result",
   "unit": "Selection Structure"
  },
  {
   "t": "height = float(height) / 100",
   "note": "轉成小數，再把公分換成公尺。",
   "from": "BMI Result",
   "unit": "Selection Structure"
  },
  {
   "t": "bmi = weight / (height ** 2)",
   "note": "** 是次方：體重除以身高的平方。",
   "from": "BMI Result",
   "unit": "Selection Structure"
  },
  {
   "t": "print(f'BMI:{bmi:.1f}')",
   "note": "印到小數點後 1 位。",
   "from": "BMI Result",
   "unit": "Selection Structure"
  },
  {
   "t": "if (bmi < 18):",
   "note": "小於 18 是過輕。",
   "from": "BMI Result",
   "unit": "Selection Structure"
  },
  {
   "t": "學期總分 = 期中考*0.25 + 期末考*0.30 + 作業*0.45",
   "note": "期中 25%、期末 30%、作業 45%。",
   "from": "資訊成績",
   "unit": "Selection Structure"
  },
  {
   "t": "if 學期總分 % 1 == 0:",
   "note": "總分剛好是整數的話，轉成 int，印出來就不會有 .0。",
   "from": "資訊成績",
   "unit": "Selection Structure"
  },
  {
   "t": "print(f'總分：{學期總分}。', end='')",
   "note": "end='' 讓 print 印完不要換行，下一個 print 會接在同一行。",
   "from": "資訊成績",
   "unit": "Selection Structure"
  },
  {
   "t": "if 學期總分 < 40:",
   "note": "elif 由上往下檢查，第一個成立的就執行，後面的都不看。",
   "from": "資訊成績",
   "unit": "Selection Structure"
  },
  {
   "t": "elif 學期總分 >= 90:",
   "note": "這行放在 < 70 後面也沒問題，因為能走到這裡的都已經 >= 70。",
   "from": "資訊成績",
   "unit": "Selection Structure"
  },
  {
   "t": "def transformInput(x):",
   "note": "自己定義一個函式，把「轉成數字」這件事包起來，下面可以重複使用。",
   "from": "Larger Number",
   "unit": "Selection Structure"
  },
  {
   "t": "x = float(x)",
   "note": "先一律轉成小數。",
   "from": "Larger Number",
   "unit": "Selection Structure"
  },
  {
   "t": "if (x % 1 == 0):",
   "note": "除以 1 的餘數是 0，代表它其實是整數。",
   "from": "Larger Number",
   "unit": "Selection Structure"
  },
  {
   "t": "x = int(x)",
   "note": "轉回整數，印出來就不會有 .0。",
   "from": "Larger Number",
   "unit": "Selection Structure"
  },
  {
   "t": "return x",
   "note": "把處理好的數字交回去給呼叫它的地方。",
   "from": "Larger Number",
   "unit": "Selection Structure"
  },
  {
   "t": "x = transformInput(x)",
   "note": "呼叫上面的函式。",
   "from": "Larger Number",
   "unit": "Selection Structure"
  },
  {
   "t": "if ((year % 4 == 0) and (year % 100 != 0)) or (year % 400 == 0):",
   "note": "and 是「而且」、or 是「或者」、!= 是「不等於」。1900 能被 4 和 100 整除，但不能被 400 整除，所以不是閏年。",
   "from": "文文的求婚--續集 (1 行版)",
   "unit": "Selection Structure"
  },
  {
   "t": "x, y = input().split(' ')",
   "note": "用空白切開一行輸入，分給 x 和 y（這時還是字串）。",
   "from": "倍數判斷",
   "unit": "Selection Structure"
  },
  {
   "t": "if x % y == 0:",
   "note": "餘數是 0 就是倍數。Python 的 if 後面要加冒號，下一行要縮排。",
   "from": "倍數判斷",
   "unit": "Selection Structure"
  },
  {
   "t": "while hp > 0:",
   "note": "條件成立就重複執行下面縮排的那幾行。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "hp = hp - atk",
   "note": "每次攻擊扣血。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "print(f'hp = {hp}')",
   "note": "f-string：大括號裡的變數會換成它的值。",
   "from": "魔王勇者",
   "unit": "Conditional Loop"
  },
  {
   "t": "coke = money // 27",
   "note": "整數除法：錢能買幾瓶。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "while bottle >= 4:",
   "note": "空瓶夠 4 個就繼續換。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "ex = bottle // 4",
   "note": "這一輪一次能換幾瓶。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "bottle = bottle % 4",
   "note": "換完剩下湊不滿 4 個的空瓶，",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "bottle += ex",
   "note": "換來的可樂喝完又變成空瓶。+= 是「加上」的簡寫。",
   "from": "肥宅快樂水（瓶子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "money %= 27",
   "note": "買完剩下的零錢。%= 是「取餘數後存回去」的簡寫。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "while (bottle >= 4) or (cap > 0) or (money >= 27):",
   "note": "三件事只要有一件還能做就繼續。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "if bottle >= 4:",
   "note": "空瓶換一瓶，喝完多一個瓶子和瓶蓋。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "if cap > 0:",
   "note": "瓶蓋全部退錢。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "if money >= 27:",
   "note": "錢夠就買一瓶。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "print(f'{coke}\\n{bottle}\\n{money}')",
   "note": "\\n 是換行，所以會印成三行。",
   "from": "肥宅快樂水（瓶子+蓋子）",
   "unit": "Conditional Loop"
  },
  {
   "t": "while n != 1:",
   "note": "還沒變成 1 就繼續。",
   "from": "考拉茲猜想 Collatz Conjecture",
   "unit": "Conditional Loop"
  },
  {
   "t": "if n % 2 == 0:",
   "note": "偶數。",
   "from": "考拉茲猜想 Collatz Conjecture",
   "unit": "Conditional Loop"
  },
  {
   "t": "n = n // 2",
   "note": "// 是整數除法，結果還是整數（/ 會變成小數）。",
   "from": "考拉茲猜想 Collatz Conjecture",
   "unit": "Conditional Loop"
  },
  {
   "t": "n = 3*n + 1",
   "note": "奇數就乘 3 加 1。",
   "from": "考拉茲猜想 Collatz Conjecture",
   "unit": "Conditional Loop"
  },
  {
   "t": "print(n, end=' ')",
   "note": "end=' ' 讓每個數後面接一個空白，而不是換行。",
   "from": "考拉茲猜想 Collatz Conjecture",
   "unit": "Conditional Loop"
  },
  {
   "t": "left = int(input())",
   "note": "先讀第一個數，當作目前最大的。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "for t in range(4):",
   "note": "range(4) 是 0、1、2、3，迴圈跑 4 次，讀剩下的四個數。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "if right > left:",
   "note": "新讀的數比較大，",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "left, right = right, left",
   "note": "Python 可以一行交換兩個變數，不用暫存變數。",
   "from": "五數最大值",
   "unit": "Conditional Loop"
  },
  {
   "t": "nums = map(int, input().split())",
   "note": "split() 切開後，map(int, …) 把每一段都轉成整數。",
   "from": "五數最大值（一行輸入）",
   "unit": "Counting Loop"
  },
  {
   "t": "max_num = '?'",
   "note": "用 '?' 標記「還沒有比過」，這樣全部是負數也不會出錯（如果一開始設成 0 就會錯）。",
   "from": "五數最大值（一行輸入）",
   "unit": "Counting Loop"
  },
  {
   "t": "for n in nums:",
   "note": "一個一個拿出來比。",
   "from": "五數最大值（一行輸入）",
   "unit": "Counting Loop"
  },
  {
   "t": "if max_num == '?' or n > max_num:",
   "note": "第一個數直接當最大值，之後比較大才更新。",
   "from": "五數最大值（一行輸入）",
   "unit": "Counting Loop"
  },
  {
   "t": "isPrime = True",
   "note": "先假設是質數。Python 的 True、False 開頭要大寫。",
   "from": "質數判斷",
   "unit": "Counting Loop"
  },
  {
   "t": "for i in range(2, N):",
   "note": "range(2, N) 是 2、3、…、N-1，不包含 N。",
   "from": "質數判斷",
   "unit": "Counting Loop"
  },
  {
   "t": "if N % i == 0:",
   "note": "能整除就找到因數了。",
   "from": "質數判斷",
   "unit": "Counting Loop"
  },
  {
   "t": "if isPrime:",
   "note": "迴圈結束後還是 True，代表沒有任何因數。",
   "from": "質數判斷",
   "unit": "Counting Loop"
  },
  {
   "t": "S, N = input().split(' ')",
   "note": "用空白切開，S 是字串，N 還要轉成整數。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "while t < N:",
   "note": "t 從 0 到 N-1，共 N 次。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "print(f'{S}', end='')",
   "note": "end='' 不換行，所以會黏在一起。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "t = t + 1",
   "note": "記得讓計數器加 1，不然會變成無窮迴圈。",
   "from": "字串重複",
   "unit": "Counting Loop"
  },
  {
   "t": "d = a2 - a1",
   "note": "公差可以是負的，例如 7 - 10 = -3。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "for i in range(n-1):",
   "note": "先印前 n-1 項，每項後面都接逗號。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "print(a, end=',')",
   "note": "end=',' 讓 print 結尾印逗號而不是換行。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "print(a, end='')",
   "note": "最後一項單獨印，後面不加逗號。",
   "from": "等差數列-for版",
   "unit": "Counting Loop"
  },
  {
   "t": "passed = []",
   "note": "先準備兩個空的 list。",
   "from": "及格與不及格",
   "unit": "List and Iteration"
  },
  {
   "t": "if score >= 60:",
   "note": "60 分也算及格。",
   "from": "及格與不及格",
   "unit": "List and Iteration"
  },
  {
   "t": "passed.append(score)",
   "note": "append 把一個值加到 list 的最後面。",
   "from": "及格與不及格",
   "unit": "List and Iteration"
  },
  {
   "t": "if passed:",
   "note": "list 裡面有東西就是 True，空的 list 是 False。",
   "from": "及格與不及格",
   "unit": "List and Iteration"
  },
  {
   "t": "print(*passed)",
   "note": "* 會把 list 拆開，印成用空白隔開的數字，不會有中括號。",
   "from": "及格與不及格",
   "unit": "List and Iteration"
  },
  {
   "t": "first = plain[0::2]",
   "note": "切片 [開始:結束:間隔]：從第 0 個開始，每隔 2 個拿一個。",
   "from": "柵欄密碼加密",
   "unit": "List and Iteration"
  },
  {
   "t": "second = plain[1::2]",
   "note": "從第 1 個開始，每隔 2 個拿一個。",
   "from": "柵欄密碼加密",
   "unit": "List and Iteration"
  },
  {
   "t": "cypher = first + second",
   "note": "字串用 + 接起來。",
   "from": "柵欄密碼加密",
   "unit": "List and Iteration"
  },
  {
   "t": "scores = list(map(int, input().split()))",
   "note": "一行讀進所有成績，轉成整數後放進 list。",
   "from": "全班成績統計",
   "unit": "List and Iteration"
  },
  {
   "t": "for score in scores:",
   "note": "走訪 list：score 依序是每一個成績。",
   "from": "全班成績統計",
   "unit": "List and Iteration"
  },
  {
   "t": "total = total + score",
   "note": "累加總分。",
   "from": "全班成績統計",
   "unit": "List and Iteration"
  },
  {
   "t": "average = total / n",
   "note": "/ 會得到小數。",
   "from": "全班成績統計",
   "unit": "List and Iteration"
  },
  {
   "t": "if score > average:",
   "note": "再走訪一次，數有幾個人高於平均（等於平均不算）。",
   "from": "全班成績統計",
   "unit": "List and Iteration"
  },
  {
   "t": "print(f'{total}\\n{average:.2f}\\n{count}')",
   "note": ":.2f 印到小數點後 2 位。",
   "from": "全班成績統計",
   "unit": "List and Iteration"
  }
 ]
};
