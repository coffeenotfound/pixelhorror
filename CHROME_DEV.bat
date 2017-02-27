@echo off
taskkill /im chrome.exe /f
start /b "" "%programfiles(x86)%\Google\Chrome\Application\chrome.exe" --restore-last-session --allow-file-access-from-files
echo
echo CHROME STARTED WITH DEV FLAGS. DO NOT BROWSE UNTRUSTED SITES UNTIL CHROME IS MANUALLY RESTARTED.