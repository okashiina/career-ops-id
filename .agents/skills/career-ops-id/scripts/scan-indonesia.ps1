[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [switch]$Write,
    [switch]$Verify,
    [ValidateRange(1, 90)]
    [int]$SinceDays = 7
)

function Find-CareerOpsRoot([string]$StartPath) {
    $candidate = [System.IO.DirectoryInfo]::new((Resolve-Path -LiteralPath $StartPath).Path)
    while ($null -ne $candidate) {
        if ((Test-Path -LiteralPath (Join-Path $candidate.FullName 'AGENTS.md')) -and
            (Test-Path -LiteralPath (Join-Path $candidate.FullName 'modes'))) {
            return $candidate.FullName
        }
        $candidate = $candidate.Parent
    }
    return $null
}

$repoRoot = $ProjectRoot
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    $repoRoot = $env:CAREER_OPS_ROOT
}
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    $repoRoot = Find-CareerOpsRoot (Get-Location).Path
}
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    throw 'career-ops checkout not found. Set CAREER_OPS_ROOT, pass -ProjectRoot, or run from inside the checkout.'
}
$repoRoot = (Resolve-Path -LiteralPath $repoRoot).Path
$scanner = Join-Path $repoRoot 'scan.mjs'

if (-not (Test-Path -LiteralPath $scanner)) {
    throw "career-ops scanner not found at $scanner"
}

$scanArgs = @('scan.mjs', '--since', $SinceDays.ToString(), '--json')
if (-not $Write) {
    $scanArgs += '--dry-run'
}
if ($Verify) {
    $scanArgs += '--verify'
}

Push-Location -LiteralPath $repoRoot
try {
    & node @scanArgs
    $primaryExitCode = $LASTEXITCODE

    $glintsArgs = @('glints-scan.mjs', '--since', $SinceDays.ToString())
    if ($Write) {
        $glintsArgs += '--write'
    }
    & node @glintsArgs
    $glintsExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($primaryExitCode -ne 0) {
    Write-Warning "The primary career-ops scan reported one or more provider errors (exit $primaryExitCode). Review its receipt; Glints fallback still ran."
}

if ($primaryExitCode -ne 0) { exit $primaryExitCode }
exit $glintsExitCode


