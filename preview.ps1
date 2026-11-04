param(
  [int]$Port = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$prefix = "http://localhost:$Port/"
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".txt"  = "text/plain; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".ico"  = "image/x-icon"
}

try {
  $listener.Start()
  Write-Host "Local FleetHacker preview: $prefix" -ForegroundColor Cyan
  Write-Host "Press Ctrl+C to stop."
  if (-not $NoBrowser) {
    Start-Process $prefix
  }

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart("/")
      if ([string]::IsNullOrWhiteSpace($relative)) {
        $relative = "index.html"
      }

      $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
      if (-not $candidate.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        throw [UnauthorizedAccessException]::new("Path is outside the site root.")
      }
      if (Test-Path $candidate -PathType Container) {
        $candidate = Join-Path $candidate "index.html"
      }

      if (-not (Test-Path $candidate -PathType Leaf)) {
        $context.Response.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes("404 - File not found")
      } else {
        $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
        $context.Response.ContentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
        $bytes = [IO.File]::ReadAllBytes($candidate)
      }

      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      $context.Response.StatusCode = 500
      $bytes = [Text.Encoding]::UTF8.GetBytes("500 - $($_.Exception.Message)")
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } finally {
      $context.Response.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
