$targetExe = "g:\05. GEM GEMINI 2026\04. AI Translator\dist-electron\JAVIS Idio-win32-x64\JAVIS Idio.exe"
$wsh = New-Object -ComObject WScript.Shell

# 1. Desktop shortcut
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$desktopShortcut = $wsh.CreateShortcut("$desktopPath\JAVIS Idio Premium.lnk")
$desktopShortcut.TargetPath = $targetExe
$desktopShortcut.WorkingDirectory = "g:\05. GEM GEMINI 2026\04. AI Translator\dist-electron\JAVIS Idio-win32-x64"
$desktopShortcut.Description = "JAVIS Idio - AI Voice & Live Translator Premium"
$desktopShortcut.Save()

# 2. Start Menu shortcut
$startMenuPrograms = [System.Environment]::GetFolderPath('Programs')
$startShortcut = $wsh.CreateShortcut("$startMenuPrograms\JAVIS Idio Premium.lnk")
$startShortcut.TargetPath = $targetExe
$startShortcut.WorkingDirectory = "g:\05. GEM GEMINI 2026\04. AI Translator\dist-electron\JAVIS Idio-win32-x64"
$startShortcut.Description = "JAVIS Idio - AI Voice & Live Translator Premium"
$startShortcut.Save()

# 3. Create Mobile/Web zip
if (Test-Path "g:\05. GEM GEMINI 2026\04. AI Translator\JAVIS_Idio_Mobile_Build.zip") {
    Remove-Item "g:\05. GEM GEMINI 2026\04. AI Translator\JAVIS_Idio_Mobile_Build.zip" -Force
}
Compress-Archive -Path "g:\05. GEM GEMINI 2026\04. AI Translator\dist\*" -DestinationPath "g:\05. GEM GEMINI 2026\04. AI Translator\JAVIS_Idio_Mobile_Build.zip" -Force

Write-Host "JAVIS Idio Shortcuts and Mobile Zip created successfully!"
