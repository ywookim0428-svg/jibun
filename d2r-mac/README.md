# 맥에서 디아블로2 레저렉션 (무료)

CrossOver 없이 무료로 D2R을 실행합니다.
- Wine: Sikarugir가 배포하는 CrossOver 24 소스 기반 엔진 (GPTK의 Wine 7.7은 현재 Battle.net이 동작하지 않음)
- DirectX 12: Game Porting Toolkit의 D3DMetal

## 필요 조건
- Apple Silicon 맥 (M1 이상)
- macOS 14 Sonoma 이상
- Rosetta 2
- 여유 공간 약 40GB (게임 포함)

## 설치
터미널을 열고 아래를 붙여 넣습니다.

```bash
git clone https://github.com/ywookim0428-svg/jibun.git ~/jibun
bash ~/jibun/d2r-mac/setup-d2r.sh
```

스크립트가 하는 일:
1. Homebrew가 없으면 설치합니다.
2. `gcenx/wine/game-porting-toolkit`을 설치합니다 (D3DMetal을 가져오는 용도).
3. `~/Games/D2R-Engine`에 CrossOver 24 기반 Wine 엔진을 받습니다.
4. `~/Games/D2R`에 Windows 10 환경을 만듭니다.
5. Battle.net을 내려받아 설치합니다. 창이 뜨면 안내대로 진행하세요.
6. 엔진에 D3DMetal을 연결하고, 바탕화면에 **디아블로2 레저렉션** 실행 아이콘을 만듭니다.

이후에는 바탕화면 아이콘을 더블클릭해서 Battle.net에 로그인하고 D2R을 설치하면 됩니다.

## 그 밖의 명령
```bash
bash ~/jibun/d2r-mac/setup-d2r.sh launch     # Battle.net 실행
bash ~/jibun/d2r-mac/setup-d2r.sh winecfg    # Wine 설정
bash ~/jibun/d2r-mac/setup-d2r.sh d3dmetal-off  # Battle.net 화면이 깨질 때 D3DMetal 끄기
bash ~/jibun/d2r-mac/setup-d2r.sh d3dmetal-on   # 다시 켜기 (D2R 실행에는 필요)
bash ~/jibun/d2r-mac/setup-d2r.sh uninstall  # Bottle 삭제
```

## 문제 해결
- **로그 위치**: `~/Games/D2R/d2r-wine.log`
- **Battle.net 창이 하얗거나 비어 있음**: Battle.net을 완전히 끄고(`WINEPREFIX=~/Games/D2R wineserver -k`) 다시 실행하세요.
- **Battle.net 설치 도중 멈춤**: 스크립트를 다시 실행하면 이미 끝난 단계는 건너뜁니다.
- **처음 접속하면 끊김**: 셰이더 캐시가 쌓이는 동안이라 정상입니다. 그래픽 옵션을 낮추면 나아집니다.
- **한글 글자가 네모로 보임**: Wine 설정(`winecfg`)에서 글꼴을 바꾸거나 알려 주세요.

Blizzard가 공식 지원하는 방식은 아닙니다.
