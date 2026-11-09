param([switch]$SetupOnly)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
. (Join-Path $PSScriptRoot 'build-directory.ps1')
try {
  foreach ($tool in @('curl.exe', 'tar.exe')) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) {
      throw "Windows tool $tool is missing. Install Windows updates or restore this built-in tool, then open the launcher again. Node.js and Python do not need to be installed."
    }
  }
  if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64' -and $env:PROCESSOR_ARCHITEW6432 -ne 'AMD64') {
    throw 'TOEFL Trainer needs an Intel or AMD 64-bit Windows computer.'
  }
  $work = Join-Path $root '.work'
  New-Item -ItemType Directory -Path $work -Force | Out-Null
  # Prevent two first launches from installing into the same directories.
  try {
    $lock = [IO.File]::Open((Join-Path $work 'setup.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
  } catch {
    throw 'Setup is already running. Keep the first TOEFL Trainer window open.'
  }
  try {
    $runtime = Join-Path $work 'node-win'
    if (!(Test-Path -LiteralPath "$runtime/ready-24.22.2") -or !(Test-Path -LiteralPath "$runtime/npm.cmd") -or !(Test-Path -LiteralPath "$runtime/node_modules/npm/bin/npm-cli.js") -or !(Test-Path -LiteralPath "$runtime/node.exe")) {
      Write-Host 'Downloading the tools TOEFL Trainer needs to run...'
      Invoke-InBuildDirectory {
        param($stage)
        $zip = Join-Path $stage 'node.zip'
        curl.exe -fSL --retry 3 -o $zip 'https://nodejs.org/dist/v24.22.2/node-v24.22.2-win-x64.zip'
        if ($LASTEXITCODE -or (Get-FileHash -LiteralPath $zip).Hash -ne 'ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2') { throw 'The runtime download failed verification. Check your internet connection and open the launcher again.' }
        New-Item -ItemType Directory -Force -Path $runtime | Out-Null
        $binary = 'node-v24.22.2-win-x64/node.exe'
        tar.exe -xf $zip -C $stage --strip-components=1 $binary
        if ($LASTEXITCODE) { throw 'Could not unpack the app runtime.' }
        # An older trainer window can be running this exact node.exe.
        if (!(Test-Path "$runtime/node.exe") -or (Get-FileHash "$stage/node.exe").Hash -ne (Get-FileHash "$runtime/node.exe").Hash) {
          Copy-Item -LiteralPath "$stage/node.exe" -Destination $runtime -Force
        }
        tar.exe -xf $zip -C $runtime --strip-components=1 --exclude $binary
        if ($LASTEXITCODE) { throw 'Could not unpack the runtime. Open the launcher again.' }
        Set-Content -LiteralPath "$runtime/ready-24.22.2" -Value 'verified'
      }
    }
    $env:Path = "$runtime;$env:Path"
    if (!(Test-Path "$env:SystemRoot/System32/msvcp140.dll") -or !(Test-Path "$env:SystemRoot/System32/vcruntime140_1.dll")) {
      Write-Host 'Installing the Microsoft runtime for local audio. Windows may ask for permission.'
      Invoke-InBuildDirectory {
        param($stage)
        $installer = Join-Path $stage 'vc_redist.x64.exe'
        curl.exe -fSL --retry 3 -o $installer 'https://aka.ms/vs/17/release/vc_redist.x64.exe'
        if ($LASTEXITCODE) { throw 'Unable to download the Microsoft runtime.' }
        $sig = Get-AuthenticodeSignature -LiteralPath $installer
        if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') { throw 'The Microsoft runtime signature could not be verified.' }
        $p = Start-Process -Wait -PassThru -FilePath $installer -ArgumentList '/install','/passive','/norestart' -WindowStyle Hidden
        if ($p.ExitCode -notin @(0,1638,3010)) { throw 'Microsoft runtime setup did not finish. Open the launcher to try again.' }
      }
    }
    $stamp = Join-Path $work 'dependencies.sha256'
    $hash = (Get-FileHash -LiteralPath 'package-lock.json').Hash
    $install = !(Test-Path -LiteralPath $stamp) -or (Get-Content -LiteralPath $stamp -Raw).Trim() -ne $hash -or !(Test-Path 'node_modules/jose/package.json') -or !(Test-Path 'node_modules/.bin/vite.cmd')
    if ($install) {
      Write-Host 'Installing the app...'
      & "$runtime/npm.cmd" ci --include=dev --no-fund --no-audit --loglevel=error
      if ($LASTEXITCODE) { throw 'The app download did not finish. Check your connection and open the launcher again.' }
      Set-Content -LiteralPath $stamp -Value $hash
    }
    $speechFiles = @('tts/sherpa-onnx-offline-tts.exe','tts/onnxruntime.dll','tts/onnxruntime_providers_shared.dll','asr/whisper-cli.exe','asr/whisper.dll','asr/ggml.dll','asr/ggml-base.dll','asr/ggml-cpu.dll','asr/SDL2.dll','kokoro-en-v0_19/model.onnx','kokoro-en-v0_19/voices.bin','kokoro-en-v0_19/tokens.txt','kokoro-en-v0_19/espeak-ng-data/en_dict','ggml-base.en-q5_1.bin')
    if ($speechFiles | Where-Object { !(Test-Path -LiteralPath (Join-Path "$work/speech" $_)) }) {
      Write-Host 'Downloading the English voices and the offline speech recognizer...'
      & (Join-Path $PSScriptRoot 'speech-tools.ps1')
    }
    $sources = Get-ChildItem src,core -File -Recurse
    $sources += Get-Item -LiteralPath 'index.html','package.json','tsconfig.json'
    $index = Get-Item -LiteralPath 'dist/index.html' -ErrorAction SilentlyContinue
    if ($install -or !$index -or ($sources | Where-Object LastWriteTimeUtc -gt $index.LastWriteTimeUtc)) {
      Write-Host 'Preparing the practice screen...'
      & "$runtime/npm.cmd" run build
      if ($LASTEXITCODE) { throw 'Could not build the practice screen.' }
    }
  } finally {
    $lock.Dispose()
  }
  if (!$SetupOnly) {
    Write-Host 'Keep this window open while you practice. Close it when you finish.'
    & "$runtime/node.exe" server/main.ts --open
    exit $LASTEXITCODE
  }
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
