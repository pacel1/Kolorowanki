$ports = @(3000, 4000)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess
        Write-Host "Killing PID $pid on port $port"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Nothing listening on port $port"
    }
}
Write-Host "Done killing processes."
