param(
    [string]$Branch = "develop",
    [string]$Version = "0.1.0",
    [ValidateSet("development", "beta", "production")]
    [string]$Environment = "development"
)

$env:BUILD_ENV = $Environment
$env:BUILD_VERSION = $Version

Write-Host "========================================"
Write-Host "  Reminders Windows Build Script"
Write-Host "  Branch: $Branch"
Write-Host "  Version: $Version"
Write-Host "  Environment: $Environment"
Write-Host "========================================"

function Test-CommandExists {
    param([string]$Command)
    $exists = $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
    return $exists
}

function Invoke-Step {
    param(
        [string]$StepName,
        [scriptblock]$Action
    )
    Write-Host "`n[$script:stepCount/$script:totalSteps] $StepName..."
    $script:stepCount++
    & $Action
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed at step: $StepName"
        exit 1
    }
}

$script:stepCount = 1
$script:totalSteps = 5

if (-not (Test-CommandExists "git")) {
    Write-Error "git is not installed. Please install git first."
    exit 1
}

if (-not (Test-CommandExists "npm")) {
    Write-Error "npm is not installed. Please install Node.js first."
    exit 1
}

if (-not (Test-CommandExists "cargo")) {
    Write-Error "cargo is not installed. Please install Rust first."
    exit 1
}

Invoke-Step "Checking out branch" {
    git checkout $Branch
}

Invoke-Step "Installing frontend dependencies" {
    npm install
}

Invoke-Step "Building frontend" {
    npm run build
}

Invoke-Step "Building Tauri Windows EXE" {
    if ($Environment -eq "production") {
        cargo tauri build --target x86_64-pc-windows-msvc
    } else {
        cargo tauri build --target x86_64-pc-windows-msvc --debug
    }
}

$outputDir = "src-tauri/target/x86_64-pc-windows-msvc/release"
if ($Environment -ne "production") {
    $outputDir = "src-tauri/target/x86_64-pc-windows-msvc/debug"
}

Invoke-Step "Verifying build output" {
    if (-not (Test-Path "$outputDir/reminders.exe")) {
        Write-Error "Build output not found: $outputDir/reminders.exe"
        exit 1
    }
}

Write-Host "`n========================================"
Write-Host "  Build completed successfully! 🎉"
Write-Host "  Environment: $Environment"
Write-Host "  Version: $Version"
Write-Host "  Output: $outputDir/"
Write-Host "========================================"