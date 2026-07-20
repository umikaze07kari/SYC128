param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height,
    [Parameter(Mandatory = $true)][string]$Output,
    [string]$Probe = ""
)

$allowed = ($Width -eq 390 -and $Height -eq 844) -or ($Width -eq 393 -and $Height -eq 873)
if (-not $allowed) { throw "Only 390x844 and 393x873 are supported." }

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$profilePath = Join-Path $projectRoot (".mobile-capture-" + $PID)
$outputPath = if ([IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $projectRoot $Output }
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path -LiteralPath $chrome)) { throw "Chrome was not found at $chrome" }

$port = Get-Random -Minimum 9300 -Maximum 9900
$arguments = @(
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    "--hide-scrollbars",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-default-browser-check",
    "--remote-debugging-port=$port",
    "--user-data-dir=$profilePath",
    "about:blank"
)

$browser = $null
$socket = $null
$nextId = 0

function Invoke-Cdp {
    param([string]$Method, [hashtable]$Params = @{})
    $script:nextId += 1
    $request = @{ id = $script:nextId; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 12
    $bytes = [Text.Encoding]::UTF8.GetBytes($request)
    $segment = [ArraySegment[byte]]::new($bytes)
    [void]$socket.SendAsync($segment, [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

    while ($true) {
        $stream = [IO.MemoryStream]::new()
        do {
            $buffer = New-Object byte[] 1048576
            $receiveSegment = [ArraySegment[byte]]::new($buffer)
            $received = $socket.ReceiveAsync($receiveSegment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
            $stream.Write($buffer, 0, $received.Count)
        } while (-not $received.EndOfMessage)
        $message = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        $stream.Dispose()
        if ($message.id -eq $script:nextId) { return $message }
    }
}

try {
    $browser = Start-Process -FilePath $chrome -ArgumentList $arguments -WindowStyle Hidden -PassThru
    $targets = $null
    for ($attempt = 0; $attempt -lt 50; $attempt += 1) {
        try {
            $targets = Invoke-RestMethod "http://127.0.0.1:$port/json/list"
            if ($targets) { break }
        } catch { Start-Sleep -Milliseconds 100 }
    }
    if (-not $targets) { throw "Chrome DevTools endpoint did not start." }
    $target = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    $socket = [Net.WebSockets.ClientWebSocket]::new()
    [void]$socket.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

    Invoke-Cdp "Emulation.setDeviceMetricsOverride" @{
        width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $true
        screenWidth = $Width; screenHeight = $Height
    } | Out-Null
    Invoke-Cdp "Page.enable" | Out-Null
    Invoke-Cdp "Page.navigate" @{ url = $Url } | Out-Null
    Start-Sleep -Milliseconds 2600
    Invoke-Cdp "Runtime.evaluate" @{ expression = "document.fonts.ready"; awaitPromise = $true } | Out-Null
    if ($Probe) {
        $probeResult = Invoke-Cdp "Runtime.evaluate" @{ expression = $Probe; returnByValue = $true }
        Write-Output ("PROBE: " + $probeResult.result.result.value)
    }
    $capture = Invoke-Cdp "Page.captureScreenshot" @{ format = "png"; fromSurface = $true; captureBeyondViewport = $false }
    [IO.File]::WriteAllBytes($outputPath, [Convert]::FromBase64String($capture.result.data))
    Write-Output $outputPath
}
finally {
    if ($socket -and $socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
        try { Invoke-Cdp "Browser.close" | Out-Null } catch {}
    }
    if ($socket) { $socket.Dispose() }
    if ($browser -and -not $browser.HasExited) {
        if (-not $browser.WaitForExit(3000)) { Stop-Process -Id $browser.Id -Force }
    }
    Start-Sleep -Milliseconds 750
    $resolvedProfile = [IO.Path]::GetFullPath($profilePath)
    if ($resolvedProfile.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedProfile)) {
        for ($cleanupAttempt = 0; $cleanupAttempt -lt 40; $cleanupAttempt += 1) {
            try {
                Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction Stop
                break
            } catch { Start-Sleep -Milliseconds 250 }
        }
    }
}
