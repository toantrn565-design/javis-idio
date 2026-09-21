$targetExe = "g:\05. GEM GEMINI 2026\04. AI Translator\dist-electron\JAVIS Idio-win32-x64\JAVIS Idio.exe"
$wsh = New-Object -ComObject WScript.Shell

# 1. Desktop shortcut
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$desktopShortcut = $wsh.CreateShortcut("$desktopPath\JAVIS Idio.lnk")
$desktopShortcut.TargetPath = $targetExe
$desktopShortcut.WorkingDirectory = "g:\05. GEM GEMINI 2026\04. AI Translator\dist-electron\JAVIS Idio-win32-x64"
$desktopShortcut.Description = "JAVIS Idio - AI Voice & Live Translator Premium"
$desktopShortcut.Save()

# 2. Start Menu shortcut
$startMenuPrograms = [System.Environment]::GetFolderPath('Programs')
$startShortcut = $wsh.CreateShortcut("$startMenuPrograms\JAVIS Idio.lnk")
$startShortcut.TargetPath = $targetExe
$startShortcut.WorkingDirectory = "g:\05. GEM GEMINI 2026\04. AI Translator\dist-electron\JAVIS Idio-win32-x64"
$startShortcut.Description = "JAVIS Idio - AI Voice & Live Translator Premium"
$startShortcut.Save()

# 3. Launch App directly
Start-Process -FilePath $targetExe

Write-Host "SUCCESS: JAVIS Idio Desktop installed and launched successfully!"
