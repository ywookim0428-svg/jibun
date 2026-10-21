#!/bin/bash
# 디아블로2 레저렉션을 Apple Silicon 맥에서 무료로 실행하기 위한 설치/실행 스크립트.
#
# 구성 (모두 Sikarugir 프로젝트의 무료 배포본):
#   - Wine 엔진: CrossOver 24 소스 기반 WineCX 24 (예전 GPTK의 Wine 7.7은 현재 Battle.net이 안 뜸)
#   - 템플릿: 엔진이 쓰는 라이브러리(freetype, libinotify, MoltenVK 등)와
#     이 엔진용 D3DMetal(DirectX 11/12 -> Metal)이 들어 있다.
#
# Battle.net 관련 우회책 대부분은 soju(https://github.com/BCD1210/soju, GPL-3.0)의
# docs/DIAGNOSIS.md 와 scripts/play.sh 에서 검증된 방법을 따른다.
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
BNET_DIR="$BOTTLE/drive_c/Program Files (x86)/Battle.net"
BNET_UNIX="$BNET_DIR/Battle.net Launcher.exe"
# Launcher.exe가 아니라 Battle.net.exe를 직접, CEF가 GPU 프로세스를 따로 띄우지 않게 하는
# 옵션과 함께 실행한다. 그러지 않으면 창이 투명하게 떠서 안 보인다.
BNET_EXE='C:\Program Files (x86)\Battle.net\Battle.net.exe'
BNET_ARGS="--disable-gpu-compositing --from-launcher --in-process-gpu --use-gl=swiftshader"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
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
    export DYLD_FALLBACK_LIBRARY_PATH="$FRAMEWORKS:$ENGINE/lib:/usr/lib"
    # D2R 로더는 AVX를 요구한다. Rosetta는 이 값이 있어야 AVX를 알린다.
    export ROSETTA_ADVERTISE_AVX=1
    # Battle.net CEF 렌더러가 libcef.dll 페이지 보호 상태를 검사하다 죽는 것을 막는다.
    export WINE_SIMULATE_WRITECOPY=1
    export CX_GRAPHICS_BACKEND=d3dmetal
    export CX_ACTIVE_GRAPHICS_BACKEND=d3dmetal
    export CX_APPLEGPTK_LIBD3DSHARED_PATH="$ENGINE/lib/external/libd3dshared.dylib"
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
# x86_64-unix/*.so 는 lib/external/libd3dshared.dylib 를 가리키는 심볼릭 링크여야 한다
# (실제 파일로 복사하면 @loader_path가 어긋나 동작하지 않는다).
d3dmetal_files() {
    (cd "$D3DM_SRC/wine" && find . \( -type f -o -type l \) \( -name '*.dll' -o -name '*.so' \) | sed 's#^\./##')
}

d3dmetal_on() {
    [ -f "$ENGINE/.d3dmetal2" ] && return
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
        rm -f "$ENGINE/lib/wine/$f"
        cp -P "$D3DM_SRC/wine/$f" "$ENGINE/lib/wine/$f"
    done < <(d3dmetal_files)
    rm -f "$ENGINE/.d3dmetal"
    touch "$ENGINE/.d3dmetal2"
}

d3dmetal_off() {
    [ -f "$ENGINE/.d3dmetal2" ] || [ -f "$ENGINE/.d3dmetal" ] || { say "D3DMetal이 이미 꺼져 있습니다."; return; }
    say "D3DMetal 끄기 (엔진 원래 파일로 복원)"
    local f
    while IFS= read -r f; do
        rm -f "$ENGINE/lib/wine/$f"
        if [ -f "$ENGINE/.stock/$f" ]; then
            cp -f "$ENGINE/.stock/$f" "$ENGINE/lib/wine/$f"
        fi
    done < <(d3dmetal_files)
    rm -f "$ENGINE/.d3dmetal" "$ENGINE/.d3dmetal2"
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
    silence_crash_dialogs
}

# Battle.net은 시작할 때 보조 스레드 두 개가 죽는데(무해함) 그때마다 오류 창이 뜬다.
silence_crash_dialogs() {
    wine_env
    [ -f "$BOTTLE/.no-crash-dialogs" ] && return
    wine reg add 'HKCU\Software\Wine\WineDbg' /v ShowCrashDialog /t REG_DWORD /d 0 /f >>"$LOG" 2>&1
    local hive
    for hive in 'HKLM\Software\Microsoft\Windows NT\CurrentVersion\AeDebug' \
                'HKLM\Software\Wow6432Node\Microsoft\Windows NT\CurrentVersion\AeDebug'; do
        wine reg add "$hive" /v Debugger /t REG_SZ /d 'C:\windows\system32\rundll32.exe kernel32.dll,Sleep' /f >>"$LOG" 2>&1
        wine reg add "$hive" /v Auto /t REG_SZ /d 1 /f >>"$LOG" 2>&1
    done
    wineserver -w
    touch "$BOTTLE/.no-crash-dialogs"
}

# Agent는 접속한 Battle.net.exe의 서명을 파일 이름만으로 확인하는데, Wine에서 Agent의
# 작업 폴더는 버전 하위 폴더(Battle.net.NNNNN)라 파일을 못 찾아 연결을 거부한다
# (BLZBNTBNA00000005). 그 하위 폴더마다 서명된 Battle.net.exe 사본을 둔다.
sync_battlenet_exe() {
    [ -f "$BNET_DIR/Battle.net.exe" ] || return 0
    local v
    for v in "$BNET_DIR"/Battle.net.[0-9]*; do
        [ -d "$v" ] && cp -f "$BNET_DIR/Battle.net.exe" "$v/Battle.net.exe"
    done
    return 0
}

check_d2r_macos() {
    local v major minor
    v="$(sw_vers -productVersion)"
    major="$(echo "$v" | cut -d. -f1)"
    minor="$(echo "$v" | cut -d. -f2)"
    if [ "$major" -lt 26 ] || { [ "$major" -eq 26 ] && [ "${minor:-0}" -lt 4 ]; }; then
        warn "D2R은 macOS 26.4 이상에서만 실행됩니다(Rosetta 수정 필요). 현재: $v"
        warn "시스템 설정 > 일반 > 소프트웨어 업데이트로 macOS를 올려 주세요. Battle.net 자체는 실행됩니다."
    fi
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

save_agent_logs() {
    wine_env
    wineserver -k 2>/dev/null || true
    local logs="$BOTTLE/agent-logs/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$logs"
    find "$BOTTLE/drive_c/ProgramData/Battle.net" -name '*.log' -exec cp {} "$logs/" \; 2>/dev/null || true
}

install_battlenet() {
    wine_env
    if [ -f "$BNET_UNIX" ]; then
        say "Battle.net 이미 설치됨"
        return
    fi
    # 설치 파일은 Windows C: 드라이브 안에 둔다. 맥 폴더(Z: 드라이브)에서 실행하면
    # Update Agent가 호출한 쪽의 서명을 확인하지 못해("Failed Caller authorization due to
    # signature") 설치가 45%에서 멈춘다.
    local dl="$BOTTLE/drive_c/users/Public/Downloads"
    local setup="$dl/Battle.net-Setup.exe"
    local setup_win='C:\users\Public\Downloads\Battle.net-Setup.exe'
    mkdir -p "$dl"
    rm -f "$BOTTLE/Battle.net-Setup.exe"
    say "Battle.net 설치 파일 다운로드"
    curl -fL --retry 3 -o "$setup" "$BNET_URL"

    local attempt
    for attempt in 1 2; do
        say "Battle.net 설치 프로그램 실행 ($attempt/2) - 창이 뜨면 안내대로 진행하세요"
        say "  설치가 끝나고 로그인 창이 뜨면 그 창을 닫으세요."
        (cd "$dl" && wine "$setup_win" --lang="$BNET_LANG") >>"$LOG" 2>&1 || true
        wineserver -w
        [ -f "$BNET_UNIX" ] && break
        warn "Battle.net 설치가 끝나지 않았습니다. 다시 시도합니다."
        save_agent_logs
    done

    if [ ! -f "$BNET_UNIX" ]; then
        warn "Battle.net 설치에 실패했습니다. Agent 오류 요약:"
        grep -hE '^\[(E|F) ' "$BOTTLE"/agent-logs/*/*.log 2>/dev/null | cut -c30- | sort | uniq -c | sort -rn | head -10
        warn "위 내용을 Claude에게 보내 주세요."
        exit 1
    fi
    rm -f "$setup"
}

make_launcher() {
    say "바탕화면에 실행 아이콘 생성: $LAUNCHER"
    cat >"$LAUNCHER" <<EOF
#!/bin/bash
exec /bin/bash "$SELF" launch
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
    sync_battlenet_exe
    make_launcher
    check_d2r_macos
    cat <<EOF

설치가 끝났습니다.
  1. 바탕화면의 "디아블로2 레저렉션" 아이콘을 더블클릭하면 Battle.net이 실행됩니다.
  2. 로그인한 뒤 디아블로 II: 레저렉션을 설치하고 플레이하세요.
  3. 처음 실행할 때는 셰이더를 만드느라 몇 분 동안 끊길 수 있습니다.
문제가 생기면 로그를 확인하세요: $LOG
EOF
}

cmd_launch() {
    [ -f "$BNET_DIR/Battle.net.exe" ] || die "아직 설치되지 않았습니다. 먼저 '$0' 를 실행하세요."
    check_d2r_macos
    d3dmetal_on
    sync_battlenet_exe
    wine_env
    # nohup 같은 macOS 보호 바이너리를 거치면 DYLD_* 환경 변수가 지워지므로 쓰지 않는다.
    # 터미널 창을 닫아도 꺼지지 않도록 HUP 신호만 무시한다.
    # shellcheck disable=SC2086
    ( trap '' HUP; exec wine "$BNET_EXE" $BNET_ARGS ) >>"$LOG" 2>&1 &
    say "Battle.net 실행 중 (로그: $LOG). 창이 뜨기까지 30초쯤 걸릴 수 있습니다."
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
