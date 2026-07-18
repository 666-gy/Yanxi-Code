!include "LogicLib.nsh"
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "WinMessages.nsh"

!macro RunYanxiPathUpdate ACTION
  nsExec::ExecToLog 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\resources\update-path.ps1" -Dir "$INSTDIR" -Action "${ACTION}" -Scope Both'
  Pop $R9
  System::Call 'User32::SendMessageTimeout(i ${HWND_BROADCAST}, i ${WM_SETTINGCHANGE}, i 0, t "Environment", i 0x0002, i 5000, *i .r0)'
!macroend

!ifndef BUILD_UNINSTALLER
  Var YanxiAddToPathCheckbox
  Var YanxiAddToPathRequested

  !macro customInit
    StrCpy $YanxiAddToPathRequested "1"
    ClearErrors
    ReadRegDWORD $R8 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "AddToPath"
    ${IfNot} ${Errors}
      StrCpy $YanxiAddToPathRequested $R8
    ${EndIf}
  !macroend

  !macro customPageAfterChangeDir
    Page custom YanxiPathPageCreate YanxiPathPageLeave
  !macroend

  Function YanxiPathPageCreate
    !insertmacro MUI_HEADER_TEXT "环境配置" "让终端和工具能够找到 Yanxi Code"
    nsDialogs::Create 1018
    Pop $R8
    ${If} $R8 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 22u "选择是否将 Yanxi Code 安装目录加入 PATH。"
    Pop $R8
    ${NSD_CreateCheckbox} 0 32u 100% 18u "加入 PATH（用户 + 系统，推荐）"
    Pop $YanxiAddToPathCheckbox
    ${If} $YanxiAddToPathRequested == "1"
      ${NSD_Check} $YanxiAddToPathCheckbox
    ${EndIf}
    ${NSD_CreateLabel} 18u 54u 94% 36u "启用后，PowerShell、命令提示符和 Yan Agent 可直接定位 Yanxi Code。将同时写入当前用户 PATH 与系统 PATH（需管理员权限）。"
    Pop $R8

    nsDialogs::Show
  FunctionEnd

  Function YanxiPathPageLeave
    ${NSD_GetState} $YanxiAddToPathCheckbox $R8
    ${If} $R8 == ${BST_CHECKED}
      StrCpy $YanxiAddToPathRequested "1"
    ${Else}
      StrCpy $YanxiAddToPathRequested "0"
    ${EndIf}
  FunctionEnd

  !macro customInstall
    WriteRegDWORD SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "AddToPath" $YanxiAddToPathRequested
    ${If} $YanxiAddToPathRequested == "1"
      !insertmacro RunYanxiPathUpdate "add"
    ${Else}
      !insertmacro RunYanxiPathUpdate "remove"
    ${EndIf}
  !macroend
!else
  !macro customUnInstall
    !insertmacro RunYanxiPathUpdate "remove"
  !macroend
!endif
