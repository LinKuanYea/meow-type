#!/usr/bin/env python3
"""把 content/code/ 的程式與說明編成 shared/bank-code.js。

每一題兩個檔案：
  <id>.cpp 或 <id>.py   程式（林老師在 MeowJudge 上 AC 的作答，去掉註解與行尾空白）
  <id>.meta              說明：
      title: 題目名稱
      unit: 單元
      summary: 一句話說明
      input: 預測輸出用的輸入（\\n 代表換行；空白＝沒有輸入）
      wrong: 錯誤選項（可以好幾行；\\n 代表換行）
      @ 某一行開頭的文字 => 這一行的說明

      retired: 1             （選填）不再出題，但編號保留

預測輸出的正確答案一律實際執行程式產生，不手寫。
題目順序記在 content/code/order.lock.json：排行榜、分享連結存的是題目編號，
所以舊題目的順序固定不動，新題目一律排在後面；不能直接刪題，要改成 retired。
用法：python3 scripts/build-code-bank.py（需要 g++ 與 python3）
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "content", "code")
OUT = os.path.join(ROOT, "shared", "bank-code.js")
LOCK = os.path.join(SRC, "order.lock.json")
SENT_MAX_LINES = {"cpp": 12, "py": 8}  # 不超過這麼多行（不算空行）算「句子」，其他算「整段」
UNITS = {
    "cpp": ["Basic Input and Output", "Operators", "Selection Structure", "Conditional Loop", "Counting Loop", "Array and Search", "Sort"],
    "py": ["Basic Input and Output", "Selection Structure", "Conditional Loop", "Counting Loop", "List and Iteration"],
}
AUTO = {
    "#include <iostream>": "載入輸入輸出的功能，才能用 cin 和 cout。",
    "using namespace std;": "使用標準命名空間，這樣 cout、cin 前面就不用寫 std::。",
    "int main() {": "程式從 main 開始執行。",
}

def norm(out):
    """比較與顯示用：每行去掉行尾空白，去掉最後的空行"""
    return "\n".join(l.rstrip() for l in out.replace("\r", "").split("\n")).rstrip("\n")

def run(lang, path, stdin, tmp):
    if lang == "cpp":
        exe = os.path.join(tmp, os.path.basename(path) + ".out")
        subprocess.run(["g++", "-O0", "-o", exe, path], check=True, capture_output=True)
        cmd = [exe]
    else:
        cmd = [sys.executable, path]
    r = subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=5)
    if r.returncode != 0:
        raise SystemExit(f"{path} 執行失敗：{r.stderr}")
    return r.stdout

def parse_meta(path):
    meta = {"wrong": [], "notes": []}
    for raw in open(path, encoding="utf-8").read().split("\n"):
        if not raw.strip():
            continue
        if raw.startswith("@ "):
            k, _, v = raw[2:].partition(" => ")
            if not v:
                raise SystemExit(f"{path}：說明要寫成「@ 開頭文字 => 說明」：{raw}")
            meta["notes"].append((k, v))
            continue
        k, _, v = raw.partition(":")
        v = v[1:] if v.startswith(" ") else v
        if k == "wrong":
            meta["wrong"].append(v.replace("\\n", "\n"))
        elif k in ("title", "unit", "summary", "input", "retired"):
            meta[k] = v
        else:
            raise SystemExit(f"{path}：看不懂這一行：{raw}")
    return meta

def main():
    bank = {"cpp": [], "py": []}
    errors = []
    with tempfile.TemporaryDirectory() as tmp:
        for name in sorted(os.listdir(SRC)):
            if not name.endswith(".meta"):
                continue
            pid = name[:-5]
            lang = pid.split("-")[0]
            code_path = os.path.join(SRC, pid + (".cpp" if lang == "cpp" else ".py"))
            code = open(code_path, encoding="utf-8").read().rstrip("\n")
            meta = parse_meta(os.path.join(SRC, name))
            for k in ("title", "unit", "summary"):
                if not meta.get(k):
                    errors.append(f"{pid}：缺少 {k}")
            if meta.get("unit") not in UNITS[lang]:
                errors.append(f"{pid}：單元「{meta.get('unit')}」不在清單裡")
            lines = code.split("\n")
            notes = {}
            for i, l in enumerate(lines):
                if l.strip() in AUTO:
                    notes[i] = AUTO[l.strip()]
            pos = 0
            for prefix, text in meta["notes"]:
                for i in range(pos, len(lines)):
                    if lines[i].strip().startswith(prefix):
                        notes[i] = text
                        pos = i + 1
                        break
                else:
                    errors.append(f"{pid}：找不到「{prefix}」這一行（說明要照程式的順序寫）")
            stdin = (meta.get("input") or "").replace("\\n", "\n")
            out = norm(run(lang, code_path, stdin + "\n" if stdin else "", tmp))
            wrong = [norm(w) for w in meta["wrong"]]
            if len(wrong) < 2:
                errors.append(f"{pid}：錯誤選項至少要 2 個")
            for w in wrong:
                if w == out:
                    errors.append(f"{pid}：錯誤選項跟正確答案一樣：{w!r}")
            if len(set(wrong)) != len(wrong):
                errors.append(f"{pid}：錯誤選項重複")
            n_lines = len([l for l in lines if l.strip()])
            item = {
                "id": pid, "title": meta["title"], "unit": meta["unit"], "summary": meta["summary"],
                "len": "sent" if n_lines <= SENT_MAX_LINES[lang] else "para",
                "t": code, "notes": {str(k): v for k, v in sorted(notes.items())},
                "quiz": {"input": stdin, "out": out, "wrong": wrong},
            }
            if meta.get("retired"):
                item["retired"] = True
            bank[lang].append(item)
            print(f"{pid:14} {len(lines):3} 行  輸出：{out[:40]!r}")
    if errors:
        print("\n".join("✗ " + e for e in errors))
        raise SystemExit(1)
    lock = json.load(open(LOCK, encoding="utf-8")) if os.path.exists(LOCK) else {}
    words = {}
    for lang in bank:
        # 舊題目照鎖定的順序，新題目排在後面（同一種長度裡的編號才不會變）
        order = {}
        for ln in ("sent", "para"):
            for i, pid in enumerate(lock.get(f"{lang}.{ln}", [])):
                order[pid] = (ln, i)
        ids = {x["id"] for x in bank[lang]}
        for pid, (ln, _) in order.items():
            if pid not in ids:
                errors.append(f"{pid}：題目不見了。不能直接刪題（舊的排行榜和分享連結會對不上），請在 .meta 加 retired: 1")
        for x in bank[lang]:
            if x["id"] in order and order[x["id"]][0] != x["len"]:
                errors.append(f"{x['id']}：行數改變，從「{order[x['id']][0]}」變成「{x['len']}」，編號會亂掉；請改成新題目（新檔名），舊的加 retired: 1")
        bank[lang].sort(key=lambda x: (x["len"], order.get(x["id"], ("", 10**9))[1], UNITS[lang].index(x["unit"]), x["id"]))
        # 單詞模式：有說明的那幾行（去掉縮排），一行一題
        seen, ws = set(), []
        for item in sorted(bank[lang], key=lambda x: (UNITS[lang].index(x["unit"]), x["id"])):
            lines = item["t"].split("\n")
            for k, note in item["notes"].items():
                line = lines[int(k)].strip()
                if line in AUTO or len(line) < 6 or line in seen or line.endswith("{") and line.count("(") == 0:
                    continue
                seen.add(line)
                ws.append({"t": line, "note": note, "from": item["title"], "unit": item["unit"], **({"retired": True} if item.get("retired") else {})})
        # 單詞：舊的照順序；程式改了而不見的那行保留成 retired
        old = lock.get(f"{lang}.word", [])
        cur = {w["t"]: w for w in ws}
        kept = [cur.pop(w["t"]) if w["t"] in cur else {**w, "retired": True} for w in old]
        words[lang] = kept + [w for w in ws if w["t"] in cur]
    if errors:
        print("\n".join("✗ " + e for e in errors))
        raise SystemExit(1)
    js = ("// 自動產生，不要手動改：改 content/code/ 之後執行 python3 scripts/build-code-bank.py\n"
          "// 程式來自林老師在 MeowJudge 115-1 的作答（C++：110 班；Python：Python 班），預測輸出的答案由實際執行產生。\n"
          f"export const CODE_UNITS = {json.dumps(UNITS, ensure_ascii=False)};\n"
          f"export const CODE = {json.dumps(bank, ensure_ascii=False, indent=1)};\n"
          f"export const CODE_WORDS = {json.dumps(words, ensure_ascii=False, indent=1)};\n")
    open(OUT, "w", encoding="utf-8").write(js)
    new_lock = {}
    for lang in bank:
        for ln in ("sent", "para"):
            new_lock[f"{lang}.{ln}"] = [x["id"] for x in bank[lang] if x["len"] == ln]
        new_lock[f"{lang}.word"] = words[lang]
    open(LOCK, "w", encoding="utf-8").write(json.dumps(new_lock, ensure_ascii=False, indent=1) + "\n")
    print(f"寫入 {OUT}：C++ {len(bank['cpp'])} 題（單行 {len(words['cpp'])}）、Python {len(bank['py'])} 題（單行 {len(words['py'])}）")

main()
