param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [Parameter(Mandatory = $true)][ValidateSet('add', 'remove')][string]$Action,
  [Parameter(Mandatory = $true)][ValidateSet('User', 'Machine', 'Both')][string]$Scope
)

$ErrorActionPreference = 'Stop'

function Update-Scope([string]$ScopeName) {
  $current = [Environment]::GetEnvironmentVariable('Path', $ScopeName)
  $items = @()
  if (-not [string]::IsNullOrWhiteSpace($current)) {
    $items = @($current -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  }

  $dirNorm = [IO.Path]::GetFullPath($Dir).TrimEnd('\')
  $matches = @($items | Where-Object { $_.Trim().Trim('"').TrimEnd('\') -ieq $dirNorm })

  if ($Action -eq 'add' -and $matches.Count -eq 0) {
    $next = if ([string]::IsNullOrWhiteSpace($current)) { $dirNorm } else { $current.TrimEnd(';') + ';' + $dirNorm }
    [Environment]::SetEnvironmentVariable('Path', $next, $ScopeName)
    return
  }

  if ($Action -eq 'remove' -and $matches.Count -gt 0) {
    $next = ($items | Where-Object { $_.Trim().Trim('"').TrimEnd('\') -ine $dirNorm }) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $next, $ScopeName)
  }
}

$scopes = if ($Scope -eq 'Both') { @('User', 'Machine') } else { @($Scope) }
foreach ($name in $scopes) {
  try {
    Update-Scope $name
  } catch {
    Write-Error "Failed to update $name PATH: $($_.Exception.Message)"
    exit 1
  }
}

exit 0
