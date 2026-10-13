# Seed admin + rider dev accounts via Supabase REST (no npm install required).
# Run from web/:
#   powershell -ExecutionPolicy Bypass -File scripts/seed-portal-users.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Error "Missing $envFile - add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $k, $v = $_ -split '=', 2
    $vars[$k.Trim()] = $v.Trim().Trim('"').Trim("'")
}

$url = $vars["NEXT_PUBLIC_SUPABASE_URL"]
$key = $vars["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $url -or -not $key) {
    Write-Error "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
}

$adminPw = $vars["SEED_ADMIN_PASSWORD"]
$riderPw = $vars["SEED_RIDER_PASSWORD"]
if (-not $adminPw -or $adminPw.Length -lt 12 -or -not $riderPw -or $riderPw.Length -lt 12) {
    Write-Error "Set SEED_ADMIN_PASSWORD and SEED_RIDER_PASSWORD (12+ characters) in .env.local"
}

$base = $url.TrimEnd("/")
$authHeaders = @{
    apikey         = $key
    Authorization  = "Bearer $key"
    "Content-Type" = "application/json"
}
$restHeaders = @{
    apikey        = $key
    Authorization = "Bearer $key"
    Prefer        = "return=minimal"
    "Content-Type" = "application/json"
}

$users = @(
    @{
        email          = "admin@crispy.com"
        password       = $adminPw
        displayName    = "Platform Admin"
        role           = "admin"
        approvalStatus = "approved"
        metadata       = @{ display_name = "Platform Admin" }
    },
    @{
        email          = "rider@crispy.com"
        password       = $riderPw
        displayName    = "Demo Rider"
        role           = "rider"
        approvalStatus = "approved"
        metadata       = @{ display_name = "Demo Rider"; signup_role = "rider" }
        riderProfile   = @{
            phone         = "09000000001"
            vehicle_type  = "motorcycle"
            vehicle_plate = "DEMO-123"
            fleet_status  = "available"
        }
    }
)

function Find-UserIdByEmail([string]$email) {
    $page = 1
    do {
        $uri = ('{0}/auth/v1/admin/users?page={1}&per_page=200' -f $base, $page)
        $resp = Invoke-RestMethod -Uri $uri -Headers $authHeaders -Method Get
        $hit = $resp.users | Where-Object { $_.email -eq $email }
        if ($hit) { return $hit.id }
        if ($resp.users.Count -lt 200) { return $null }
        $page++
    } while ($true)
}

function Ensure-AuthUser($spec) {
    $email = $spec.email.ToLower()
    $id = Find-UserIdByEmail $email
    $body = @{
        email          = $email
        password       = $spec.password
        email_confirm  = $true
        user_metadata  = $spec.metadata
    } | ConvertTo-Json -Depth 5

    if ($id) {
        $uri = "$base/auth/v1/admin/users/$id"
        Invoke-RestMethod -Uri $uri -Headers $authHeaders -Method Put -Body $body | Out-Null
        Write-Host "Updated auth: $email"
    } else {
        $uri = "$base/auth/v1/admin/users"
        $created = Invoke-RestMethod -Uri $uri -Headers $authHeaders -Method Post -Body $body
        $id = $created.id
        Write-Host "Created auth: $email"
    }
    return $id
}

function Update-Profile($userId, $spec) {
    $body = @{
        display_name    = $spec.displayName
        role            = $spec.role
        approval_status = $spec.approvalStatus
        restaurant_id   = $null
        updated_at      = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json
    $uri = "$base/rest/v1/profiles?id=eq.$userId"
    Invoke-RestMethod -Uri $uri -Headers $restHeaders -Method Patch -Body $body | Out-Null
    Write-Host "  profiles: role=$($spec.role), approval=$($spec.approvalStatus)"
}

function Upsert-RiderProfile($userId, $rp) {
    $body = @{
        user_id       = $userId
        phone         = $rp.phone
        vehicle_type  = $rp.vehicle_type
        vehicle_plate = $rp.vehicle_plate
        fleet_status  = $rp.fleet_status
        updated_at    = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json
    $uri = "$base/rest/v1/rider_profiles?on_conflict=user_id"
    $h = $restHeaders.Clone()
    $h["Prefer"] = "resolution=merge-duplicates,return=minimal"
    Invoke-RestMethod -Uri $uri -Headers $h -Method Post -Body $body | Out-Null
    Write-Host "  rider_profiles upserted"
}

Write-Host "Seeding portal users...`n"
foreach ($spec in $users) {
    $id = Ensure-AuthUser $spec
    Update-Profile $id $spec
    if ($spec.riderProfile) {
        Upsert-RiderProfile $id $spec.riderProfile
    }
    Write-Host ""
}

Write-Host "Done."
Write-Host 'Staff: /admin/login  -> admin@crispy.com (password from SEED_ADMIN_PASSWORD)'
Write-Host 'Rider: /rider/login -> rider@crispy.com (password from SEED_RIDER_PASSWORD)'
