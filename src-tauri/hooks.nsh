!macro NSIS_HOOK_PREINSTALL
  ; 1. 安裝或更新前強制關閉既有行程，防止檔案鎖定衝突
  nsExec::Exec 'taskkill /IM "lah-messenger.exe" /F'
  nsExec::Exec 'taskkill /IM "桃園地政信差服務即時通.exe" /F'

  ; 2. 混合優雅卸載舊版 Electron (lah-messenger)
  ; (a) 優先嘗試自登錄檔讀取舊版卸載指令並靜默執行
  ClearErrors
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\lah-messenger" "UninstallString"
  ${IfNot} ${Errors}
  ${AndIf} $0 != ""
    ExecWait '$0 /S'
  ${EndIf}

  ; (b) 若登錄檔未登記但實體目錄存在卸載執行檔，直接呼叫
  ${If} ${FileExists} "$LOCALAPPDATA\Programs\lah-messenger\Uninstall lah-messenger.exe"
    ExecWait '"$LOCALAPPDATA\Programs\lah-messenger\Uninstall lah-messenger.exe" /S'
  ${EndIf}

  ; (c) 清理舊版主程式殘留目錄 (嚴格僅刪除二進位目錄，保留 Roaming / LocalForage 使用者資料)
  ${If} ${FileExists} "$LOCALAPPDATA\Programs\lah-messenger\*.*"
    RMDir /r "$LOCALAPPDATA\Programs\lah-messenger"
  ${EndIf}

  ; (d) 清除舊版 Uninstall 登錄機碼
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\lah-messenger"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\tw.gov.tyland.messenger"

  ; 3. 清理舊版桌面與開始功能表殘留或失效捷徑
  Delete "$DESKTOP\lah-messenger.lnk"
  Delete "$SMPROGRAMS\lah-messenger.lnk"
  ${If} ${FileExists} "$SMPROGRAMS\lah-messenger\*.*"
    RMDir /r "$SMPROGRAMS\lah-messenger"
  ${EndIf}

  ; 4. 清除舊版 Electron 遺留的開機啟動登錄項與啟動資料夾捷徑
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.桃園地政信差服務即時通"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.Electron"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.lah-messenger"
  Delete "$SMSTARTUP\lah-messenger.lnk"
  Delete "$SMSTARTUP\${PRODUCTNAME}.lnk"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; 安裝完成後自動啟動即時通主程式
  Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'

  ; 開機自動啟動改由程式內 autostart 外掛寫入 HKCU Run，移除舊版啟動資料夾捷徑以免重複啟動
  Delete "$SMSTARTUP\lah-messenger.lnk"
  Delete "$SMSTARTUP\${PRODUCTNAME}.lnk"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; 卸載時移除開機啟動捷徑與舊版遺留項目
  Delete "$SMSTARTUP\lah-messenger.lnk"
  Delete "$SMSTARTUP\${PRODUCTNAME}.lnk"
  Delete "$DESKTOP\lah-messenger.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.桃園地政信差服務即時通"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.Electron"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.lah-messenger"
!macroend
