!macro NSIS_HOOK_PREINSTALL
  ; 安裝或更新前關閉既有行程，防止檔案鎖定衝突
  nsExec::Exec 'taskkill /IM "lah-messenger.exe" /F'
  nsExec::Exec 'taskkill /IM "桃園地政信差服務即時通.exe" /F'
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; 安裝完成後自動啟動即時通主程式
  Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'

  ; 在使用者的 Windows 啟動資料夾建立捷徑，實現開機自動啟動
  CreateShortcut "$SMSTARTUP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; 卸載時移除開機啟動捷徑
  Delete "$SMSTARTUP\${PRODUCTNAME}.lnk"
!macroend
