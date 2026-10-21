#!/bin/bash
# 디아블로2 레저렉션을 Apple Silicon 맥에서 무료로 실행하기 위한 설치/실행 스크립트.
# Wine + D3DMetal(DirectX 12 -> Metal)은 Gcenx가 배포하는 Game Porting Toolkit 빌드를 사용한다.
#
# 사용법:
#   ./setup-d2r.sh            설치 (Homebrew, GPTK, Bottle, Battle.net, 바탕화면 실행 아이콘)
#   ./setup-d2r.sh launch     Battle.net 실행
#   ./setup-d2r.sh winecfg    Wine 설정 창 열기
#   ./setup-d2r.sh uninstall  Bottle과 실행 아이콘 삭제 (GPTK는 남겨 둠)

set -euo pipefail

BOTTLE="${D2R_BOTTLE:-$HOME/Games/D2R-Bottle}"
GPTK_APP="/Applications/Game Porting Toolkit.app"
WINE_BIN="$GPTK_APP/Contents/Resources/wine/bin"
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
    export WINEPREFIX="$BOTTLE"
    export WINEESYNC=1
    export WINEDEBUG="${WINEDEBUG:--all}"
    export PATH="$WINE_BIN:$PATH"
}

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

ensure_brew() {
    if ! command -v brew >/dev/null 2>&1; then
        if [ -x /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            say "Homebrew 설치 (맥 로그인 비밀번호를 물어볼 수 있습니다)"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi
}

ensure_gptk() {
    if [ -x "$WINE_BIN/wine64" ]; then
        say "Game Porting Toolkit 이미 설치됨"
        return
    fi
    ensure_brew
    say "Game Porting Toolkit(Wine + D3DMetal) 설치 - 약 240MB"
    brew tap gcenx/wine
    brew install --cask gcenx/wine/game-porting-toolkit
    [ -x "$WINE_BIN/wine64" ] || die "GPTK 설치 후에도 $WINE_BIN/wine64 가 없습니다."
}

create_bottle() {
    wine_env
    if [ -f "$BOTTLE/system.reg" ]; then
        say "Bottle 이미 있음: $BOTTLE"
    else
        say "Bottle 생성: $BOTTLE (처음엔 1~2분 걸립니다)"
        mkdir -p "$BOTTLE"
        wine64 wineboot --init >>"$LOG" 2>&1
        wineserver -w
    fi
    # Battle.net과 D2R은 Windows 10 이상을 요구한다.
    wine64 winecfg -v win10 >>"$LOG" 2>&1
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
        wine64 reg add 'HKCU\Software\Wine\Fonts\Replacements' /v "$f" /t REG_SZ \
            /d "Apple SD Gothic Neo" /f >>"$LOG" 2>&1
    done
    for f in "Segoe UI" "Tahoma" "Arial" "Microsoft Sans Serif" "MS Shell Dlg" "MS Shell Dlg 2"; do
        wine64 reg add 'HKLM\Software\Microsoft\Windows NT\CurrentVersion\FontLink\SystemLink' /v "$f" \
            /t REG_MULTI_SZ /d "AppleSDGothicNeo.ttc,Apple SD Gothic Neo" /f >>"$LOG" 2>&1
    done
    wineserver -w
    touch "$BOTTLE/.korean-fonts"
}

reset_battlenet_agent() {
    wine_env
    wineserver -k 2>/dev/null || true
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

    # Wine에서는 첫 실행 때 Update Agent가 늦게 떠서 BLZBNTBTS0000005C(1분 응답 없음)가
    # 나기 쉽다. 남은 Agent를 정리하고 몇 번 다시 시도한다.
    local attempt
    for attempt in 1 2 3; do
        say "Battle.net 설치 프로그램 실행 ($attempt/3) - 창이 뜨면 안내대로 진행하세요"
        say "  오류 창(BLZBNTBTS0000005C 등)이 뜨면 그 창을 닫으세요. 자동으로 다시 시도합니다."
        wine64 "$setup" --lang="$BNET_LANG" >>"$LOG" 2>&1 || true
        wineserver -w
        [ -f "$BNET_UNIX" ] && break
        warn "Battle.net 설치가 끝나지 않았습니다. Agent를 정리하고 다시 시도합니다."
        reset_battlenet_agent
    done

    if [ ! -f "$BNET_UNIX" ]; then
        warn "Battle.net 설치에 실패했습니다. 로그: $LOG"
        exit 1
    fi
    rm -f "$setup"
}

make_launcher() {
    say "바탕화면에 실행 아이콘 생성: $LAUNCHER"
    cat >"$LAUNCHER" <<EOF
#!/bin/bash
export WINEPREFIX="$BOTTLE"
export WINEESYNC=1
export WINEDEBUG=-all
export PATH="$WINE_BIN:\$PATH"
nohup wine64 '$BNET_EXE' >>"$LOG" 2>&1 &
echo "Battle.net을 실행했습니다. 이 창은 닫아도 됩니다."
EOF
    chmod +x "$LAUNCHER"
}

cmd_install() {
    check_system
    ensure_gptk
    create_bottle
    install_battlenet
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
    wine64 "$BNET_EXE" >>"$LOG" 2>&1 &
    say "Battle.net 실행 중 (로그: $LOG)"
}

cmd_winecfg() {
    wine_env
    wine64 winecfg
}

cmd_uninstall() {
    printf '%s 와 바탕화면 실행 아이콘을 삭제합니다. 설치한 게임도 함께 지워집니다. 계속할까요? [y/N] ' "$BOTTLE"
    read -r answer
    [ "$answer" = "y" ] || [ "$answer" = "Y" ] || { echo "취소했습니다."; exit 0; }
    if [ -x "$WINE_BIN/wineserver" ]; then
        WINEPREFIX="$BOTTLE" "$WINE_BIN/wineserver" -k 2>/dev/null || true
    fi
    rm -rf "$BOTTLE" "$LAUNCHER"
    say "삭제했습니다. GPTK까지 지우려면: brew uninstall --cask game-porting-toolkit"
}

case "${1:-install}" in
    install)   cmd_install ;;
    launch)    cmd_launch ;;
    winecfg)   cmd_winecfg ;;
    uninstall) cmd_uninstall ;;
    *)         die "알 수 없는 명령: $1 (install | launch | winecfg | uninstall)" ;;
esac
