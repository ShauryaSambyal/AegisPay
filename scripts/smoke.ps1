<#
    End-to-end smoke test for AegisPay Sentinel.

    Starts the stack with `npm run dev` when it is not already running, then
    asserts the real-vs-simulated boundary and the ML proxy:

      * Express health, /api/ml/health, /api/ml/model/info, scoring
      * real OSM merchants appear in the directory with no risk fields
      * real ids are rejected (409) by risk / transaction / simulator routes
      * the syndicate graph contains SIM-* nodes only
      * /api/ml/* returns 502 (not a crash) when the ML service is stopped

    Usage (from the repository root):
        powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1
#>

param(
    [string]$BaseUrl = "http://127.0.0.1:5000",
    [string]$MlUrl = "http://127.0.0.1:8001",
    [int]$StartupTimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"
$script:Failures = 0
$script:Checks = 0

function Assert-That {
    param(
        [string]$Name,
        [bool]$Condition,
        [string]$Detail = ""
    )
    $script:Checks++
    if ($Condition) {
        Write-Host ("PASS  {0}" -f $Name) -ForegroundColor Green
    } else {
        $script:Failures++
        Write-Host ("FAIL  {0} {1}" -f $Name, $Detail) -ForegroundColor Red
    }
}

# HTTP helpers use System.Net.Http so the script behaves the same on Windows
# PowerShell 5.1 and PowerShell 7. 5.1 has no -SkipHttpErrorCheck, which would
# make every 409/422 probe throw and look like an outage.
Add-Type -AssemblyName System.Net.Http
$script:HttpClient = New-Object System.Net.Http.HttpClient
$script:HttpClient.Timeout = [TimeSpan]::FromSeconds(20)

function Invoke-Api {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    $request = New-Object System.Net.Http.HttpRequestMessage
    $request.Method = New-Object System.Net.Http.HttpMethod($Method.ToUpperInvariant())
    $request.RequestUri = New-Object System.Uri($Url)
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 6 -Compress
        $request.Content = New-Object System.Net.Http.StringContent(
            $json, [System.Text.Encoding]::UTF8, "application/json")
    }
    $content = $null
    $status = 0
    try {
        $response = $script:HttpClient.SendAsync($request).GetAwaiter().GetResult()
        $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $status = [int]$response.StatusCode
        $response.Dispose()
    } catch {
        $request.Dispose()
        return [pscustomobject]@{ Status = 0; Body = $null; Error = $_.Exception.Message }
    }
    $request.Dispose()
    $payload = $null
    if ($content) {
        try { $payload = $content | ConvertFrom-Json } catch { $payload = $content }
    }
    return [pscustomobject]@{ Status = $status; Body = $payload; Error = $null }
}

function Wait-ForUrl {
    param([string]$Url, [int]$TimeoutSeconds = 60)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ((Invoke-Api -Url $Url).Status -gt 0) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Host "AegisPay Sentinel smoke test" -ForegroundColor Cyan
Write-Host ("Backend: {0}   ML: {1}" -f $BaseUrl, $MlUrl)

$stackProcess = $null
$backendUp = Wait-ForUrl -Url "$BaseUrl/api/health" -TimeoutSeconds 3
if (-not $backendUp) {
    Write-Host "Starting the stack with 'npm run dev' ..." -ForegroundColor Yellow
    $stackProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" `
        -WorkingDirectory (Resolve-Path (Join-Path $PSScriptRoot "..")) -PassThru -WindowStyle Hidden
    $backendUp = Wait-ForUrl -Url "$BaseUrl/api/health" -TimeoutSeconds $StartupTimeoutSeconds
}
Assert-That "backend answers /api/health" $backendUp

$mlUp = Wait-ForUrl -Url "$MlUrl/health" -TimeoutSeconds 30
Assert-That "ML service answers /health" $mlUp

if (-not $backendUp) {
    Write-Host "Backend is not reachable; skipping the API assertions." -ForegroundColor Red
    if ($stackProcess) { Stop-Process -Id $stackProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

# --- Health -----------------------------------------------------------------
$health = Invoke-Api -Url "$BaseUrl/api/health"
Assert-That "GET /api/health is 200" ($health.Status -eq 200) "status=$($health.Status)"
Assert-That "health reports real merchants with riskFields=false" ($health.Body.dataModel.realMerchants.riskFields -eq $false)

# --- ML proxy ---------------------------------------------------------------
$mlHealth = Invoke-Api -Url "$BaseUrl/api/ml/health"
Assert-That "GET /api/ml/health through the proxy is 200" ($mlHealth.Status -eq 200) "status=$($mlHealth.Status) body=$($mlHealth.Body | ConvertTo-Json -Depth 3 -Compress)"
Assert-That "proxy health reports modelLoaded=true" ($mlHealth.Body.modelLoaded -eq $true)

$modelInfo = Invoke-Api -Url "$BaseUrl/api/ml/model/info"
Assert-That "GET /api/ml/model/info is 200" ($modelInfo.Status -eq 200) "status=$($modelInfo.Status)"
Assert-That "model card is labelled synthetic_evaluation" ($modelInfo.Body.modelCard.evaluation -eq "synthetic_evaluation")
Assert-That "metrics expose a time holdout slice" ($null -ne $modelInfo.Body.metrics.splits.time_holdout)

$datasets = Invoke-Api -Url "$BaseUrl/api/ml/datasets"
Assert-That "GET /api/ml/datasets is 200" ($datasets.Status -eq 200)
Assert-That "datasets endpoint lists access status" ($datasets.Body.datasets.Count -ge 4)

# --- Scoring ----------------------------------------------------------------
$merchantScore = Invoke-Api -Url "$BaseUrl/api/ml/score/merchant" -Method POST -Body @{ merchantId = "SIM-0001" }
Assert-That "POST /api/ml/score/merchant (SIM-0001) is 200" ($merchantScore.Status -eq 200) "status=$($merchantScore.Status)"
Assert-That "merchant score returns a tier" ($merchantScore.Body.tier -like "TIER_*")
Assert-That "merchant score returns reasons" ($merchantScore.Body.reasons.Count -gt 0)

$txnScore = Invoke-Api -Url "$BaseUrl/api/ml/score/transaction" -Method POST -Body @{
    merchantId = "SIM-0003"; amount = 5000; payerId = "PYR-SMOKE-1"; payerCity = "New Delhi"; payerState = "Delhi"
}
Assert-That "POST /api/ml/score/transaction (SIM-0003) is 200" ($txnScore.Status -eq 200) "status=$($txnScore.Status)"
Assert-That "transaction score returns a tier and reasons" ($txnScore.Body.assessment.tier -like "TIER_*" -and $txnScore.Body.assessment.reasons.Count -gt 0)

# --- Real vs simulated boundary --------------------------------------------
$real = Invoke-Api -Url "$BaseUrl/api/merchants?origin=real_osm"
Assert-That "GET /api/merchants?origin=real_osm is 200" ($real.Status -eq 200)
Assert-That "real merchants are all dataOrigin=real_osm" (($real.Body.data | Where-Object { $_.dataOrigin -ne "real_osm" }).Count -eq 0)
Assert-That "no real merchant carries a risk score" (($real.Body.data | Where-Object { $null -ne $_.riskScore }).Count -eq 0)
Assert-That "no real merchant carries a risk tier" (($real.Body.data | Where-Object { $null -ne $_.riskTier }).Count -eq 0)
Assert-That "no real merchant carries metrics" (($real.Body.data | Where-Object { $null -ne $_.metrics }).Count -eq 0)

$realId = $real.Body.data[0].id
if ($realId) {
    $riskOnReal = Invoke-Api -Url "$BaseUrl/api/risk/merchant/$realId"
    Assert-That "GET /api/risk/merchant/$realId returns 409" ($riskOnReal.Status -eq 409) "status=$($riskOnReal.Status)"
    Assert-That "409 uses the standard error envelope" ($riskOnReal.Body.error.code -eq "REAL_MERCHANT_DISPLAY_ONLY")

    $txnOnReal = Invoke-Api -Url "$BaseUrl/api/transactions?merchantId=$realId"
    Assert-That "GET /api/transactions?merchantId=<real> returns 409" ($txnOnReal.Status -eq 409) "status=$($txnOnReal.Status)"

    $simOnReal = Invoke-Api -Url "$BaseUrl/api/simulator/run" -Method POST -Body @{ scenario = "IPL_BETTING_BURST"; merchantId = $realId }
    Assert-That "POST /api/simulator/run with a real merchant returns 409" ($simOnReal.Status -eq 409) "status=$($simOnReal.Status)"

    $mlOnReal = Invoke-Api -Url "$BaseUrl/api/ml/score/merchant" -Method POST -Body @{ merchantId = $realId }
    Assert-That "ML scoring rejects a real merchant" ($mlOnReal.Status -eq 422) "status=$($mlOnReal.Status)"
}

$simulated = Invoke-Api -Url "$BaseUrl/api/merchants?origin=simulated"
Assert-That "simulated merchants are all SIM-*" (($simulated.Body.data | Where-Object { $_.id -notlike "SIM-*" }).Count -eq 0)

$graph = Invoke-Api -Url "$BaseUrl/api/syndicate/graph"
$graphNodes = $graph.Body.data.nodes
$allowedPrefixes = @("SIM-", "CLUSTER-", "HUB-", "INFRA-")
$badNodes = $graphNodes | Where-Object { $node = $_; -not ($allowedPrefixes | Where-Object { $node.id -like "$_*" }) }
Assert-That "syndicate graph contains simulated node ids only" ($badNodes.Count -eq 0)

$transactions = Invoke-Api -Url "$BaseUrl/api/transactions"
Assert-That "transactions reference SIM-* merchants only" (($transactions.Body.data | Where-Object { $_.merchantId -notlike "SIM-*" }).Count -eq 0)

# --- Frontend build output --------------------------------------------------
$distIndex = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "frontend/dist/index.html"
Assert-That "frontend production build exists" (Test-Path $distIndex)

# --- Offline behaviour ------------------------------------------------------
if ($mlUp) {
    Write-Host "Stopping the ML service to verify the 502 path ..." -ForegroundColor Yellow
    $owners = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($ownerPid in $owners) {
        Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2

    $offline = Invoke-Api -Url "$BaseUrl/api/ml/health"
    Assert-That "ML proxy returns 502 when the service is down" ($offline.Status -eq 502) "status=$($offline.Status)"
    Assert-That "502 uses ML_SERVICE_UNAVAILABLE" ($offline.Body.error.code -eq "ML_SERVICE_UNAVAILABLE")
}

if ($stackProcess) {
    Write-Host "Stopping the stack started by this script ..." -ForegroundColor Yellow
    Stop-Process -Id $stackProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host ("Checks: {0}   Failures: {1}" -f $script:Checks, $script:Failures)
if ($script:Failures -gt 0) {
    Write-Host "SMOKE TEST FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "SMOKE TEST PASSED" -ForegroundColor Green
exit 0
