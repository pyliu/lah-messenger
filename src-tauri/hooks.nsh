!macro NSIS_HOOK_PREINSTALL
  ; 安裝或更新前關閉既有行程，防止檔案鎖定衝突
  nsExec::Exec 'taskkill /IM "lah-messenger.exe" /F'
  nsExec::Exec 'taskkill /IM "桃園地政信差服務即時通.exe" /F'

  ; 清除舊版 Electron 遺留的開機啟動項目
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.桃園地政信差服務即時通"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.Electron"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; 安裝完成後自動啟動即時通主程式
  Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'

  ; 開機自動啟動改由程式內 autostart 外掛寫入 HKCU Run，移除舊版啟動資料夾捷徑以免重複啟動
  Delete "$SMSTARTUP\${PRODUCTNAME}.lnk"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; 卸載時移除開機啟動捷徑
  Delete "$SMSTARTUP\${PRODUCTNAME}.lnk"
!macroend
