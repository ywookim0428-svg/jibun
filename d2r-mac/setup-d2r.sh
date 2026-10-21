#!/bin/bash
# 디아블로2 레저렉션을 Apple Silicon 맥에서 무료로 실행하기 위한 설치/실행 스크립트.
#
# 구성 (모두 Sikarugir 프로젝트의 무료 배포본):
#   - Wine 엔진: CrossOver 24 소스 기반 WineCX 24 (예전 GPTK의 Wine 7.7은 현재 Battle.net이 안 뜸)
#   - 템플릿: 엔진이 쓰는 라이브러리(freetype, libinotify, MoltenVK 등)와
#     이 엔진용 D3DMetal(DirectX 11/12 -> Metal)이 들어 있다.
#
# 사용법:
#   ./setup-d2r.sh               설치 (엔진, Bottle, Battle.net, 바탕화면 실행 아이콘)
#   ./setup-d2r.sh launch        Battle.net 실행
#   ./setup-d2r.sh winecfg       Wine 설정 창 열기
#   ./setup-d2r.sh d3dmetal-off  D3DMetal 끄기 (Battle.net 화면이 깨질 때)
#   ./setup-d2r.sh d3dmetal-on   D3DMetal 다시 켜기 (D2R은 DX12라 켜야 실행됨)
#   ./setup-d2r.sh uninstall     Bottle, 엔진, 실행 아이콘 삭제

set -Eeuo pipefail

GAMES="$HOME/Games"
BOTTLE="${D2R_BOTTLE:-$GAMES/D2R}"
RUNTIME="$GAMES/D2R-Engine"
SK_URL="https://github.com/Sikarugir-App"
ENGINE_NAME="WS12WineCX24.0.7_7"
TEMPLATE_NAME="Template-1.0.24"
ENGINE_URL="$SK_URL/Engines/releases/download/v1.0/$ENGINE_NAME.tar.xz"
TEMPLATE_URL="$SK_URL/Wrapper/releases/download/v1.0/$TEMPLATE_NAME.tar.xz"
CONTENTS="$RUNTIME/$TEMPLATE_NAME.app/Contents"
FRAMEWORKS="$CONTENTS/Frameworks"
# 엔진의 rpath(@loader_path/../../)가 Frameworks 폴더를 가리키도록 그 안에 둔다.
ENGINE="$FRAMEWORKS/wswine.bundle"
WINE_BIN="$ENGINE/bin"
D3DM_SRC="$CONTENTS/SharedSupport/renderer/d3dmetal"
BNET_URL="https://www.battle.net/download/getInstallerForGame?os=win&gameProgram=BATTLENET_APP&version=Live"
# Battle.net 화면 언어. 한글 글꼴이 깨질 때를 대비해 기본은 영어(게임 언어는 따로 한국어로 설정 가능).
BNET_LANG="${D2R_BNET_LANG:-enUS}"
BNET_EXE='C:\Program Files (x86)\Battle.net\Battle.net Launcher.exe'
BNET_UNIX="$BOTTLE/drive_c/Program Files (x86)/Battle.net/Battle.net Launcher.exe"
LAUNCHER="$HOME/Desktop/디아블로2 레저렉션.command"
LOG="$BOTTLE/d2r-wine.log"

say()  { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[주의]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[오류]\033[0m %s\n' "$*" >&2; exit 1; }

wine_env() {
    # macOS 터미널 기본 열린 파일 한도(256)는 Wine에 너무 낮다.
    ulimit -n 10240 2>/dev/null || ulimit -n "$(ulimit -Hn)" 2>/dev/null || true
    export WINEPREFIX="$BOTTLE"
    export WINEMSYNC=1
    export WINEDEBUG="${WINEDEBUG:--all}"
    export PATH="$WINE_BIN:$PATH"
    export DYLD_FALLBACK_LIBRARY_PATH="$FRAMEWORKS:/usr/lib"
}

on_error() {
    printf '\033[1;31m[오류]\033[0m %s번째 줄에서 실패했습니다.\n' "$1" >&2
    if [ -f "$LOG" ]; then
        echo "---- 로그 마지막 부분 ($LOG) ----" >&2
        tail -n 25 "$LOG" >&2
        echo "---- 위 내용을 Claude에게 보내 주세요 ----" >&2
    fi
}
trap 'on_error $LINENO' ERR

check_system() {
    [ "$(uname -s)" = "Darwin" ] || die "맥(macOS)에서 실행해야 합니다."

    # 터미널이 Rosetta로 실행 중이어도 실제 칩을 확인한다.
    if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" != "1" ]; then
        die "Apple Silicon(M1 이상) 맥이 아닙니다. Intel 맥은 Boot Camp를 쓰는 게 낫습니다."
    fi

    local major
    major="$(sw_vers -productVersion | cut -d. -f1)"
    [ "$major" -ge 14 ] || die "macOS 14(Sonoma) 이상이 필요합니다. 현재: $(sw_vers -productVersion)"

    if ! arch -x86_64 /usr/bin/true 2>/dev/null; then
        die "Rosetta 2가 동작하지 않습니다: softwareupdate --install-rosetta --agree-to-license"
    fi
}

fetch() {
    # fetch <url> <대상 폴더>
    local tmp="$RUNTIME/download.tar.xz"
    curl -fL --retry 3 -o "$tmp" "$1"
    tar -xJf "$tmp" -C "$2"
    rm -f "$tmp"
}

ensure_engine() {
    if [ -x "$WINE_BIN/wine" ] && [ -f "$FRAMEWORKS/libinotify.0.dylib" ]; then
        say "Wine 엔진 이미 준비됨: $(cat "$ENGINE/version" 2>/dev/null)"
        return
    fi
    rm -rf "$RUNTIME"
    mkdir -p "$RUNTIME"
    say "Sikarugir 템플릿(라이브러리 + D3DMetal) 다운로드 - 약 100MB"
    fetch "$TEMPLATE_URL" "$RUNTIME"
    say "최신 Wine 엔진(CrossOver 24 기반) 다운로드 - 약 170MB"
    fetch "$ENGINE_URL" "$FRAMEWORKS"
    xattr -dr com.apple.quarantine "$RUNTIME" 2>/dev/null || true
    [ -x "$WINE_BIN/wine" ] || die "엔진 압축을 풀었지만 $WINE_BIN/wine 이 없습니다."
    [ -f "$FRAMEWORKS/libinotify.0.dylib" ] || die "템플릿에 libinotify가 없습니다."
}

# 템플릿의 D3DMetal을 엔진에 붙인다. 원래 파일은 $ENGINE/.stock 에 보관해 되돌릴 수 있게 한다.
d3dmetal_files() {
    (cd "$D3DM_SRC/wine" && find . -type f \( -name '*.dll' -o -name '*.so' \) | sed 's#^\./##')
}

d3dmetal_on() {
    [ -f "$ENGINE/.d3dmetal" ] && return
    [ -d "$D3DM_SRC/external" ] || die "템플릿에 D3DMetal이 없습니다: $D3DM_SRC"
    say "D3DMetal(DirectX 12 -> Metal)을 엔진에 연결"
    mkdir -p "$ENGINE/lib/external"
    cp -R "$D3DM_SRC/external/." "$ENGINE/lib/external/"
    local f
    while IFS= read -r f; do
        if [ -f "$ENGINE/lib/wine/$f" ] && [ ! -f "$ENGINE/.stock/$f" ]; then
            mkdir -p "$(dirname "$ENGINE/.stock/$f")"
            cp -f "$ENGINE/lib/wine/$f" "$ENGINE/.stock/$f"
        fi
        cp -f "$D3DM_SRC/wine/$f" "$ENGINE/lib/wine/$f"
    done < <(d3dmetal_files)
    touch "$ENGINE/.d3dmetal"
}

d3dmetal_off() {
    [ -f "$ENGINE/.d3dmetal" ] || { say "D3DMetal이 이미 꺼져 있습니다."; return; }
    say "D3DMetal 끄기 (엔진 원래 파일로 복원)"
    local f
    while IFS= read -r f; do
        if [ -f "$ENGINE/.stock/$f" ]; then
            cp -f "$ENGINE/.stock/$f" "$ENGINE/lib/wine/$f"
        else
            rm -f "$ENGINE/lib/wine/$f"
        fi
    done < <(d3dmetal_files)
    rm -f "$ENGINE/.d3dmetal"
}

create_bottle() {
    wine_env
    if [ -f "$BOTTLE/system.reg" ]; then
        say "Bottle 이미 있음: $BOTTLE"
    else
        say "Bottle 생성: $BOTTLE (처음엔 1~2분 걸립니다)"
        mkdir -p "$BOTTLE"
        wine wineboot --init >>"$LOG" 2>&1
        wineserver -w
    fi
    # Battle.net과 D2R은 Windows 10 이상을 요구한다.
    wine winecfg -v win10 >>"$LOG" 2>&1
    wineserver -w
    apply_korean_fonts
}

# Windows 글꼴(맑은 고딕, Segoe UI 등)이 없어 한글이 네모로 보이는 것을 막기 위해
# 맥에 기본으로 있는 Apple SD Gothic Neo로 대체/연결한다.
apply_korean_fonts() {
    wine_env
    [ -f "$BOTTLE/.korean-fonts" ] && return
    say "한글 글꼴 연결 (Apple SD Gothic Neo)"
    local f
    for f in "Malgun Gothic" "Gulim" "Dotum" "Batang"; do
        wine reg add 'HKCU\Software\Wine\Fonts\Replacements' /v "$f" /t REG_SZ \
            /d "Apple SD Gothic Neo" /f >>"$LOG" 2>&1
    done
    for f in "Segoe UI" "Tahoma" "Arial" "Microsoft Sans Serif" "MS Shell Dlg" "MS Shell Dlg 2"; do
        wine reg add 'HKLM\Software\Microsoft\Windows NT\CurrentVersion\FontLink\SystemLink' /v "$f" \
            /t REG_MULTI_SZ /d "AppleSDGothicNeo.ttc,Apple SD Gothic Neo" /f >>"$LOG" 2>&1
    done
    wineserver -w
    touch "$BOTTLE/.korean-fonts"
}

reset_battlenet_agent() {
    wine_env
    wineserver -k 2>/dev/null || true
    # 원인 파악용으로 Agent 로그는 남겨 둔다.
    local logs="$BOTTLE/agent-logs/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$logs"
    find "$BOTTLE/drive_c/ProgramData/Battle.net" -name '*.log' -exec cp {} "$logs/" \; 2>/dev/null || true
    rm -rf "$BOTTLE/drive_c/ProgramData/Battle.net"
}

install_battlenet() {
    wine_env
    if [ -f "$BNET_UNIX" ]; then
        say "Battle.net 이미 설치됨"
        return
    fi
    local setup="$BOTTLE/Battle.net-Setup.exe"
    say "Battle.net 설치 파일 다운로드"
    curl -fL --retry 3 -o "$setup" "$BNET_URL"

    # 첫 실행 때 Update Agent가 늦게 떠서 BLZBNTBTS0000005C(1분 응답 없음)가
    # 날 수 있다. 남은 Agent를 정리하고 몇 번 다시 시도한다.
    local attempt
    for attempt in 1 2 3; do
        say "Battle.net 설치 프로그램 실행 ($attempt/3) - 창이 뜨면 안내대로 진행하세요"
        say "  오류 창(BLZBNTBTS0000005C 등)이 뜨면 그 창을 닫으세요. 자동으로 다시 시도합니다."
        say "  설치가 끝나고 로그인 창이 뜨면 그 창을 닫으세요."
        wine "$setup" --lang="$BNET_LANG" >>"$LOG" 2>&1 || true
        wineserver -w
        [ -f "$BNET_UNIX" ] && break
        warn "Battle.net 설치가 끝나지 않았습니다. Agent를 정리하고 다시 시도합니다."
        reset_battlenet_agent
    done

    if [ ! -f "$BNET_UNIX" ]; then
        warn "Battle.net 설치에 실패했습니다."
        warn "아래 명령 결과를 Claude에게 보내 주세요:"
        echo "  tail -n 30 \"$BOTTLE\"/agent-logs/*/*.log; tail -n 30 \"$LOG\""
        exit 1
    fi
    rm -f "$setup"
}

make_launcher() {
    say "바탕화면에 실행 아이콘 생성: $LAUNCHER"
    cat >"$LAUNCHER" <<EOF
#!/bin/bash
ulimit -n 10240 2>/dev/null || ulimit -n "\$(ulimit -Hn)" 2>/dev/null
export WINEPREFIX="$BOTTLE"
export WINEMSYNC=1
export WINEDEBUG=-all
export PATH="$WINE_BIN:\$PATH"
export DYLD_FALLBACK_LIBRARY_PATH="$FRAMEWORKS:/usr/lib"
nohup wine '$BNET_EXE' >>"$LOG" 2>&1 &
echo "Battle.net을 실행했습니다. 이 창은 닫아도 됩니다."
EOF
    chmod +x "$LAUNCHER"
}

cleanup_old_bottle() {
    # 이전 버전 스크립트(GPTK Wine 7.7)로 만든 Bottle은 더 이상 쓰지 않는다.
    local old="$GAMES/D2R-Bottle"
    if [ -d "$old" ] && [ "$old" != "$BOTTLE" ]; then
        say "이전 버전의 Bottle 정리: $old"
        pkill -f 'Game Porting Toolkit.app/Contents/Resources/wine' 2>/dev/null || true
        rm -rf "$old"
    fi
}

cmd_install() {
    check_system
    cleanup_old_bottle
    ensure_engine
    mkdir -p "$BOTTLE"
    create_bottle
    install_battlenet
    d3dmetal_on
    make_launcher
    cat <<EOF

설치가 끝났습니다.
  1. 바탕화면의 "디아블로2 레저렉션" 아이콘을 더블클릭하면 Battle.net이 실행됩니다.
  2. 로그인한 뒤 디아블로 II: 레저렉션을 설치하고 플레이하세요.
  3. 처음 실행할 때는 셰이더를 만드느라 몇 분 동안 끊길 수 있습니다.
문제가 생기면 로그를 확인하세요: $LOG
EOF
}

cmd_launch() {
    [ -f "$BNET_UNIX" ] || die "아직 설치되지 않았습니다. 먼저 '$0' 를 실행하세요."
    wine_env
    wine "$BNET_EXE" >>"$LOG" 2>&1 &
    say "Battle.net 실행 중 (로그: $LOG)"
}

cmd_winecfg() {
    wine_env
    wine winecfg
}

cmd_uninstall() {
    printf '%s, Wine 엔진, 바탕화면 실행 아이콘을 삭제합니다. 설치한 게임도 함께 지워집니다. 계속할까요? [y/N] ' "$BOTTLE"
    read -r answer
    [ "$answer" = "y" ] || [ "$answer" = "Y" ] || { echo "취소했습니다."; exit 0; }
    if [ -x "$WINE_BIN/wineserver" ]; then
        WINEPREFIX="$BOTTLE" "$WINE_BIN/wineserver" -k 2>/dev/null || true
    fi
    rm -rf "$BOTTLE" "$GAMES/D2R-Engine" "$LAUNCHER"
    say "삭제했습니다."
    if [ -d "/Applications/Game Porting Toolkit.app" ]; then
        say "예전에 설치한 GPTK는 이제 쓰지 않습니다. 지우려면: brew uninstall --cask game-porting-toolkit"
    fi
}

case "${1:-install}" in
    install)   cmd_install ;;
    launch)    cmd_launch ;;
    winecfg)   cmd_winecfg ;;
    uninstall) cmd_uninstall ;;
    d3dmetal-on)  d3dmetal_on ;;
    d3dmetal-off) d3dmetal_off ;;
    *)         die "알 수 없는 명령: $1 (install | launch | winecfg | d3dmetal-on | d3dmetal-off | uninstall)" ;;
esac
