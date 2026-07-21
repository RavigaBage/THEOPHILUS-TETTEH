$Session = New-Object -ComObject Microsoft.Update.Session
$Searcher = $Session.CreateUpdateSearcher()
$SearchResult = $Searcher.Search("IsInstalled=0 and IsHidden=0")

if ($SearchResult.Updates.Count -eq 0) {
    Write-Output '{"status":"no_updates"}'
    exit 0
}

$UpdatesToDownload = New-Object -ComObject Microsoft.Update.UpdateColl
foreach ($Update in $SearchResult.Updates) {
    $UpdatesToDownload.Add($Update) | Out-Null
}

$Downloader = $Session.CreateUpdateDownloader()
$Downloader.Updates = $UpdatesToDownload
$Downloader.Download() | Out-Null

$UpdatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
foreach ($Update in $SearchResult.Updates) {
    if ($Update.IsDownloaded) {
        $UpdatesToInstall.Add($Update) | Out-Null
    }
}

$Installer = $Session.CreateUpdateInstaller()
$Installer.Updates = $UpdatesToInstall
$InstallResult = $Installer.Install()

$Result = @{
    status         = "installed"
    resultCode     = $InstallResult.ResultCode   # 2=Succeeded, 3=SucceededWithErrors, 4=Failed, 5=Aborted
    rebootRequired = $InstallResult.RebootRequired
    updateCount    = $UpdatesToInstall.Count
}
Write-Output ($Result | ConvertTo-Json -Compress)