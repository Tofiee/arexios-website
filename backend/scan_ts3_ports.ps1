$target = "185.137.98.127"
$ports = @(10011, 10012, 10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020,
           20011, 20012, 20013, 20014, 20015,
           30033, 30034, 30035,
           45000, 45001, 45002, 45003, 45004, 45005, 45100, 45110, 45120, 45123,
           9987)
$timeout = 500

Write-Host "Scanning TS3 ports on $target..." -ForegroundColor Cyan

foreach ($port in $ports) {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $tcpClient.BeginConnect($target, $port, $null, $null)
    $wait = $asyncResult.AsyncWaitHandle.WaitOne($timeout, $false)
    
    if ($wait -and $tcpClient.Connected) {
        Write-Host "Port $port : OPEN" -ForegroundColor Green
    }
    $tcpClient.Close()
}

Write-Host "Done!"