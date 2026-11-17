// 題庫：全部是原創範例文字。改題目只要改這個檔案。
// 程式題縮排一律 4 個空白。
export const BANK = {
cpp:{
word:['cout << x;','cout << "Hello" << endl;','cin >> n;','int a[5] = {5, 3, 8, 1, 4};','for (int i = 0; i < n; i++)','sum += a[i];','if (a[j] > a[j + 1])','swap(a[j], a[j + 1]);','return 0;','#include <iostream>','using namespace std;','cout << a << " " << b << endl;','vector<int> v;','v.push_back(x);','string name = "Mimi";','while (n > 0)','cout << n % 10;','long long ans = 1;','int mid = (lo + hi) / 2;','cout << "Meow!" << endl;'],
sent:['int n;\ncin >> n;\ncout << n * 2 << endl;','for (int i = 1; i <= 5; i++) {\n    cout << i << " ";\n}','if (n % 2 == 0) {\n    cout << "even";\n} else {\n    cout << "odd";\n}','int sum = 0;\nfor (int i = 0; i < n; i++) {\n    sum += a[i];\n}','while (n > 0) {\n    cout << n % 10;\n    n /= 10;\n}','int lives = 9;\nif (lives > 0) {\n    cout << "meow" << endl;\n}'],
para:['#include <iostream>\nusing namespace std;\n\nint main() {\n    int a[5] = {5, 3, 8, 1, 4};\n    int n = 5;\n    for (int i = 0; i < n - 1; i++) {\n        for (int j = 0; j < n - 1 - i; j++) {\n            if (a[j] > a[j + 1]) {\n                int t = a[j];\n                a[j] = a[j + 1];\n                a[j + 1] = t;\n            }\n        }\n    }\n    for (int i = 0; i < n; i++) {\n        cout << a[i] << " ";\n    }\n    return 0;\n}',
'int search(int a[], int n, int target) {\n    int lo = 0, hi = n - 1;\n    while (lo <= hi) {\n        int mid = (lo + hi) / 2;\n        if (a[mid] == target) {\n            return mid;\n        } else if (a[mid] < target) {\n            lo = mid + 1;\n        } else {\n            hi = mid - 1;\n        }\n    }\n    return -1;\n}',
'#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 15; i++) {\n        if (i % 15 == 0) {\n            cout << "MeowMeow" << endl;\n        } else if (i % 3 == 0) {\n            cout << "Meow" << endl;\n        } else if (i % 5 == 0) {\n            cout << "Purr" << endl;\n        } else {\n            cout << i << endl;\n        }\n    }\n    return 0;\n}',
'int findMax(int a[], int n) {\n    int best = a[0];\n    for (int i = 1; i < n; i++) {\n        if (a[i] > best) {\n            best = a[i];\n        }\n    }\n    return best;\n}']},
py:{
word:['print("Hello, world!")','x = int(input())','for i in range(10):','names.append("Mimi")','total += price * count','if score >= 60:','return a + b','while n > 0:','nums = [5, 3, 8, 1, 4]','cats = {"Mimi": 3, "Kiki": 5}','print(len(cats))','import random','n = random.randint(1, 100)','print(*nums, sep=", ")','a, b = b, a','def meow(times):','lives -= 1','print(nums[-1])'],
sent:['for i in range(1, 6):\n    print(i * i)','n = int(input())\nif n % 2 == 0:\n    print("even")\nelse:\n    print("odd")','total = 0\nfor x in nums:\n    total += x\nprint(total)','def area(w, h):\n    return w * h','while n > 0:\n    print(n)\n    n -= 1','lives = 9\nif lives > 0:\n    print("meow")'],
para:['nums = [5, 3, 8, 1, 4]\nn = len(nums)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if nums[j] > nums[j + 1]:\n            nums[j], nums[j + 1] = nums[j + 1], nums[j]\nprint(nums)',
'def search(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
'for i in range(1, 16):\n    if i % 15 == 0:\n        print("MeowMeow")\n    elif i % 3 == 0:\n        print("Meow")\n    elif i % 5 == 0:\n        print("Purr")\n    else:\n        print(i)',
'def find_max(nums):\n    best = nums[0]\n    for x in nums[1:]:\n        if x > best:\n            best = x\n    return best\n\nprint(find_max([3, 9, 2, 7]))']},
en:{
word:['cat','keyboard','screen','window','school','teacher','student','practice','program','computer','because','different','important','question','answer','library','weather','umbrella','breakfast','together','remember','beautiful','between','country','minute','problem','family','friend','music','picture','island','ocean','yellow','orange','kitten','careful','quickly','already','believe','enough','finish','follow','language','morning','number','people','science','travel'],
sent:['The cat jumped onto the desk and knocked my pencil off.','Please save your file before you close the window.','A loop repeats the same steps until a condition is false.','My little brother wants a kitten for his birthday.','Practice a little every day, and your fingers will remember.','The library opens at eight, but the cafe opens at seven.','Every program starts with a small idea and a lot of testing.','She forgot her umbrella, so she ran home in the rain.'],
para:['Cats spend a large part of the day asleep, but they are not lazy. Their bodies are built for short bursts of speed, so they save energy between hunts. When a cat wakes up, it stretches, cleans its fur, and checks its territory before looking for something to chase.',
'Learning to type is like learning to ride a bike. At first you look down at the keys and every word feels slow. After a few weeks, your fingers find the right keys on their own, and you can keep your eyes on the screen. The secret is not speed but steady practice.',
'A computer does exactly what you tell it to do, not what you mean. If you forget a semicolon or put a space in the wrong place, the program may stop working. Good programmers read their code carefully and test small pieces one at a time.']},
zh:{
word:['貓咪','鍵盤','程式','迴圈','變數','陣列','排序','螢幕','滑鼠','資料','網路','演算法','練習','速度','正確','高雄','捷運','夜市','珍珠奶茶','颱風','便當','機車','圖書館','操場','專心','耐心','一石二鳥','畫蛇添足','守株待兔','對牛彈琴','井底之蛙','亡羊補牢','熟能生巧','半途而廢'],
sent:['貓咪跳上鍵盤，把我寫好的作業全部刪掉了。','放學後我們約在捷運站，一起去夜市吃東西。','颱風來的前一天，大家都在超市搶買泡麵。','程式不會照你想的做，只會照你寫的做。','每天練習十分鐘，比一次練兩個小時更有用。','老師說，迴圈就是把同一件事重複做很多次。','圖書館的冷氣很強，記得帶一件外套。'],
para:['家裡的貓每天早上六點準時叫我起床。牠先在床邊喵喵叫，如果我不理牠，就跳到我的肚子上踩來踩去。等我終於爬起來倒飼料，牠吃了兩口就走了，然後回到沙發上繼續睡。我常常懷疑，牠根本不餓，只是不想讓我睡。',
'打字跟學騎腳踏車很像。剛開始要一直低頭看鍵盤，打一個字都很慢；練了幾個星期以後，手指會自己找到位置，眼睛就能一直看著螢幕。重點不是一開始打得多快，而是每天都練一點，讓手指記住每個鍵的位置。',
'氣泡排序是最容易理解的排序方法。它從頭到尾比較相鄰的兩個數字，如果前面的比後面大，就把它們交換。每做完一輪，最大的數字就會像氣泡一樣浮到最後面。雖然它不是最快的方法，但很適合用來認識排序的概念。']}};

export const CATS = ["cpp", "py", "en", "zh"];
export const LENS = ["word", "sent", "para"];
export const CAT_NAME = { cpp: "C++", py: "Python", en: "英文", zh: "中文" };
export const LEN_NAME = { word: "單詞", sent: "句子", para: "整段", drill: "弱點練習" };
const WORD_N = { cpp: 6, py: 6, en: 15, zh: 10 };

/** 題目規格 → 文字。spec = { c: 類別, l: 長度, i: [索引…] } */
export function textOf(spec) {
  const b = BANK[spec?.c]?.[spec?.l];
  if (!b || !Array.isArray(spec.i) || !spec.i.length) return null;
  const items = spec.i.map((k) => (Number.isInteger(k) ? b[k] : undefined));
  if (items.some((x) => typeof x !== "string")) return null;
  if (spec.l !== "word") return items.length === 1 ? items[0] : null;
  if (items.length !== WORD_N[spec.c]) return null;
  if (spec.c === "zh") return items.join("，") + "。";
  if (spec.c === "en") return items.join(" ");
  return items.join("\n");
}

/** 隨機出一題；avoid＝上一題的規格（避免連續同一題） */
export function randomSpec(c, l, avoid, rnd = Math.random) {
  const b = BANK[c][l];
  if (l === "word") {
    const idx = [];
    let pool = [...b.keys()];
    while (idx.length < WORD_N[c]) {
      if (!pool.length) pool = [...b.keys()];
      idx.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return { c, l, i: idx };
  }
  let k, tries = 0;
  do { k = Math.floor(rnd() * b.length); } while (avoid && avoid.c === c && avoid.l === l && avoid.i?.[0] === k && b.length > 1 && tries++ < 9);
  return { c, l, i: [k] };
}
