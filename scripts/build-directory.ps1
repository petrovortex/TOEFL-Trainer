# Run a build step in its own disposable directory under .work.
function Invoke-InBuildDirectory([scriptblock]$Step) {
  $work = [IO.Path]::GetFullPath((Join-Path (Split-Path $PSScriptRoot -Parent) '.work'))
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  if ((Get-Item -LiteralPath $work).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'The build cache must be a regular directory in the project.'
  }
  $name = 'temp-' + [guid]::NewGuid().ToString('N')
  $scratch = (New-Item -ItemType Directory -Path (Join-Path $work $name)).FullName
  try {
    & $Step $scratch
  } finally {
    $target = Get-Item -LiteralPath $scratch
    if ($target.Parent.FullName -ne $work -or $target.Name -ne $name -or
        ($target.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
      throw "Unexpected temporary build path: $scratch"
    }
    Remove-Item -LiteralPath $target.FullName -Recurse -Force
  }
}
