# 한자 낱말카드 (jibun)

한자능력검정시험 공부를 위한 iPad용 낱말카드 웹앱입니다. 지금은 **한국어문회 7급**(배정한자 150자) 기준입니다.

## 학습 모드

| 모드 | 내용 |
|---|---|
| 🃏 낱말카드 | 카드를 눌러 뒤집고, 좌우로 밀어 "알아요 / 다시 볼래요" |
| 🧠 배우기 | 10문제 한 판. 틀린 문제는 다시 나오고, 한자마다 복습 주기를 기록 |
| ✍️ 필순 | 획순 애니메이션, 손가락·펜으로 따라 쓰기, 몇 번째 획인지 맞히는 퀴즈 |
| 🧩 짝 맞추기 | 한자와 훈음을 짝짓는 시간 기록 게임 |
| 📝 모의시험 | 실제 시험 유형 비율(70문항, 49문항 합격)대로 출제, 오답 확인 |

문제 유형: 훈음, 한자 찾기, 한자어 독음(문장 속 포함), 뜻풀이, 반의어, 완성형, 필순.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 에 배포용 파일 생성
```

`main` 브랜치에 올리면 `.github/workflows/deploy.yml` 이 GitHub Pages로 배포합니다
(저장소 Settings → Pages → Source 를 "GitHub Actions"로 설정). iPad Safari에서 주소를 열고
공유 → "홈 화면에 추가"를 하면 전체 화면 앱처럼 쓸 수 있고 인터넷 없이도 동작합니다.

## 데이터와 급수 추가

급수별 데이터는 `src/data/<급수>/` 에 있습니다.

| 파일 | 내용 |
|---|---|
| `chars.txt` | 한자, 훈, 음, 급수, 쉬운 뜻, 다른 훈음 |
| `sets.txt` | 학습 묶음(주제별 10자) |
| `words.txt` | 한자어, 독음, 뜻, 예문 |
| `pairs.txt` | 반의어, 완성형(사자성어) |
| `exam.json` | 시험 구성(유형별 문항 수, 합격선) |
| `stroke-exclude.txt` | 필순 학습에서 빼는 한자 |
| `stroke-quiz.txt` | 필순 퀴즈에 내는 한자 |
| `stroke-order.txt` | 한국 필순에 맞춘 획 순서 교정 |
| `strokes.json` | 획 데이터 (자동 생성) |

새 급수를 넣으려면 폴더를 복사해 내용을 채우고 `src/data/index.ts` 의 `LEVELS`, `LEVEL_LIST` 에 등록한 뒤 아래를 실행합니다.

```bash
node scripts/build-data.mjs 6        # 데이터 검증 + strokes.json 생성
python3 scripts/build-font.py        # 한자 글꼴 서브셋 다시 만들기 (pip install fonttools brotli)
```

## 필순 데이터에 대해

획 데이터는 중국 표준 기반 공개 데이터라서 한국 교과서 필순·자형과 다른 글자가 있습니다.

- 자형·획수가 다른 8자(敎 草 花 萬 道 祖 直 植)는 필순 학습에서 제외했습니다.
- 右, 有 는 한국 필순(삐침 먼저)으로 교정했습니다.
- 필순 **퀴즈**는 나라별 차이가 없는 글자만 출제합니다.
- 필순 **보기·따라 쓰기**는 나머지 글자도 보여 주는데, 王 生 主 里 重 出 北 長 母 男 처럼 나라마다 순서가 다른 글자는 교재와 대조가 필요합니다. 다르면 `stroke-order.txt` 에 한 줄 추가하면 됩니다.

## 출처와 라이선스

- 획 데이터: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) / hanzi-writer-data (Arphic Public License)
- 획순 애니메이션: [Hanzi Writer](https://hanziwriter.org) (MIT)
- 한자 글꼴: Noto Serif KR (SIL Open Font License 1.1)
